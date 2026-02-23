import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,
  loading: true,
  login: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    let { data: ownerProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    let finalProfile = null;

    if (ownerProfile) {
      finalProfile = { ...ownerProfile, role: ownerProfile.role || "owner" };
    } else {
      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (staffProfile) {
        const { data: storeInfo } = await supabase
          .from("profiles")
          .select("company, address, city, state, pincode, phone")
          .eq("franchise_id", staffProfile.franchise_id)
          .limit(1)
          .maybeSingle();

        finalProfile = { ...staffProfile, role: "staff", staff_profile_id: staffProfile.id, ...storeInfo };
      }
    }

    if (!finalProfile) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    } else {
      setUser({
        ...supabaseUser,
        franchise_id: finalProfile.franchise_id,
        staff_profile_id: finalProfile.role === "staff" ? (finalProfile.staff_profile_id || finalProfile.id) : null,
        owner_profile_id: finalProfile.role !== "staff" ? finalProfile.id : null,
      });

      setProfile(finalProfile);
      setRole(finalProfile.role);
      setLoading(false);
      return finalProfile;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data?.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        } else if (event === "INITIAL_SESSION") {
          if (session?.user) hydrate(session.user);
        }
      }
    );

    return () => { listener?.subscription?.unsubscribe(); };
  }, []);

  /* ================= EXPLICIT LOGIN FUNCTION ================= */
  const login = async (supabaseUser, profileData, chosenMode) => {
    // 1. Update React State
    setUser({
      ...supabaseUser,
      franchise_id: profileData.franchise_id,
      staff_profile_id: profileData.role === "staff" ? (profileData.staff_profile_id || profileData.id) : null,
      owner_profile_id: profileData.role !== "staff" ? profileData.id : null,
    });
    setProfile(profileData);
    setRole(profileData.role);

    // 2. Record the physical login to the DB
    try {
      const isStaff = profileData.role === "staff";

      // HARD OVERRIDE: If staff, it is physically impossible to be ADMIN mode.
      const finalMode = isStaff ? "STORE" : chosenMode.toUpperCase();

      const staffProfId = isStaff ? (profileData.staff_profile_id || profileData.id) : null;
      const ownerProfId = !isStaff ? profileData.id : null;

      // Close any stuck sessions first
      const { data: activeSessions } = await supabase
        .from('login_logs')
        .select('id')
        .eq('staff_id', supabaseUser.id)
        .is('logout_at', null);

      if (activeSessions && activeSessions.length > 0) {
        const idsToClose = activeSessions.map(s => s.id);
        await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).in('id', idsToClose);
      }

      // Insert the perfect record
      await supabase.from('login_logs').insert([{
        staff_id: supabaseUser.id,
        staff_profile_id: staffProfId,     // Fixed the null issue!
        owner_profile_id: ownerProfId,
        franchise_id: profileData.franchise_id,
        login_mode: finalMode              // Guaranteed accurate mode!
      }]);

    } catch (err) {
      console.error("Login Log Error:", err);
    }
  };

  const logout = async () => {
    try {
      if (user?.id) {
        const { data: activeLog } = await supabase
          .from('login_logs')
          .select('id')
          .eq('staff_id', user.id)
          .is('logout_at', null)
          .order('login_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeLog) {
          await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).eq('id', activeLog.id);
        }
      }
    } catch (err) {
      console.error("Logout Logic Error:", err);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await supabase.auth.signOut();

    setUser(null);
    setRole(null);
    setProfile(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}