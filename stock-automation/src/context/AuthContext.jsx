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

  /* ================= HYDRATION LOGIC ================= */
  const hydrate = async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return null;
    }

    console.log("🟡 Hydrating profile for:", supabaseUser.id);

    // 1. Check PROFILES (Owner)
    let { data: profile } = await supabase
      .from("profiles")
      .select("role, franchise_id")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    // 2. Check STAFF_PROFILES (Staff)
    if (!profile) {
      console.log("🔍 Not in profiles. Checking staff_profiles...");
      
      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("id, franchise_id")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (staffProfile) {
        profile = {
          role: "staff", 
          franchise_id: staffProfile.franchise_id,
          staff_profile_id: staffProfile.id 
        };
      }
    }

    // 3. Final State Update
    if (!profile) {
      console.warn("⚠️ Profile not found in either table.");
      setUser(null);
      setRole(null);
      setLoading(false);
      return null;
    } else {
      setUser({
        ...supabaseUser,
        franchise_id: profile.franchise_id,
        staff_profile_id: profile.staff_profile_id || null, // Important for logs
      });
      setRole(profile.role);
      setLoading(false);
      console.log("✅ Auth fully hydrated as:", profile.role);
      return profile; 
    }
  };

  /* ================= INIT + LISTENER ================= */
  useEffect(() => {
    console.log("🟢 AuthProvider mounted");

    // Check current session on load
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data?.session?.user ?? null);
    });

    // Listen for changes (Login / Logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔁 Auth state event:", event);
        
        if (event === "SIGNED_IN" && session?.user) {
          // Wait briefly for hydration
          setTimeout(async () => {
            const profile = await hydrate(session.user);
            
            // --- [CRITICAL] AUTOMATIC LOGIN LOGGING ---
            if (profile && profile.role === "staff") {
              await recordLogin(session.user.id, profile);
            }
          }, 500);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setLoading(false);
        } else {
          hydrate(session?.user ?? null);
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* ================= HELPER: RECORD LOGIN (SMART FIX) ================= */
  const recordLogin = async (userId, profile) => {
    try {
      console.log("🔵 Attempting to record login...");

      // 1. Check for ANY existing active sessions (Zombie sessions)
      // If the browser crashed or tab closed without logout, this will be non-empty.
      const { data: activeSessions } = await supabase
        .from('login_logs')
        .select('id')
        .eq('staff_id', userId)
        .is('logout_at', null);

      // 2. If found, AUTO-CLOSE them (This fixes the "Not showing new login" bug)
      if (activeSessions && activeSessions.length > 0) {
        console.log(`⚠️ Found ${activeSessions.length} stuck sessions. Auto-closing them...`);
        
        const idsToClose = activeSessions.map(s => s.id);
        
        // We close the old session so the new one can start clean
        await supabase
          .from('login_logs')
          .update({ logout_at: new Date().toISOString() }) 
          .in('id', idsToClose);
      }

      // 3. ALWAYS Insert the NEW Login Record
      const { data, error } = await supabase
        .from('login_logs')
        .insert([{
          staff_id: userId,
          staff_profile_id: profile.staff_profile_id,
          franchise_id: profile.franchise_id,
          login_at: new Date().toISOString()
        }])
        .select();

      if (error) console.error("❌ Failed to record login:", error.message);
      else console.log("✅ New Login Recorded ID:", data[0]?.id);
      
    } catch (err) {
      console.error("Login Log Error:", err);
    }
  };

  /* ================= PUBLIC FUNCTIONS ================= */
  const login = async (supabaseUser, profile) => {
    // This function manually updates state to avoid flickering
    setUser({
      ...supabaseUser,
      franchise_id: profile.franchise_id,
      staff_profile_id: profile.staff_profile_id || null,
    });
    setRole(profile.role);
  };

  const logout = async () => {
    console.log("🔴 Logout initiated...");

    try {
      // 1. Check if it's a staff member logging out
      if (role === "staff" && user?.id) {
        
        // Find the active log entry for this session
        const { data: activeLog, error: fetchError } = await supabase
          .from('login_logs')
          .select('id')
          .eq('staff_id', user.id)
          .is('logout_at', null) // Only find logs that are still "Active"
          .order('login_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) console.error("Error finding active log:", fetchError);

        if (activeLog) {
          console.log("🕒 Found active session ID:", activeLog.id, "- Stamping logout time...");
          
          // 2. STAMP THE LOGOUT TIME
          const { error: updateError } = await supabase
            .from('login_logs')
            .update({ logout_at: new Date().toISOString() })
            .eq('id', activeLog.id);

          if (updateError) {
            console.error("❌ Failed to stamp logout:", updateError.message);
          } else {
            console.log("✅ Logout timestamp saved successfully.");
          }
        } else {
          console.warn("⚠️ No active login log found to close.");
        }
      }
    } catch (err) {
      console.error("Logout Logic Error:", err);
    }

    // 3. [CRITICAL FIX] WAIT BUFFER
    // We pause for 500ms to ensure the DB write completes before the browser cuts the connection.
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. NOW sign out properly
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("SignOut Error:", signOutError);

    setUser(null);
    setRole(null);
    window.location.href = '/'; // Force redirect to login
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