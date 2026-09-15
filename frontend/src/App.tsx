import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import CredentialsList from "./pages/CredentialsList";
import IssueCredential from "./pages/IssueCredential";
import CredentialDetail from "./pages/CredentialDetail";
import Verify from "./pages/Verify";
import StudentCredential from "./pages/StudentCredential";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/credentials"
        element={
          <ProtectedRoute>
            <CredentialsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/credentials/issue"
        element={
          <ProtectedRoute>
            <IssueCredential />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/credentials/:credentialId"
        element={
          <ProtectedRoute>
            <CredentialDetail />
          </ProtectedRoute>
        }
      />
      {/* Revocation happens inline on the detail page; this route lands on the same view. */}
      <Route
        path="/admin/credentials/:credentialId/revoke"
        element={
          <ProtectedRoute>
            <CredentialDetail />
          </ProtectedRoute>
        }
      />

      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:credentialId" element={<Verify />} />
      <Route path="/credential/:credentialId" element={<StudentCredential />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
