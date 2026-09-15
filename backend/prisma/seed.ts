import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/**
 * Attempts to load the deployed contract's address + ABI (written by
 * blockchain/scripts/deploy.ts) and issue each demo credential on-chain
 * too, so the seeded data is immediately verifiable end-to-end.
 *
 * If no local Hardhat node / deployment is available, this fails silently
 * and the credentials remain DB-only until re-synced (see README ->
 * "Anchoring demo data on-chain").
 */
async function tryGetChainIssuer(): Promise<
  | { issue: (id: string, hash: string) => Promise<{ txHash: string; blockNumber: number }>; network: string; contractAddress: string }
  | null
> {
  try {
    const generatedPath = path.join(__dirname, "../src/blockchain/generated/CredentialRegistry.json");
    if (!fs.existsSync(generatedPath)) return null;

    const deployment = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) return null;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(deployment.address, deployment.abi, wallet);

    // quick connectivity check
    await provider.getBlockNumber();

    return {
      network: deployment.network,
      contractAddress: deployment.address,
      issue: async (id: string, hash: string) => {
        const tx = await contract.issueCredential(id, hash);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
      },
    };
  } catch {
    return null;
  }
}

/**
 * NOTE: This seed script inserts DEMO/FICTIONAL data only, for local
 * development and college viva demonstration. It does not represent any
 * real student.
 *
 * It does NOT talk to the blockchain (to keep `prisma db seed` usable
 * without a running Hardhat node). The blockchainTxHash/blockNumber fields
 * are left null here; use the app's "Issue Credential" flow through the API
 * to create fully on-chain-backed demo records, or run
 * `npm run seed:chain` (see README) after starting Hardhat.
 */

function canonicalize(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}:${data[key]}`)
    .join("|");
}

function hashCredential(data: Record<string, unknown>): string {
  return "0x" + createHash("sha256").update(canonicalize(data)).digest("hex");
}

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@demo-university.edu" },
    update: {},
    create: {
      name: "Registrar Office",
      email: "admin@demo-university.edu",
      passwordHash,
      role: "ADMIN",
    },
  });

  const demoCredentials = [
    {
      credentialId: "CRED-2026-000001",
      studentName: "Rahul Sharma",
      studentId: "STU2026001",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2026,
      issueDate: new Date("2026-06-15"),
      grade: "8.7 CGPA",
      status: "VALID" as const,
    },
    {
      credentialId: "CRED-2026-000002",
      studentName: "Priya Verma",
      studentId: "STU2026002",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2026,
      issueDate: new Date("2026-06-15"),
      grade: "9.1 CGPA",
      status: "VALID" as const,
    },
    {
      credentialId: "CRED-2026-000003",
      studentName: "Ankit Mehta",
      studentId: "STU2026003",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2025,
      issueDate: new Date("2025-06-20"),
      grade: "7.4 CGPA",
      status: "REVOKED" as const,
    },
  ];

  const chainIssuer = await tryGetChainIssuer();
  if (chainIssuer) {
    console.log(`Connected to chain (${chainIssuer.network}) - demo credentials will be anchored on-chain.`);
  } else {
    console.log("No local blockchain connection found - seeding DB only.");
    console.log("Start Hardhat + deploy the contract, then re-run `npm run prisma:seed` to anchor demo data on-chain.");
  }

  for (const c of demoCredentials) {
    const credentialHash = hashCredential({
      credentialId: c.credentialId,
      studentName: c.studentName,
      studentId: c.studentId,
      universityName: c.universityName,
      degree: c.degree,
      course: c.course,
      department: c.department,
      graduationYear: c.graduationYear,
      issueDate: c.issueDate.toISOString(),
      grade: c.grade,
    });

    let blockchainTxHash: string | undefined;
    let blockNumber: number | undefined;
    let contractAddress: string | undefined;
    let network: string | undefined;

    if (chainIssuer) {
      try {
        const result = await chainIssuer.issue(c.credentialId, credentialHash);
        blockchainTxHash = result.txHash;
        blockNumber = result.blockNumber;
        contractAddress = chainIssuer.contractAddress;
        network = chainIssuer.network;
      } catch (err: any) {
        console.warn(`  ! Could not anchor ${c.credentialId} on-chain (maybe already issued): ${err.message?.slice(0, 120)}`);
      }
    }

    const created = await prisma.credential.upsert({
      where: { credentialId: c.credentialId },
      update: {
        blockchainTxHash,
        blockNumber,
        contractAddress,
        network,
        blockchainCredentialId: c.credentialId,
      },
      create: {
        ...c,
        credentialHash,
        issuedById: admin.id,
        blockchainTxHash,
        blockNumber,
        contractAddress,
        network,
        blockchainCredentialId: c.credentialId,
      },
    });

    if (c.status === "REVOKED") {
      let revokeTxHash: string | undefined;
      let revokeBlockNumber: number | undefined;

      if (chainIssuer) {
        try {
          // revocation on-chain uses the same contract instance's signer
          const deployment = JSON.parse(
            fs.readFileSync(
              path.join(__dirname, "../src/blockchain/generated/CredentialRegistry.json"),
              "utf-8"
            )
          );
          const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
          const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY as string, provider);
          const contract = new ethers.Contract(deployment.address, deployment.abi, wallet);
          const tx = await contract.revokeCredential(
            c.credentialId,
            "Academic integrity violation identified after issuance (demo reason)."
          );
          const receipt = await tx.wait();
          revokeTxHash = receipt.hash;
          revokeBlockNumber = receipt.blockNumber;
        } catch (err: any) {
          console.warn(`  ! Could not revoke ${c.credentialId} on-chain: ${err.message?.slice(0, 120)}`);
        }
      }

      await prisma.revocation.upsert({
        where: { credentialId: c.credentialId },
        update: {},
        create: {
          credentialId: created.credentialId,
          reason: "Academic integrity violation identified after issuance (demo reason).",
          revokedById: admin.id,
          blockchainTxHash: revokeTxHash,
          blockNumber: revokeBlockNumber,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo admin login -> email: admin@demo-university.edu / password: Admin@123");
  console.log("Demo credential IDs: CRED-2026-000001 (VALID), CRED-2026-000002 (VALID), CRED-2026-000003 (REVOKED)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
