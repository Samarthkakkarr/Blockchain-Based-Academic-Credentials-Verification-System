import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService, OnChainCredential } from "../blockchain/blockchain.service";
import { IssueCredentialDto } from "./dto/issue-credential.dto";
import { RevokeCredentialDto } from "./dto/revoke-credential.dto";
import { ListCredentialsQueryDto } from "./dto/list-credentials-query.dto";
import { canonicalizeCredential } from "./credential-hash.util";

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService
  ) {}

  /** Generates a unique sequential ID like CRED-2026-000001, retrying on rare races. */
  private async generateCredentialId(year: number): Promise<string> {
    const prefix = `CRED-${year}-`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.credential.count({
        where: { credentialId: { startsWith: prefix } },
      });
      const candidate = `${prefix}${String(count + 1 + attempt).padStart(6, "0")}`;
      const clash = await this.prisma.credential.findUnique({ where: { credentialId: candidate } });
      if (!clash) return candidate;
    }
    throw new ConflictException("Could not generate a unique credential ID. Please retry.");
  }

  async issue(dto: IssueCredentialDto, issuedById: string) {
    const issueDate = new Date(dto.issueDate);
    if (isNaN(issueDate.getTime())) {
      throw new BadRequestException("Invalid issue date.");
    }

    const year = new Date().getFullYear();
    const credentialId = await this.generateCredentialId(year);

    const canonical = canonicalizeCredential({
      credentialId,
      studentName: dto.studentName,
      studentId: dto.studentId,
      universityName: dto.universityName,
      degree: dto.degree,
      course: dto.course,
      department: dto.department,
      graduationYear: dto.graduationYear,
      issueDate: issueDate.toISOString(),
      grade: dto.grade,
    });

    const credentialHash = this.blockchain.computeHash(canonical);

    // 1. Save the full record off-chain first (source of truth for content).
    let credential;
    try {
      credential = await this.prisma.credential.create({
        data: {
          credentialId,
          studentName: dto.studentName,
          studentId: dto.studentId,
          universityName: dto.universityName,
          degree: dto.degree,
          course: dto.course,
          department: dto.department,
          graduationYear: dto.graduationYear,
          issueDate,
          grade: dto.grade,
          credentialHash,
          status: "VALID",
          issuedById,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new ConflictException("A credential with this ID already exists. Please retry.");
      }
      throw err;
    }

    // 2. Anchor the hash on-chain.
    try {
      const chainResult = await this.blockchain.issueCredential(credentialId, credentialHash);
      credential = await this.prisma.credential.update({
        where: { credentialId },
        data: {
          blockchainTxHash: chainResult.txHash,
          blockchainCredentialId: credentialId,
          blockNumber: chainResult.blockNumber,
          contractAddress: chainResult.contractAddress,
          network: chainResult.network,
        },
      });
    } catch (err: any) {
      this.logger.error(`Blockchain anchoring failed for ${credentialId}: ${err.message}`);
      // The DB record exists but isn't anchored yet - surface this clearly
      // rather than silently pretending it succeeded.
      throw new BadRequestException(
        `Credential ${credentialId} was saved to the database, but the blockchain transaction failed: ${err.message}. ` +
          `Ensure the local Hardhat node is running and the contract is deployed, then use "Retry blockchain anchor".`
      );
    }

    return credential;
  }

  async retryAnchor(credentialId: string) {
    const credential = await this.prisma.credential.findUnique({ where: { credentialId } });
    if (!credential) throw new NotFoundException("Credential not found.");
    if (credential.blockchainTxHash) return credential; // already anchored

    const chainResult = await this.blockchain.issueCredential(credentialId, credential.credentialHash);
    return this.prisma.credential.update({
      where: { credentialId },
      data: {
        blockchainTxHash: chainResult.txHash,
        blockchainCredentialId: credentialId,
        blockNumber: chainResult.blockNumber,
        contractAddress: chainResult.contractAddress,
        network: chainResult.network,
      },
    });
  }

  async list(query: ListCredentialsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { credentialId: { contains: query.search, mode: "insensitive" } },
        { studentName: { contains: query.search, mode: "insensitive" } },
        { studentId: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.credential.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { revocation: true },
      }),
      this.prisma.credential.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getStats() {
    const [total, valid, revoked, recent] = await Promise.all([
      this.prisma.credential.count(),
      this.prisma.credential.count({ where: { status: "VALID" } }),
      this.prisma.credential.count({ where: { status: "REVOKED" } }),
      this.prisma.credential.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    return {
      totalCredentials: total,
      validCredentials: valid,
      revokedCredentials: revoked,
      recentCredentials: recent,
      network: this.blockchain.getNetworkLabel(),
      blockchainConnected: this.blockchain.isReady(),
      contractAddress: this.blockchain.getContractAddress(),
    };
  }

  async findByCredentialId(credentialId: string, includePrivate: boolean) {
    const credential = await this.prisma.credential.findUnique({
      where: { credentialId },
      include: { revocation: true },
    });
    if (!credential) throw new NotFoundException("Credential not found.");
    if (!includePrivate) {
      // Public-facing lookup: keep the sensitive-ish fields but this hook
      // exists so future public endpoints can strip fields if needed.
    }
    return credential;
  }

  /**
   * Core verification logic used by the public verifier.
   * Cross-checks the database record against the on-chain record:
   * - NOT_FOUND if the credential doesn't exist in the database at all.
   * - REVOKED if either the DB or the chain marks it revoked.
   * - VALID only if it exists, is not revoked, AND the recalculated hash
   *   matches what's stored on-chain (tamper detection).
   */
  async verify(credentialId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { credentialId },
      include: { revocation: true },
    });

    if (!credential) {
      return { status: "NOT_FOUND" as const };
    }

    const recalculatedCanonical = canonicalizeCredential({
      credentialId: credential.credentialId,
      studentName: credential.studentName,
      studentId: credential.studentId,
      universityName: credential.universityName,
      degree: credential.degree,
      course: credential.course,
      department: credential.department,
      graduationYear: credential.graduationYear,
      issueDate: credential.issueDate.toISOString(),
      grade: credential.grade,
    });
    const recalculatedHash = this.blockchain.computeHash(recalculatedCanonical);
    const hashMatchesDb = recalculatedHash === credential.credentialHash;

    let onChain: OnChainCredential | null = null;
    let blockchainReachable = true;
    try {
      onChain = await this.blockchain.verifyCredential(credentialId);
    } catch (err) {
      blockchainReachable = false;
      this.logger.warn(`Blockchain unreachable during verification of ${credentialId}`);
    }

    const isRevoked = credential.status === "REVOKED" || !!onChain?.isRevoked;

    if (isRevoked) {
      return {
        status: "REVOKED" as const,
        credentialId: credential.credentialId,
        reason: credential.revocation?.reason ?? onChain?.revocationReason ?? "No reason on record.",
        revokedAt: credential.revocation?.revokedAt ?? null,
        blockchainTxHash: credential.revocation?.blockchainTxHash ?? null,
      };
    }

    const onChainHashMatches = onChain?.exists
      ? onChain.credentialHash.toLowerCase() === credential.credentialHash.toLowerCase()
      : null;

    return {
      status: "VALID" as const,
      credential: {
        credentialId: credential.credentialId,
        studentName: credential.studentName,
        degree: credential.degree,
        universityName: credential.universityName,
        course: credential.course,
        department: credential.department,
        issueDate: credential.issueDate,
        grade: credential.grade,
      },
      blockchainTxHash: credential.blockchainTxHash,
      network: credential.network,
      contractAddress: credential.contractAddress,
      integrity: {
        hashMatchesDatabase: hashMatchesDb,
        blockchainReachable,
        onChainRecordFound: !!onChain?.exists,
        onChainHashMatches,
      },
    };
  }

  async revoke(credentialId: string, dto: RevokeCredentialDto, revokedById: string) {
    const credential = await this.prisma.credential.findUnique({ where: { credentialId } });
    if (!credential) throw new NotFoundException("Credential not found.");
    if (credential.status === "REVOKED") {
      throw new ConflictException("This credential has already been revoked.");
    }

    const chainResult = await this.blockchain.revokeCredential(credentialId, dto.reason);

    const [, revocation] = await this.prisma.$transaction([
      this.prisma.credential.update({
        where: { credentialId },
        data: { status: "REVOKED" },
      }),
      this.prisma.revocation.create({
        data: {
          credentialId,
          reason: dto.reason,
          revokedById,
          blockchainTxHash: chainResult.txHash,
          blockNumber: chainResult.blockNumber,
        },
      }),
    ]);

    return this.prisma.credential.findUnique({
      where: { credentialId },
      include: { revocation: true },
    });
  }
}
