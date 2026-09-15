import { FormEvent, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "../components/Layout";
import { credentialsApi, IssueCredentialPayload } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Credential } from "../types";
import { TxDisplay } from "../components/TxDisplay";
import { QrCodeCard } from "../components/QrCodeCard";
import { StatusBadge } from "../components/StatusBadge";

const emptyForm: IssueCredentialPayload = {
  studentName: "",
  studentId: "",
  universityName: "Demo University",
  degree: "",
  course: "",
  department: "",
  graduationYear: new Date().getFullYear(),
  issueDate: new Date().toISOString().slice(0, 10),
  grade: "",
};

export default function IssueCredential() {
  const [form, setForm] = useState<IssueCredentialPayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Credential | null>(null);

  function update<K extends keyof IssueCredentialPayload>(key: K, value: IssueCredentialPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await credentialsApi.issue(form);
      setIssued(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not issue the credential."));
    } finally {
      setLoading(false);
    }
  }

  if (issued) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2 text-seal">
            <CheckCircle2 size={22} />
            <h1 className="font-serif text-2xl font-semibold text-ink">Credential issued successfully</h1>
          </div>

          <div className="card mb-6 space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-muted">Credential ID</div>
                <div className="font-mono text-lg text-ink">{issued.credentialId}</div>
              </div>
              <StatusBadge status={issued.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ink-muted">Student</dt>
                <dd className="text-ink">{issued.studentName}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Degree</dt>
                <dd className="text-ink">{issued.degree}</dd>
              </div>
            </dl>
            <TxDisplay
              txHash={issued.blockchainTxHash}
              network={issued.network}
              blockNumber={issued.blockNumber}
              contractAddress={issued.contractAddress}
            />
          </div>

          <div className="mb-6 max-w-xs">
            <QrCodeCard credentialId={issued.credentialId} />
          </div>

          <button
            className="btn-secondary"
            onClick={() => {
              setIssued(null);
              setForm(emptyForm);
            }}
          >
            Issue another credential
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Issue credential</h1>
      <p className="mb-6 text-sm text-ink-muted">
        The credential is hashed, saved to the database, and anchored on-chain in a single step.
      </p>

      {error && (
        <div className="mb-5 max-w-xl rounded-sm border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Student name">
            <input required className="field-input" value={form.studentName} onChange={(e) => update("studentName", e.target.value)} />
          </Field>
          <Field label="Student ID">
            <input required className="field-input" value={form.studentId} onChange={(e) => update("studentId", e.target.value)} />
          </Field>
        </div>

        <Field label="University name">
          <input required className="field-input" value={form.universityName} onChange={(e) => update("universityName", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Degree">
            <input required className="field-input" placeholder="Bachelor of Computer Applications" value={form.degree} onChange={(e) => update("degree", e.target.value)} />
          </Field>
          <Field label="Course">
            <input required className="field-input" placeholder="Computer Applications" value={form.course} onChange={(e) => update("course", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <input required className="field-input" value={form.department} onChange={(e) => update("department", e.target.value)} />
          </Field>
          <Field label="Graduation year">
            <input
              required
              type="number"
              min={2000}
              max={2100}
              className="field-input"
              value={form.graduationYear}
              onChange={(e) => update("graduationYear", Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue date">
            <input required type="date" className="field-input" value={form.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
          </Field>
          <Field label="Grade / CGPA">
            <input required className="field-input" placeholder="8.7 CGPA" value={form.grade} onChange={(e) => update("grade", e.target.value)} />
          </Field>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Issuing on blockchain..." : "Issue credential"}
        </button>
      </form>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
