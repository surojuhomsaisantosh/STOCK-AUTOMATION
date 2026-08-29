import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../frontend_supabase/supabaseClient";
import { FEATURES, isOn, isGloballyOn } from "../utils/featureFlags";

/* ROLE → DEFAULT DASHBOARD MAP (ADMIN MODE ONLY) */
const ROLE_DASHBOARD = {
  stock: "/dashboard/stockmanager",
  franchise: "/dashboard/franchiseowner",
  central: "/dashboard/central",
  staff: "/store", // Staff "dashboard" is the store itself
};

/**
 * Reads BOTH gate layers fresh on every gated navigation.
 *
 * It deliberately does NOT use AuthContext's `profile`: that is a snapshot
 * taken once by hydrate() at login and never refreshed, so the moment Central
 * flips a flag the guard would still see the value from when the owner logged
 * in — the dashboard card would look enabled (it re-fetches on mount) while
 * this guard bounced them back. Same reasoning for the global switches.
 *
 * Only runs for gated routes (`active`), so it costs nothing elsewhere.
 */
const GATE_PENDING = { loading: true, allowed: false };
const GATE_OPEN = { loading: false, allowed: true };

function useFeatureGate(feature, active) {
  const def = feature ? FEATURES[feature] : null;
  const gated = !!def && active;

  // Starts pending; only ever written after an await, so the effect body never
  // calls setState synchronously.
  const [state, setState] = useState(GATE_PENDING);

  useEffect(() => {
    if (!gated) return;

    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!alive) return;
        if (!user) {
          setState({ loading: false, allowed: false });
          return;
        }

        const [profileRes, settingRes] = await Promise.all([
          supabase.from("profiles").select(def.column).eq("id", user.id).maybeSingle(),
          supabase.from("central_settings").select("enabled").eq("key", def.globalKey).maybeSingle(),
        ]);
        if (!alive) return;

        setState({
          loading: false,
          allowed:
            isGloballyOn(settingRes.data?.enabled) &&
            isOn(profileRes.data?.[def.column]),
        });
      } catch (err) {
        console.error("[ProtectedRoute] Feature gate check failed:", err);
        // Fail closed — the dashboard card is the recoverable path.
        if (alive) setState({ loading: false, allowed: false });
      }
    })();

    return () => { alive = false; };
  }, [gated, def]);

  // Ungated routes (and an unknown feature key on a non-franchise role) never
  // touch state — the gate is simply open.
  if (!feature || !active) return GATE_OPEN;
  if (!def) return { loading: false, allowed: false };
  return state;
}

/**
 * @param requiredFeature  key of FEATURES. When set, a FRANCHISE user must have
 *   the feature enabled at BOTH the global and per-franchise layer to reach the
 *   route. Without this the disabled dashboard card is cosmetic — a bookmarked
 *   URL still loads the page. Never put it on a route Central also uses
 *   (e.g. /central/internal-order shares the StockOrder component).
 */
function ProtectedRoute({ children, allowedRoles, storeOnly = false, requiredFeature = null }) {
  const { user, role, loading } = useAuth();

  // Normalize data for consistent checks
  const normalizedRole =
    typeof role === "string" ? role.toLowerCase() : null;

  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => r.toLowerCase())
    : null;

  // Hooks must run unconditionally, before any of the early returns below.
  // The gate only applies to franchise users; Central/Stock reach these same
  // components through their own ungated routes.
  const gate = useFeatureGate(requiredFeature, normalizedRole === "franchise");

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
     4C. FEATURE GATE
     Applies to franchise users only. Central/Stock reach these components
     through their own routes and must never be gated by a franchise flag.
  ========================== */
  if (requiredFeature && normalizedRole === "franchise") {
    // Wait for the live check; deciding early would bounce the user off a
    // route they are actually allowed to open.
    if (gate.loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Loading</p>
          </div>
        </div>
      );
    }

    if (!gate.allowed) {
      const label = FEATURES[requiredFeature]?.label || requiredFeature;
      console.warn(`🚫 Feature Disabled: '${label}' is not enabled for this franchise.`);
      return <Navigate to={ROLE_DASHBOARD.franchise} replace />;
    }
  }

  /* =========================
     5. ACCESS GRANTED
  ========================== */
  return children;
}

export default ProtectedRoute;