import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase, fetchWithRetry, isNetworkError, checkSupabaseConnection } from "../../supabase/supabaseClient";
import { Eye, EyeOff, Loader2, WifiOff } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("store");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(""); // Shows retry/connection status

  // UI States
  const [dynamicLogo, setDynamicLogo] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false); // FIX: Tracks actual image download
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    console.log("🟢 [UI DEBUG] Login component mounted.");

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);

    // Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 [AUTH DEBUG] Auth event triggered: ${event}`);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    // Optimized Logo Fetch
    const fetchJkshLogo = async () => {
      // Check localStorage (persists across sessions — no need to re-fetch every time)
      const cachedLogo = localStorage.getItem("jksh_logo_url");
      if (cachedLogo) {
        console.log("⚡ [FETCH DEBUG] Using cached logo URL from localStorage.");
        setDynamicLogo(cachedLogo);
        return;
      }

      console.log("🌐 [FETCH DEBUG] Requesting logo URL from Supabase...");
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('logo_url')
          .ilike('company_name', '%JKSH%')
          .maybeSingle();

        if (error) throw error;

        if (data?.logo_url) {
          console.log("✅ [FETCH DEBUG] Logo URL retrieved successfully.");
          setDynamicLogo(data.logo_url);
          localStorage.setItem("jksh_logo_url", data.logo_url);
        } else {
          console.log("⚠️ [FETCH DEBUG] No logo URL found in database.");
        }
      } catch (err) {
        console.error("❌ [FETCH DEBUG] Logo fetch failed:", err);
        // Non-critical — don't show error to user, logo is just cosmetic
      }
    };

    fetchJkshLogo();

    return () => {
      console.log("🔴 [UI DEBUG] Login component unmounting. Cleaning up listeners.");
      window.removeEventListener('resize', handleResize);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    console.log(`🚀 [LOGIN DEBUG] Attempting login as type: ${loginType}`);
    setErrorMsg("");
    setSuccessMsg("");
    setStatusMsg("");
    setIsLoading(true);

    try {
      const cleanPassword = password.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !cleanPassword) {
        console.log("⚠️ [LOGIN DEBUG] Missing credentials.");
        throw new Error("Email and Password are required.");
      }

      // ── STEP 1: Check if we can reach Supabase at all ──
      setStatusMsg("Checking connection...");
      const connectionCheck = await checkSupabaseConnection();
      if (!connectionCheck.ok) {
        console.log("❌ [LOGIN DEBUG] Connection check failed:", connectionCheck.reason);
        throw new Error(connectionCheck.reason);
      }

      // ── STEP 2: Authenticate with retry ──
      setStatusMsg("Verifying credentials...");
      console.log("⏳ [LOGIN DEBUG] Verifying credentials with Supabase Auth...");

      let authData;
      try {
        const result = await fetchWithRetry(async () => {
          const res = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          // signInWithPassword returns { data, error } — if it's a network error, fetchWithRetry handles retry
          if (res.error && isNetworkError(res.error)) {
            throw res.error;
          }
          return res;
        });

        if (result.error) {
          // This is an auth error (wrong password, user not found, etc.)
          console.log("❌ [LOGIN DEBUG] Invalid credentials.", result.error.message);
          throw new Error("Invalid email or password.");
        }
        authData = result.data;
      } catch (retryErr) {
        if (isNetworkError(retryErr)) {
          throw new Error("Network error — could not reach the server after multiple attempts. Please check your internet connection and try again.");
        }
        throw retryErr; // Re-throw auth errors
      }

      // ── STEP 2.5: Ensure session is fully established (fixes mobile browsers) ──
      setStatusMsg("Securing session...");
      console.log("🔒 [LOGIN DEBUG] Ensuring auth session is fully set before profile fetch...");

      // Give mobile browsers time to persist the session to storage
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the session actually exists in the client
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.log("⚠️ [LOGIN DEBUG] Session not found after login! Force-setting it now...");
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
        if (setSessionError) {
          console.error("❌ [LOGIN DEBUG] Failed to force-set session:", setSessionError);
        } else {
          console.log("✅ [LOGIN DEBUG] Session force-set successfully.");
        }
      } else {
        console.log("✅ [LOGIN DEBUG] Session confirmed active.");
      }

      // ── STEP 3: Fetch profile with retry ──
      setStatusMsg("Loading your profile...");
      console.log(`✅ [LOGIN DEBUG] Fetching profile for User ID: ${authData.user.id}`);
      let userRole = "";
      let finalProfileData = null;

      try {
        const { data: ownerProfile } = await fetchWithRetry(() =>
          supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle()
        );

        if (ownerProfile) {
          console.log("👤 [LOGIN DEBUG] Owner/Admin profile found.");
          userRole = ownerProfile.role;
          finalProfileData = ownerProfile;
        } else {
          console.log("🔍 [LOGIN DEBUG] Not an owner. Checking staff_profiles...");
          const { data: staffProfile } = await fetchWithRetry(() =>
            supabase.from("staff_profiles").select("*").eq("id", authData.user.id).maybeSingle()
          );

          if (staffProfile) {
            console.log("🧑‍💼 [LOGIN DEBUG] Staff profile found. Fetching franchise info...");
            userRole = "staff";
            const { data: franchiseInfo } = await fetchWithRetry(() =>
              supabase.from("profiles").select("*").eq("franchise_id", staffProfile.franchise_id).maybeSingle()
            );
            finalProfileData = { ...staffProfile, role: "staff", ...franchiseInfo };
          } else {
            console.error("❌ [LOGIN DEBUG] Profile completely missing for authenticated user.");
            throw new Error("Profile not found. Please contact your administrator.");
          }
        }
      } catch (profileErr) {
        console.error("❌ [LOGIN DEBUG] Profile fetch failed. Full error:", profileErr);
        console.error("❌ [LOGIN DEBUG] Error name:", profileErr?.name, "| Message:", profileErr?.message);
        console.error("❌ [LOGIN DEBUG] isNetworkError result:", isNetworkError(profileErr));
        if (isNetworkError(profileErr)) {
          throw new Error(`Logged in but couldn't load your profile. Error: ${profileErr?.message || "Unknown"}. Try clearing your browser cache, disabling ad blockers, or using a different browser.`);
        }
        throw profileErr;
      }

      // ── STEP 4: Navigate ──
      setStatusMsg("Redirecting...");
      let finalLoginMode = (userRole === "staff") ? "store" : loginType;
      console.log(`🔄 [LOGIN DEBUG] Finalizing context setup. Routing user to: ${finalLoginMode}`);

      await login(authData.user, finalProfileData, finalLoginMode);

      if (finalLoginMode === "store") {
        navigate("/store");
      } else {
        const routes = { central: "central", franchise: "franchiseowner", stock: "stockmanager" };
        const route = routes[userRole] || "franchiseowner";
        navigate(`/dashboard/${route}`);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setStatusMsg("");
      console.log("🛑 [LOGIN DEBUG] Login cycle complete.");
    }
  };

  const handleForgotPassword = async () => {
    console.log("📩 [AUTH DEBUG] Initiating password reset...");
    if (!email) return setErrorMsg("Please enter your email first.");

    setErrorMsg("");
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      console.error("❌ [AUTH DEBUG] Password reset failed:", error.message);
      setErrorMsg(error.message);
    } else {
      console.log("✅ [AUTH DEBUG] Password reset link sent.");
      setSuccessMsg("Password reset link sent!");
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    console.log("🔐 [AUTH DEBUG] Attempting to set new password...");
    if (!password) return setErrorMsg("Enter a new password.");

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      console.error("❌ [AUTH DEBUG] Password update failed:", error.message);
      setErrorMsg(error.message);
    } else {
      console.log("✅ [AUTH DEBUG] Password updated successfully.");
      setSuccessMsg("Updated! You can now login.");
      setIsRecoveryMode(false);
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, width: isMobile ? "90%" : "420px", padding: isMobile ? "30px 20px" : "40px" }}>

        {/* FIX: Improved Logo Loading Sequence */}
        <div style={styles.logoContainer}>
          {/* Render the image tag behind the scenes to trigger download */}
          {dynamicLogo && (
            <img
              src={dynamicLogo}
              alt="JKSH Logo"
              onLoad={() => {
                console.log("🖼️ [UI DEBUG] Image completely downloaded and rendered.");
                setIsImageLoaded(true);
              }}
              style={{
                ...styles.logo,
                width: isMobile ? "110px" : "140px",
                display: isImageLoaded ? "block" : "none" // Hide it until fully loaded!
              }}
            />
          )}

          {/* Show the spinner ONLY if there is no URL yet, OR if the image is still downloading */}
          {(!dynamicLogo || !isImageLoaded) && (
            <div style={{ ...styles.logo, width: isMobile ? "110px" : "140px", height: "60px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin text-slate-200" size={24} />
            </div>
          )}
        </div>

        <h1 style={{ ...styles.title, fontSize: isMobile ? "18px" : "22px", marginBottom: "8px" }}>JKSH United Pvt.Ltd</h1>
        <p style={{ fontSize: '11px', fontWeight: '800', color: PRIMARY, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isRecoveryMode ? "Set New Password" : `${loginType} access portal`}
        </p>

        {!isRecoveryMode && (
          <div style={{ ...styles.toggleBar, marginBottom: "24px" }}>
            <button
              onClick={() => {
                console.log("🔘 [UI DEBUG] Switched to STORE mode");
                setLoginType("store");
              }}
              style={{ ...styles.toggleButton, ...(loginType === "store" && styles.toggleActive) }}
            >
              STORE
            </button>
            <button
              onClick={() => {
                console.log("🔘 [UI DEBUG] Switched to ADMIN mode");
                setLoginType("admin");
              }}
              style={{ ...styles.toggleButton, ...(loginType === "admin" && styles.toggleActive) }}
            >
              ADMIN
            </button>
          </div>
        )}

        {errorMsg && <div style={styles.errorBox}><WifiOff size={14} style={{ marginRight: 6, flexShrink: 0, verticalAlign: 'middle' }} />{errorMsg}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}
        {statusMsg && !errorMsg && <div style={styles.statusBox}><Loader2 className="animate-spin" size={14} style={{ marginRight: 6, flexShrink: 0 }} />{statusMsg}</div>}

        <div style={styles.form}>
          {!isRecoveryMode && (
            <input style={styles.input} type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}

          <div style={styles.passwordWrapper}>
            <input
              style={styles.inputPassword}
              type={showPassword ? "text" : "password"}
              placeholder={isRecoveryMode ? "Enter New Password" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color={BLACK} /> : <Eye size={18} color={BLACK} />}
            </button>
          </div>

          {isRecoveryMode ? (
            <button style={styles.button} onClick={handleUpdatePassword} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          ) : (
            <>
              <button style={styles.button} onClick={handleLogin} disabled={isLoading}>
                {isLoading ? (statusMsg || "Verifying...") : "Login"}
              </button>
              <button type="button" onClick={handleForgotPassword} style={styles.forgotBtn}>
                Forgot Password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { height: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", background: "#f3f4f6", fontFamily: '"Inter", sans-serif' },
  card: { background: "#fff", borderRadius: "32px", border: `1.5px solid ${BORDER}`, textAlign: "center", boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" },
  logoContainer: { marginBottom: "16px", display: "flex", justifyContent: "center", width: "100%" },
  logo: { height: "auto", borderRadius: "16px", objectFit: "contain", padding: "8px", background: "#fff", border: `1px solid ${BORDER}` },
  title: { fontWeight: "900", color: BLACK, letterSpacing: '-0.5px' },
  toggleBar: { display: "flex", background: "#f3f4f6", borderRadius: "16px", padding: "6px", width: "100%" },
  toggleButton: { flex: 1, padding: "12px", border: "none", background: "transparent", borderRadius: "12px", fontSize: "12px", fontWeight: "800", color: "#6b7280", cursor: "pointer", transition: "all 0.2s ease-in-out" },
  toggleActive: { background: PRIMARY, color: "#fff", boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  form: { display: "flex", flexDirection: "column", gap: "14px", width: "100%" },
  input: { width: "100%", padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box", transition: "border-color 0.2s" },
  passwordWrapper: { position: "relative", width: "100%" },
  inputPassword: { width: "100%", padding: "16px 50px 16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box", transition: "border-color 0.2s" },
  eyeBtn: { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  button: { width: "100%", padding: "18px", borderRadius: "16px", background: PRIMARY, color: "#fff", border: "none", fontSize: "13px", fontWeight: "800", marginTop: "10px", cursor: "pointer", transition: "opacity 0.2s" },
  forgotBtn: { background: 'none', border: 'none', color: '#6b7280', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' },
  errorBox: { width: "100%", background: "#fee2e2", color: "#ef4444", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box", display: "flex", alignItems: "center" },
  successBox: { width: "100%", background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box" },
  statusBox: { width: "100%", background: "#eff6ff", color: "#1d4ed8", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box", display: "flex", alignItems: "center" },
};

export default Login;