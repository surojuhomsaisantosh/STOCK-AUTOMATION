import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= INIT + LISTENER ================= */
  useEffect(() => {
    console.log("🟢 AuthProvider mounted");

    const hydrate = async (supabaseUser) => {
      // 1. If no user is found in the Supabase Auth session
      if (!supabaseUser) {
        console.log("🔴 No Supabase session user");
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      console.log("🟡 Hydrating profile for:", supabaseUser.id);

      // 2. Fetch the profile. 
      // Use .maybeSingle() so it doesn't throw a Postgres error if the profile was deleted.
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, franchise_id")
        .eq("id", supabaseUser.id)
        .maybeSingle(); 

      // 3. Handle cases where the Auth User exists but the Profile row is gone (Deletion case)
      if (error || !profile) {
        if (error) console.error("❌ Profile fetch error:", error.message);
        if (!profile) console.warn("⚠️ Auth user exists but Profile row is missing. (Likely Deleted)");
        
        // If the profile is gone, the user shouldn't be logged in
        setUser(null);
        setRole(null);
      } else {
        // 4. Success: User and Profile are both present
        setUser({
          ...supabaseUser,
          franchise_id: profile.franchise_id,
        });
        setRole(profile.role);
        console.log("✅ Auth fully hydrated:", profile);
      }

      setLoading(false);
    };

    // 1️⃣ Get initial session
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data?.session?.user ?? null);
    });

    // 2️⃣ Listen for auth changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("🔁 Auth state event:", _event);
        hydrate(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* ================= MANUAL LOGIN ================= */
  // Use this if you want to update state immediately after a login call
  const login = async (supabaseUser, profile) => {
    console.log("🟢 Manual state update via login:", profile);

    setUser({
      ...supabaseUser,
      franchise_id: profile.franchise_id,
    });
    setRole(profile.role);
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    console.log("🔴 Logging out from Supabase");
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}