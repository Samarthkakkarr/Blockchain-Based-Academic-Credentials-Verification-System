import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

export interface OnChainCredential {
  exists: boolean;
  credentialHash: string;
  issuer: string;
  issueTimestamp: number;
  isRevoked: boolean;
  revocationTimestamp: number;
  revocationReason: string;
}

export interface ChainTxResult {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  network: string;
}

/**
 * Wraps all on-chain interaction behind a single service so the rest of the
 * backend never touches ethers.js or private keys directly.
 *
 * The contract ABI + address are loaded from
 * src/blockchain/generated/CredentialRegistry.json, which is written
 * automatically by `blockchain/scripts/deploy.ts`. If CONTRACT_ADDRESS is
 * set in .env it overrides the generated address (useful when pointing at
 * Polygon Amoy).
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;
  private networkLabel = "Unknown";
  private contractAddress = "";
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const rpcUrl = this.config.get<string>("RPC_URL") || "http://127.0.0.1:8545";
      const privateKey = this.config.get<string>("BLOCKCHAIN_PRIVATE_KEY");
      const envAddress = this.config.get<string>("CONTRACT_ADDRESS");
      this.networkLabel = this.config.get<string>("NETWORK_LABEL") || "Hardhat Local";

      if (!privateKey) {
        this.logger.warn("BLOCKCHAIN_PRIVATE_KEY not set - blockchain features disabled.");
        return;
      }

      const candidatePaths = [
        path.join(__dirname, "generated", "CredentialRegistry.json"),
        path.join(process.cwd(), "src", "blockchain", "generated", "CredentialRegistry.json"),
        path.join(process.cwd(), "dist", "blockchain", "generated", "CredentialRegistry.json"),
        path.join(process.cwd(), "..", "blockchain", "deployments", "CredentialRegistry.json"),
      ];
      const generatedPath = candidatePaths.find((p) => fs.existsSync(p));
      let abi: any;
      let deployedAddress = envAddress;

      if (generatedPath) {
        const deployment = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
        abi = deployment.abi;
        if (!deployedAddress) deployedAddress = deployment.address;
      } else {
        this.logger.warn(
          "No generated contract artifact found. Run the deploy script in /blockchain first (npm run deploy:local)."
        );
        return;
      }

      if (!deployedAddress) {
        this.logger.warn("No CONTRACT_ADDRESS configured and no deployment artifact address found.");
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(deployedAddress, abi, this.wallet);
      this.contractAddress = deployedAddress;

      // Verify connectivity without throwing if the node isn't up yet.
      await this.provider.getBlockNumber();
      this.ready = true;
      this.logger.log(`Connected to blockchain (${this.networkLabel}) at ${rpcUrl}, contract ${deployedAddress}`);
    } catch (err: any) {
      this.ready = false;
      this.logger.warn(
        `Blockchain connection not available yet (${err.message}). The app will still run, but issue/revoke/verify chain calls will fail until a node is reachable.`
      );
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getNetworkLabel(): string {
    return this.networkLabel;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  private assertReady() {
    if (!this.ready) {
      throw new InternalServerErrorException(
        "Blockchain network is not reachable. Start the local Hardhat node and deploy the contract, then retry."
      );
    }
  }

  async issueCredential(credentialId: string, credentialHash: string): Promise<ChainTxResult> {
    this.assertReady();
    try {
      const tx = await this.contract.issueCredential(credentialId, credentialHash);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
        network: this.networkLabel,
      };
    } catch (err: any) {
      this.logger.error(`On-chain issueCredential failed: ${err.message}`);
      throw new InternalServerErrorException(
        err.reason || "Blockchain transaction failed while issuing the credential."
      );
    }
  }

  async revokeCredential(credentialId: string, reason: string): Promise<ChainTxResult> {
    this.assertReady();
    try {
      const tx = await this.contract.revokeCredential(credentialId, reason);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
        network: this.networkLabel,
      };
    } catch (err: any) {
      this.logger.error(`On-chain revokeCredential failed: ${err.message}`);
      throw new InternalServerErrorException(
        err.reason || "Blockchain transaction failed while revoking the credential."
      );
    }
  }

  async verifyCredential(credentialId: string): Promise<OnChainCredential> {
    this.assertReady();
    const result = await this.contract.verifyCredential(credentialId);
    return {
      exists: result[0],
      credentialHash: result[1],
      issuer: result[2],
      issueTimestamp: Number(result[3]),
      isRevoked: result[4],
      revocationTimestamp: Number(result[5]),
      revocationReason: result[6],
    };
  }

  computeHash(canonicalString: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
  }
}
