import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null, // Stores full details (Address, Company, etc.)
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= HYDRATION LOGIC ================= */
  const hydrate = async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    console.log("🟡 Hydrating profile for:", supabaseUser.id);

    // 1. Check PROFILES (Owner / Admin)
    let { data: ownerProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    let finalProfile = null;

    if (ownerProfile) {
      // CASE A: User is an Owner/Admin
      finalProfile = ownerProfile;
    } else {
      // 2. Check STAFF_PROFILES (Store Staff)
      console.log("🔍 Not in profiles. Checking staff_profiles...");
      
      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (staffProfile) {
        // CASE B: User is Staff
        // CRITICAL STEP: Fetch Store Address from the Owner's Profile using franchise_id
        const { data: storeInfo } = await supabase
          .from("profiles")
          .select("company, address, city, state, pincode, phone")
          .eq("franchise_id", staffProfile.franchise_id)
          .limit(1)
          .maybeSingle();

        // Merge Staff Personal Info + Store Location Info
        finalProfile = {
          ...staffProfile,      // Name, Staff ID
          role: "staff", 
          staff_profile_id: staffProfile.id,
          ...storeInfo          // Company, Address, City, Pincode (For Receipt)
        };
      }
    }

    // 3. Final State Update
    if (!finalProfile) {
      console.warn("⚠️ Profile not found in either table.");
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    } else {
      // Set User State with essential IDs
      setUser({
        ...supabaseUser,
        franchise_id: finalProfile.franchise_id,
        staff_profile_id: finalProfile.staff_profile_id || null,
      });
      
      setProfile(finalProfile); // Available throughout the app
      setRole(finalProfile.role);
      setLoading(false);
      
      console.log("✅ Auth fully hydrated as:", finalProfile.role);
      return finalProfile; 
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
            const hydratedProfile = await hydrate(session.user);
            
            // --- [CRITICAL] AUTOMATIC LOGIN LOGGING ---
            if (hydratedProfile && hydratedProfile.role === "staff") {
              await recordLogin(session.user.id, hydratedProfile);
            }
          }, 500);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        } else if (event === "INITIAL_SESSION") {
           // Do nothing, let the initial getSession handle it, 
           // or just hydrate if user exists to be safe
           if(session?.user) hydrate(session.user);
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* ================= HELPER: RECORD LOGIN (SMART FIX) ================= */
  const recordLogin = async (userId, profileData) => {
    try {
      console.log("🔵 Attempting to record login...");

      // 1. Check for ANY existing active sessions (Zombie sessions)
      const { data: activeSessions } = await supabase
        .from('login_logs')
        .select('id')
        .eq('staff_id', userId)
        .is('logout_at', null);

      // 2. If found, AUTO-CLOSE them
      if (activeSessions && activeSessions.length > 0) {
        console.log(`⚠️ Found ${activeSessions.length} stuck sessions. Auto-closing them...`);
        
        const idsToClose = activeSessions.map(s => s.id);
        
        await supabase
          .from('login_logs')
          .update({ logout_at: new Date().toISOString() }) 
          .in('id', idsToClose);
      }

      // 3. Insert the NEW Login Record
      const { data, error } = await supabase
        .from('login_logs')
        .insert([{
          staff_id: userId,
          staff_profile_id: profileData.staff_profile_id,
          franchise_id: profileData.franchise_id,
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
  const login = async (supabaseUser, profileData) => {
    // Manually update state to avoid flickering / network delay
    setUser({
      ...supabaseUser,
      franchise_id: profileData.franchise_id,
      staff_profile_id: profileData.staff_profile_id || null,
    });
    setProfile(profileData);
    setRole(profileData.role);
  };

  const logout = async () => {
    console.log("🔴 Logout initiated...");

    try {
      // 1. Check if it's a staff member logging out
      if (role === "staff" && user?.id) {
        
        // Find the active log entry
        const { data: activeLog, error: fetchError } = await supabase
          .from('login_logs')
          .select('id')
          .eq('staff_id', user.id)
          .is('logout_at', null)
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

    // 3. Wait Buffer
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Sign out
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("SignOut Error:", signOutError);

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