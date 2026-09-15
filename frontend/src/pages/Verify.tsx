import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ScanLine, ShieldAlert } from "lucide-react";
import { PublicNavbar } from "../components/Layout";
import { credentialsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { VerificationResult } from "../types";
import { TxDisplay } from "../components/TxDisplay";

export default function Verify() {
  const { credentialId: paramId } = useParams<{ credentialId?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(paramId || "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVerification(id: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await credentialsApi.verify(id);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not reach the verification service."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (paramId) {
      setInput(paramId);
      runVerification(paramId);
    }
  }, [paramId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    navigate(`/verify/${input.trim()}`);
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicNavbar />
      <main className="mx-auto max-w-xl px-6 py-14">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Verify academic credential</h1>
        <p className="mb-6 text-sm text-ink-light">
          Enter a credential ID, or open the link from a QR code, to check its authenticity and status.
        </p>

        <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
          <input
            className="field-input"
            placeholder="CRED-2026-000001"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
            Verify credential
          </button>
        </form>

        {error && (
          <div className="rounded-sm border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {result && <VerificationResultCard result={result} />}
      </main>
    </div>
  );
}

function VerificationResultCard({ result }: { result: VerificationResult }) {
  if (result.status === "NOT_FOUND") {
    return (
      <div className="card border-ink/10 p-6 text-center">
        <XCircle size={32} className="mx-auto mb-3 text-ink-muted" />
        <h2 className="font-serif text-lg font-semibold text-ink">Credential not found</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The provided credential could not be verified. Please check the credential ID and try again.
        </p>
      </div>
    );
  }

  if (result.status === "REVOKED") {
    return (
      <div className="card border-danger/30 bg-danger-light p-6">
        <div className="mb-3 flex items-center gap-2 text-danger">
          <AlertTriangle size={22} />
          <h2 className="font-serif text-lg font-semibold">Credential revoked</h2>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-ink-muted">Credential ID</dt>
            <dd className="font-mono text-ink">{result.credentialId}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Reason</dt>
            <dd className="text-ink">{result.reason}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Revoked on</dt>
            <dd className="text-ink">{result.revokedAt ? new Date(result.revokedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        {result.blockchainTxHash && (
          <div className="mt-4">
            <TxDisplay txHash={result.blockchainTxHash} />
          </div>
        )}
      </div>
    );
  }

  // VALID
  const { credential, integrity } = result;
  const showIntegrityWarning = !integrity.hashMatchesDatabase || (integrity.onChainRecordFound && integrity.onChainHashMatches === false);

  return (
    <div className="card border-seal/30 bg-seal-light p-6">
      <div className="mb-4 flex items-center gap-2 text-seal-dark">
        <CheckCircle2 size={22} />
        <h2 className="font-serif text-lg font-semibold">Credential verified — Valid</h2>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-muted">Student name</dt>
          <dd className="text-ink">{credential.studentName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Credential ID</dt>
          <dd className="font-mono text-ink">{credential.credentialId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Degree</dt>
          <dd className="text-ink">{credential.degree}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">University</dt>
          <dd className="text-ink">{credential.universityName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Course</dt>
          <dd className="text-ink">{credential.course}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Issue date</dt>
          <dd className="text-ink">{new Date(credential.issueDate).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <TxDisplay txHash={result.blockchainTxHash} network={result.network} contractAddress={result.contractAddress} />
      </div>

      {!integrity.blockchainReachable && (
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-amber/30 bg-amber-light px-3 py-2 text-xs text-amber">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          The blockchain node could not be reached during this check, so on-chain confirmation is unavailable
          right now. The result above reflects the database record only.
        </div>
      )}

      {showIntegrityWarning && integrity.blockchainReachable && (
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger-light px-3 py-2 text-xs text-danger">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          The recalculated hash does not match the on-chain record. This credential's data may have been
          altered after issuance.
        </div>
      )}
    </div>
  );
}
