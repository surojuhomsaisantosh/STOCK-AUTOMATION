import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase, fetchWithRetry, isNetworkError, getProxiedUrl } from "../../supabase/supabaseClient";
import { Eye, EyeOff, Loader2, WifiOff } from "lucide-react";
import { BRAND_GREEN } from "../../utils/theme";

const PRIMARY = BRAND_GREEN;
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
  const [statusMsg, setStatusMsg] = useState(""); // Kept intact for the button!

  // UI States
  const [dynamicLogo, setDynamicLogo] = useState(() => {
    const cached = localStorage.getItem("jksh_logo_url");
    return cached ? getProxiedUrl(cached) : "/logo.jpg";
  });
  const [isImageLoaded, setIsImageLoaded] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);

    // Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    // Optimized Logo Fetch
    const fetchJkshLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('logo_url')
          .ilike('company_name', '%JKSH%')
          .maybeSingle();

        if (error) throw error;

        if (data?.logo_url) {
          const proxiedUrl = getProxiedUrl(data.logo_url);
          setDynamicLogo(proxiedUrl);
          localStorage.setItem("jksh_logo_url", data.logo_url);
        }
      } catch (e) {
        console.error("Failed to update logo:", e);
      }
    };

    fetchJkshLogo();

    return () => {
      window.removeEventListener('resize', handleResize);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setStatusMsg("");
    setIsLoading(true);

    try {
      const cleanPassword = password.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !cleanPassword) {
        throw new Error("Email and Password are required.");
      }

      // ── STEP 1: Authenticate with retry ──
      //setStatusMsg("Verifying credentials...");

      let authData;
      try {
        const result = await fetchWithRetry(async () => {
          const res = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (res.error && isNetworkError(res.error)) {
            throw res.error;
          }
          return res;
        });

        if (result.error) {
          throw new Error("Invalid email or password.");
        }
        authData = result.data;
      } catch (retryErr) {
        if (isNetworkError(retryErr)) {
          throw new Error("Network error — could not reach the server after multiple attempts. Please check your internet connection and try again.");
        }
        throw retryErr;
      }

      // ── STEP 2.5: Ensure session is fully established ──
      setStatusMsg("Securing session...");

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
      }

      // ── STEP 3: Fetch profile with retry ──
      setStatusMsg("Loading your profile...");
      let userRole = "";
      let finalProfileData = null;

      try {
        const { data: ownerProfile } = await fetchWithRetry(() =>
          supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle()
        );

        if (ownerProfile) {
          userRole = ownerProfile.role;
          finalProfileData = ownerProfile;
        } else {
          const { data: staffProfile } = await fetchWithRetry(() =>
            supabase.from("staff_profiles").select("*").eq("id", authData.user.id).maybeSingle()
          );

          if (staffProfile) {
            userRole = "staff";
            const { data: franchiseInfo } = await fetchWithRetry(() =>
              supabase.from("profiles").select("*").eq("franchise_id", staffProfile.franchise_id).maybeSingle()
            );
            finalProfileData = { ...staffProfile, role: "staff", ...franchiseInfo };
          } else {
            throw new Error("Profile not found. Please contact your administrator.");
          }
        }
      } catch (profileErr) {
        if (isNetworkError(profileErr)) {
          throw new Error(`Logged in but couldn't load your profile. Error: ${profileErr?.message || "Unknown"}. Try clearing your browser cache or using a different browser.`);
        }
        throw profileErr;
      }

      // ── STEP 4: Navigate ──
      setStatusMsg("Redirecting...");
      let finalLoginMode = (userRole === "staff") ? "store" : loginType;

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
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setErrorMsg("Please enter your email first.");

    setErrorMsg("");
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password reset link sent!");
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!password) return setErrorMsg("Enter a new password.");

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Updated! You can now login.");
      setIsRecoveryMode(false);
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, width: isMobile ? "90%" : "420px", padding: isMobile ? "30px 20px" : "40px" }}>

        <div style={styles.logoContainer}>
            <img
              src={dynamicLogo}
              alt="JKSH Logo"
              fetchpriority="high"
              style={{
                ...styles.logo,
                width: isMobile ? "110px" : "140px",
                display: "block" // Unconditionally block for fastest LCP
              }}
            />
        </div>

        <h1 style={{ ...styles.title, fontSize: isMobile ? "18px" : "22px", marginBottom: "8px" }}>JKSH United Pvt.Ltd</h1>
        <p style={{ fontSize: '11px', fontWeight: '800', color: PRIMARY, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isRecoveryMode ? "Set New Password" : `${loginType} access portal`}
        </p>

        {!isRecoveryMode && (
          <div style={{ ...styles.toggleBar, marginBottom: "24px" }}>
            <button
              onClick={() => setLoginType("store")}
              style={{ ...styles.toggleButton, ...(loginType === "store" && styles.toggleActive) }}
            >
              STORE
            </button>
            <button
              onClick={() => setLoginType("admin")}
              style={{ ...styles.toggleButton, ...(loginType === "admin" && styles.toggleActive) }}
            >
              ADMIN
            </button>
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorBox}>
            <WifiOff size={16} style={{ marginRight: 8, flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}
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
            <button style={{ ...styles.button, opacity: isLoading ? 0.8 : 1 }} onClick={handleUpdatePassword} disabled={isLoading}>
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Updating...</span>
                </div>
              ) : "Update Password"}
            </button>
          ) : (
            <>
              <button style={{ ...styles.button, opacity: isLoading ? 0.8 : 1 }} onClick={handleLogin} disabled={isLoading}>
                {isLoading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <Loader2 className="animate-spin" size={16} />
                    {/* The text right here inside the button is untouched! */}
                    <span>{statusMsg || "Please wait..."}</span>
                  </div>
                ) : "Login"}
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
  errorBox: { width: "100%", background: "#fee2e2", color: "#ef4444", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box", display: "flex", alignItems: "flex-start", marginBottom: "16px", lineHeight: "1.4" },
  successBox: { width: "100%", background: "#dcfce7", color: "#166534", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" },
};

export default Login;