import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShieldCheck, LayoutDashboard, FileStack, PlusCircle, LogOut, ScanLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function PublicNavbar() {
  return (
    <header className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-seal" strokeWidth={2} />
          <span className="font-serif text-lg font-semibold text-ink">Academic Credential Verification</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/verify" className="btn-secondary text-sm">
            <ScanLine size={16} /> Verify credential
          </Link>
          <Link to="/login" className="btn-primary text-sm">
            Admin login
          </Link>
        </nav>
      </div>
    </header>
  );
}

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/credentials", label: "Credentials", icon: FileStack },
  { to: "/admin/credentials/issue", label: "Issue credential", icon: PlusCircle },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-rule bg-white md:block">
          <div className="flex items-center gap-2 border-b border-rule px-5 py-5">
            <ShieldCheck size={20} className="text-seal" />
            <span className="font-serif text-base font-semibold text-ink">Registrar Console</span>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {adminLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-seal-light text-seal-dark" : "text-ink-light hover:bg-ink/5"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-rule p-3">
            <div className="mb-2 px-2 text-xs text-ink-muted">
              Signed in as
              <div className="truncate font-medium text-ink">{admin?.email}</div>
            </div>
            <button onClick={handleLogout} className="btn-secondary w-full text-sm">
              <LogOut size={15} /> Log out
            </button>
          </div>
        </aside>
        <main className="flex-1 px-6 py-6 md:px-10 md:py-8">{children}</main>
      </div>
    </div>
  );
}
