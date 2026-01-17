import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ROLE → DEFAULT DASHBOARD MAP (ADMIN MODE ONLY) */
const ROLE_DASHBOARD = {
  stock: "/dashboard/stockmanager",
  franchise: "/dashboard/franchiseowner",
  central: "/dashboard/central",
};

function ProtectedRoute({ children, allowedRoles, storeOnly = false }) {
  const { user, role, loading } = useAuth();

  const normalizedRole =
    typeof role === "string" ? role.toLowerCase() : null;

  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => r.toLowerCase())
    : null;

  /* =========================
     LOADING STATE
  ========================== */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <p style={{ color: "#555", fontWeight: 500 }}>Loading...</p>
      </div>
    );
  }

  /* =========================
     NOT LOGGED IN
  ========================== */
  if (!user) {
    console.log("🔴 ProtectedRoute: no user, redirecting to login");
    return <Navigate to="/" replace />;
  }

  /* =========================
     STORE MODE RULES
     (Franchise + Central allowed)
  ========================== */
  if (storeOnly) {
    if (!["franchise", "central"].includes(normalizedRole)) {
      console.log(
        "🔴 ProtectedRoute: store blocked for role:",
        normalizedRole
      );
      return <Navigate to="/" replace />;
    }

    return children;
  }

  /* =========================
     ADMIN MODE RULES
  ========================== */
  if (!normalizedRole || !ROLE_DASHBOARD[normalizedRole]) {
    console.log("🔴 ProtectedRoute: invalid role:", normalizedRole);
    return <Navigate to="/" replace />;
  }

  // Role-based restriction
  if (
    normalizedAllowedRoles &&
    !normalizedAllowedRoles.includes(normalizedRole)
  ) {
    console.log(
      "🔴 ProtectedRoute: role not allowed, redirecting to dashboard",
      normalizedRole
    );
    return <Navigate to={ROLE_DASHBOARD[normalizedRole]} replace />;
  }

  return children;
}

export default ProtectedRoute;
