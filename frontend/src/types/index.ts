export type CredentialStatus = "VALID" | "REVOKED";

export interface Revocation {
  id: string;
  credentialId: string;
  reason: string;
  blockchainTxHash: string | null;
  blockNumber: number | null;
  revokedAt: string;
}

export interface Credential {
  id: string;
  credentialId: string;
  studentName: string;
  studentId: string;
  universityName: string;
  degree: string;
  course: string;
  department: string;
  graduationYear: number;
  issueDate: string;
  grade: string;
  credentialHash: string;
  blockchainTxHash: string | null;
  blockchainCredentialId: string | null;
  blockNumber: number | null;
  contractAddress: string | null;
  network: string | null;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  revocation?: Revocation | null;
}

export interface Stats {
  totalCredentials: number;
  validCredentials: number;
  revokedCredentials: number;
  recentCredentials: Credential[];
  network: string;
  blockchainConnected: boolean;
  contractAddress: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type VerificationResult =
  | { status: "NOT_FOUND" }
  | {
      status: "REVOKED";
      credentialId: string;
      reason: string;
      revokedAt: string | null;
      blockchainTxHash: string | null;
    }
  | {
      status: "VALID";
      credential: {
        credentialId: string;
        studentName: string;
        degree: string;
        universityName: string;
        course: string;
        department: string;
        issueDate: string;
        grade: string;
      };
      blockchainTxHash: string | null;
      network: string | null;
      contractAddress: string | null;
      integrity: {
        hashMatchesDatabase: boolean;
        blockchainReachable: boolean;
        onChainRecordFound: boolean;
        onChainHashMatches: boolean | null;
      };
    };
