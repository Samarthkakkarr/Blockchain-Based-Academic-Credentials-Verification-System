import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@demo-university.edu");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck size={22} className="text-seal" />
          <span className="font-serif text-lg font-semibold text-ink">Registrar Console</span>
        </div>
        <div className="card p-6">
          <h1 className="mb-1 font-serif text-xl font-semibold text-ink">Admin login</h1>
          <p className="mb-5 text-sm text-ink-muted">Sign in to issue and manage academic credentials.</p>

          {error && (
            <div className="mb-4 rounded-sm border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin@123"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-xs text-ink-muted">
            Demo credentials: <span className="font-mono">admin@demo-university.edu</span> /{" "}
            <span className="font-mono">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
