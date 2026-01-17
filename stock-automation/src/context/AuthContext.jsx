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
      if (!supabaseUser) {
        console.log("🔴 No Supabase user");
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      console.log("🟡 Hydrating user:", supabaseUser.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, franchise_id")
        .eq("id", supabaseUser.id)
        .single();

      if (error || !profile) {
        console.error("❌ Profile fetch failed", error);
        setUser(null);
        setRole(null);
      } else {
        setUser({
          ...supabaseUser,
          franchise_id: profile.franchise_id,
        });
        setRole(profile.role);
        console.log("✅ Auth hydrated:", profile);
      }

      setLoading(false);
    };

    // 1️⃣ initial session
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data?.session?.user ?? null);
    });

    // 2️⃣ auth listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("🔁 Auth state changed:", _event);
        hydrate(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* ================= MANUAL LOGIN ================= */
  const login = async (supabaseUser, profile) => {
    console.log("🟢 Manual login:", profile);

    setUser({
      ...supabaseUser,
      franchise_id: profile.franchise_id,
    });
    setRole(profile.role);
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    console.log("🔴 Logging out");
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
