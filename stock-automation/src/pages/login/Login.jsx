import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
  const [dynamicLogo, setDynamicLogo] = useState(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // FIX: Standardize Auth State Changes to prevent duplicate listener overhead
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    const fetchJkshLogo = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('logo_url')
          .ilike('company_name', '%JKSH%')
          .maybeSingle();
        if (data?.logo_url) setDynamicLogo(data.logo_url);
      } catch (err) { console.error("Logo fetch failed:", err); }
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
    setIsLoading(true);

    try {
      const cleanPassword = password.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !cleanPassword) throw new Error("Email and Password are required");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) throw new Error("Invalid credentials.");

      let userRole = "";
      let finalProfileData = null;

      // Try fetching from profiles
      let { data: ownerProfile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle();

      if (ownerProfile) {
        userRole = ownerProfile.role;
        finalProfileData = ownerProfile;
      } else {
        // Try fetching from staff_profiles
        const { data: staffProfile } = await supabase.from("staff_profiles").select("*").eq("id", authData.user.id).maybeSingle();
        if (staffProfile) {
          userRole = "staff";
          const { data: franchiseInfo } = await supabase.from("profiles").select("*").eq("franchise_id", staffProfile.franchise_id).maybeSingle();
          finalProfileData = { ...staffProfile, role: "staff", ...franchiseInfo };
        } else {
          throw new Error("Profile not found.");
        }
      }

      let finalLoginMode = (userRole === "staff") ? "store" : loginType;
      await login(authData.user, finalProfileData, finalLoginMode);

      if (finalLoginMode === "store") navigate("/store");
      else {
        const routes = { central: "central", franchise: "franchiseowner", stock: "stockmanager" };
        navigate(`/dashboard/${routes[userRole] || "franchiseowner"}`);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) return setErrorMsg("Please enter your email first.");
    setErrorMsg("");
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setErrorMsg(error.message);
    else setSuccessMsg("Password reset link sent!");
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!password) return setErrorMsg("Enter a new password.");
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) setErrorMsg(error.message);
    else {
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
          {dynamicLogo ? (
            <img src={dynamicLogo} alt="JKSH Logo" style={{ ...styles.logo, width: isMobile ? "110px" : "140px" }} />
          ) : (
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
            <button onClick={() => setLoginType("store")} style={{ ...styles.toggleButton, ...(loginType === "store" && styles.toggleActive) }}>STORE</button>
            <button onClick={() => setLoginType("admin")} style={{ ...styles.toggleButton, ...(loginType === "admin" && styles.toggleActive) }}>ADMIN</button>
          </div>
        )}

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
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
            <button style={styles.button} onClick={handleUpdatePassword} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          ) : (
            <>
              <button style={styles.button} onClick={handleLogin} disabled={isLoading}>
                {isLoading ? "Verifying..." : "Login"}
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
  toggleButton: { flex: 1, padding: "12px", border: "none", background: "transparent", borderRadius: "12px", fontSize: "12px", fontWeight: "800", color: "#6b7280", cursor: "pointer" },
  toggleActive: { background: PRIMARY, color: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "14px", width: "100%" },
  input: { width: "100%", padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box" },
  passwordWrapper: { position: "relative", width: "100%" },
  inputPassword: { width: "100%", padding: "16px 50px 16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box" },
  eyeBtn: { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer" },
  button: { width: "100%", padding: "18px", borderRadius: "16px", background: PRIMARY, color: "#fff", border: "none", fontSize: "13px", fontWeight: "800", marginTop: "10px", cursor: "pointer" },
  forgotBtn: { background: 'none', border: 'none', color: '#6b7280', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' },
  errorBox: { width: "100%", background: "#fee2e2", color: "#ef4444", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box" },
  successBox: { width: "100%", background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", boxSizing: "border-box" },
};

export default Login;