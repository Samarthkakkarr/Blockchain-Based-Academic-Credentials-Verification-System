import { Link } from "react-router-dom";
import { ScanLine, ShieldCheck, Hash, Link2, QrCode } from "lucide-react";
import { PublicNavbar } from "../components/Layout";

const steps = [
  { icon: ShieldCheck, label: "Issue", desc: "Registrar records the credential" },
  { icon: Hash, label: "Hash", desc: "SHA-256 fingerprint is generated" },
  { icon: Link2, label: "Blockchain", desc: "Hash is anchored on-chain" },
  { icon: QrCode, label: "QR", desc: "A verification code is issued" },
  { icon: ScanLine, label: "Verify", desc: "Anyone can check its status" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
          Academic Credential Verification
        </h1>
        <p className="mt-3 max-w-xl text-base text-ink-light">
          Verify academic credentials securely using blockchain technology. Every credential issued
          through this system is hashed and anchored on-chain, so its authenticity and revocation
          status can be checked independently by anyone.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/verify" className="btn-primary">
            <ScanLine size={16} /> Verify a credential
          </Link>
          <Link to="/login" className="btn-secondary">
            Admin login
          </Link>
        </div>

        <div className="mt-14 border-t border-rule pt-10">
          <h2 className="mb-5 font-serif text-lg font-semibold text-ink">How it works</h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            {steps.map(({ icon: Icon, label, desc }, i) => (
              <li key={label} className="card flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2 text-seal">
                  <Icon size={18} />
                  <span className="text-xs font-mono text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="text-sm font-medium text-ink">{label}</div>
                <div className="text-xs leading-snug text-ink-muted">{desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
