import { Test } from "@nestjs/testing";
import { CredentialsService } from "./credentials.service";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService } from "../blockchain/blockchain.service";

describe("CredentialsService.verify", () => {
  let service: CredentialsService;
  let prisma: any;
  let blockchain: any;

  const baseCredential = {
    credentialId: "CRED-2026-000001",
    studentName: "Rahul Sharma",
    studentId: "STU2026001",
    universityName: "Demo University",
    degree: "BCA",
    course: "Computer Applications",
    department: "Computer Science",
    graduationYear: 2026,
    issueDate: new Date("2026-06-15T00:00:00.000Z"),
    grade: "8.7 CGPA",
    status: "VALID",
    blockchainTxHash: "0xabc123",
    network: "Hardhat Local",
    contractAddress: "0xContract",
    revocation: null,
  };

  beforeEach(async () => {
    prisma = { credential: { findUnique: jest.fn() } };
    blockchain = {
      computeHash: jest.fn().mockReturnValue("0xhash"),
      verifyCredential: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = moduleRef.get(CredentialsService);
  });

  it("returns NOT_FOUND when the credential does not exist in the database", async () => {
    prisma.credential.findUnique.mockResolvedValue(null);
    const result = await service.verify("CRED-2026-999999");
    expect(result.status).toBe("NOT_FOUND");
  });

  it("returns REVOKED with reason and date when the credential is revoked", async () => {
    prisma.credential.findUnique.mockResolvedValue({
      ...baseCredential,
      status: "REVOKED",
      credentialHash: "0xhash",
      revocation: { reason: "Academic misconduct", revokedAt: new Date("2026-07-01"), blockchainTxHash: "0xrevoke" },
    });
    blockchain.verifyCredential.mockResolvedValue({
      exists: true,
      credentialHash: "0xhash",
      isRevoked: true,
      revocationReason: "Academic misconduct",
    });

    const result: any = await service.verify("CRED-2026-000001");
    expect(result.status).toBe("REVOKED");
    expect(result.reason).toBe("Academic misconduct");
  });

  it("returns VALID when the credential exists, is not revoked, and hash matches", async () => {
    prisma.credential.findUnique.mockResolvedValue({ ...baseCredential, credentialHash: "0xhash" });
    blockchain.verifyCredential.mockResolvedValue({
      exists: true,
      credentialHash: "0xhash",
      isRevoked: false,
      revocationReason: "",
    });

    const result: any = await service.verify("CRED-2026-000001");
    expect(result.status).toBe("VALID");
    expect(result.credential.studentName).toBe("Rahul Sharma");
    expect(result.integrity.hashMatchesDatabase).toBe(true);
  });
});
