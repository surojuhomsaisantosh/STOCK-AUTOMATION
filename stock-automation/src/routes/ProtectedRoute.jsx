import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ROLE → DEFAULT DASHBOARD MAP (ADMIN MODE ONLY) */
const ROLE_DASHBOARD = {
  stock: "/dashboard/stockmanager",
  franchise: "/dashboard/franchiseowner",
  central: "/dashboard/central",
  staff: "/store", // Staff "dashboard" is the store itself
};

function ProtectedRoute({ children, allowedRoles, storeOnly = false }) {
  const { user, role, loading } = useAuth();

  // Normalize data for consistent checks
  const normalizedRole =
    typeof role === "string" ? role.toLowerCase() : null;

  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => r.toLowerCase())
    : null;

  /* =========================
     1. LOADING STATE
  ========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Authenticating</p>
        </div>
      </div>
    );
  }

  /* =========================
     2. AUTHENTICATION CHECK
  ========================== */
  if (!user) {
    console.warn("🔐 Access Denied: No active session. Redirecting to Login.");
    return <Navigate to="/" replace />;
  }

  /* =========================
     3. STORE MODE RULES
     (Franchise + Central + Staff allowed)
  ========================== */
  if (storeOnly) {
    // Added 'staff' to the authorized list for the store
    const isAuthorizedForStore = ["franchise", "central", "staff"].includes(normalizedRole);
    
    if (!isAuthorizedForStore) {
      console.error(`🚫 Store Access Denied: Role '${normalizedRole}' is not permitted.`);
      return <Navigate to="/" replace />;
    }

    return children;
  }

  /* =========================
     4. ADMIN MODE / DASHBOARD RULES
  ========================== */
  
  // A: Validate if the user has a recognized role
  if (!normalizedRole || !ROLE_DASHBOARD[normalizedRole]) {
    console.error(`🚫 Invalid Role: '${normalizedRole}' does not exist in registry.`);
    return <Navigate to="/" replace />;
  }

  // B: Check if the current user's role is allowed for this specific route
  if (
    normalizedAllowedRoles &&
    !normalizedAllowedRoles.includes(normalizedRole)
  ) {
    console.warn(
      `⚠️ Unauthorized: Role '${normalizedRole}' attempted to access a restricted route. Redirecting to their dashboard.`
    );
    
    // If a staff member tries to access an admin route, send them to /store
    // Otherwise, send admin users to their respective dashboards
    const redirectPath = normalizedRole === "staff" ? "/store" : ROLE_DASHBOARD[normalizedRole];
    return <Navigate to={redirectPath} replace />;
  }

  /* =========================
     5. ACCESS GRANTED
  ========================== */
  return children;
}

export default ProtectedRoute;