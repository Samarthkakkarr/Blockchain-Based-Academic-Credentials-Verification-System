import { api } from "./api";
import { Admin, Credential, Stats, VerificationResult } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; admin: Admin }>("/auth/login", { email, password }),
  me: () => api.get<Admin>("/auth/me"),
};

export interface IssueCredentialPayload {
  studentName: string;
  studentId: string;
  universityName: string;
  degree: string;
  course: string;
  department: string;
  graduationYear: number;
  issueDate: string;
  grade: string;
}

export const credentialsApi = {
  issue: (payload: IssueCredentialPayload) => api.post<Credential>("/credentials", payload),

  list: (params: { search?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: Credential[]; total: number; page: number; pageSize: number; totalPages: number }>(
      "/credentials",
      { params }
    ),

  stats: () => api.get<Stats>("/credentials/stats"),

  getOne: (credentialId: string) => api.get<Credential>(`/credentials/${credentialId}`),

  getPublic: (credentialId: string) => api.get<Credential>(`/credentials/${credentialId}/public`),

  verify: (credentialId: string) => api.get<VerificationResult>(`/credentials/${credentialId}/verify`),

  revoke: (credentialId: string, reason: string) =>
    api.post<Credential>(`/credentials/${credentialId}/revoke`, { reason }),

  retryAnchor: (credentialId: string) => api.post<Credential>(`/credentials/${credentialId}/retry-anchor`),
};
