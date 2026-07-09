import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, session, sessionLoading }) {
  if (sessionLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
