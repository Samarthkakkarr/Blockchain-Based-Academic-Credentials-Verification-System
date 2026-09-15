import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ScanLine } from "lucide-react";
import { PublicNavbar } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { QrCodeCard } from "../components/QrCodeCard";
import { credentialsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Credential } from "../types";

export default function StudentCredential() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const navigate = useNavigate();
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!credentialId) return;
    credentialsApi
      .getPublic(credentialId)
      .then((res) => setCredential(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Credential not found.")))
      .finally(() => setLoading(false));
  }, [credentialId]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicNavbar />
      <main className="mx-auto max-w-2xl px-6 py-14">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 size={16} className="animate-spin" /> Loading credential...
          </div>
        )}

        {!loading && (error || !credential) && (
          <div className="rounded-sm border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger">
            {error || "This credential could not be found."}
          </div>
        )}

        {credential && (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-1 font-mono text-xs text-ink-muted">{credential.credentialId}</div>
                <h1 className="font-serif text-2xl font-semibold text-ink">{credential.studentName}</h1>
                <p className="text-sm text-ink-light">{credential.degree}</p>
              </div>
              <StatusBadge status={credential.status} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="card space-y-3 p-5 md:col-span-2">
                <Row label="University" value={credential.universityName} />
                <Row label="Course" value={credential.course} />
                <Row label="Department" value={credential.department} />
                <Row label="Graduation year" value={String(credential.graduationYear)} />
                <Row label="Issue date" value={new Date(credential.issueDate).toLocaleDateString()} />
                <Row label="Grade" value={credential.grade} />
                <button
                  className="btn-primary mt-2 w-full"
                  onClick={() => navigate(`/verify/${credential.credentialId}`)}
                >
                  <ScanLine size={16} /> Verify this credential
                </button>
              </div>
              <QrCodeCard credentialId={credential.credentialId} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-rule pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
