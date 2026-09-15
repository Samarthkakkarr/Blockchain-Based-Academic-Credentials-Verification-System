import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Admin } from "../types";
import { authApi } from "../services/credentials";

interface AuthContextValue {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cc_token");
    const storedAdmin = localStorage.getItem("cc_admin");
    if (token && storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("cc_token", data.accessToken);
    localStorage.setItem("cc_admin", JSON.stringify(data.admin));
    setAdmin(data.admin);
  }

  function logout() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_admin");
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
