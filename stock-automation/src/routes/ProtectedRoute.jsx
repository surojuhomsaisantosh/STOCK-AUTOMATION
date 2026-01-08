import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  // wait until auth is resolved
  if (loading) {
    return null; // or a spinner later
  }

  // not logged in
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // role not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
