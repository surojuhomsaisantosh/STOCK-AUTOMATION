import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ROLE → DASHBOARD MAP */
const ROLE_DASHBOARD = {
  stock: "/dashboard/stockmanager",
  franchise: "/dashboard/franchiseowner",
  central: "/dashboard/central",
};

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  // Normalize role safely
  const normalizedRole = typeof role === "string" ? role.toLowerCase() : null;

  /* LOADING STATE */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-semibold">Loading...</p>
      </div>
    );
  }

  /* NOT LOGGED IN */
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  /* ROLE MISSING OR INVALID */
  if (!normalizedRole || !ROLE_DASHBOARD[normalizedRole]) {
    return <Navigate to="/" replace />;
  }

  /* ROLE NOT ALLOWED */
  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return (
      <Navigate
        to={ROLE_DASHBOARD[normalizedRole]}
        replace
      />
    );
  }

  /* AUTHORIZED */
  return children;
}

export default ProtectedRoute;
