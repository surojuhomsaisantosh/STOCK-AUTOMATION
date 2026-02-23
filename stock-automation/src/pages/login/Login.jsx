import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

import logo from "../../assets/jksh_logo.jpeg";

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
  const [isLoading, setIsLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async () => {
    setErrorMsg("");
    setIsLoading(true);

    try {
      const cleanPassword = password.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) throw new Error("Email address is required");
      if (!cleanPassword) throw new Error("Password is required");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) throw new Error("Invalid credentials. Please check your email and password.");

      let userRole = "";
      let userFranchiseId = "";
      let finalProfileData = null;

      let { data: ownerProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (ownerProfile) {
        userRole = ownerProfile.role;
        userFranchiseId = ownerProfile.franchise_id;
        finalProfileData = ownerProfile;
      } else {
        const { data: staffProfile } = await supabase
          .from("staff_profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (staffProfile) {
          userRole = "staff";
          userFranchiseId = staffProfile.franchise_id;

          const { data: franchiseInfo } = await supabase
            .from("profiles")
            .select("company, address, city, state, pincode, phone")
            .eq("franchise_id", userFranchiseId)
            .limit(1)
            .maybeSingle();

          // FIX: Explicitly map staff_profile_id so it doesn't log as null
          finalProfileData = {
            ...staffProfile,
            role: "staff",
            staff_profile_id: staffProfile.id,
            ...franchiseInfo
          };
        } else {
          throw new Error("User profile not found in database.");
        }
      }

      // ===============================================
      // EDGE CASE FIX: OVERRIDE TOGGLE IF USER IS STAFF
      // ===============================================
      let finalLoginMode = loginType;
      if (userRole === "staff") {
        finalLoginMode = "store"; // Force staff members to store mode!
      }

      await login(authData.user, finalProfileData, finalLoginMode);

      // Routing strictly depends on the final forced mode
      if (finalLoginMode === "store") {
        navigate("/store");
      } else {
        const routes = { central: "central", franchise: "franchiseowner", stock: "stockmanager" };
        navigate(`/dashboard/${routes[userRole] || "franchiseowner"}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, width: isMobile ? "90%" : "420px", padding: isMobile ? "30px 20px" : "40px" }}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="JKSH Logo" style={{ ...styles.logo, width: isMobile ? "110px" : "140px" }} />
        </div>

        <h1 style={{ ...styles.title, fontSize: isMobile ? "18px" : "22px", marginBottom: isMobile ? "20px" : "28px" }}>JKSH United Pvt.Ltd</h1>

        <div style={{ ...styles.toggleBar, marginBottom: isMobile ? "20px" : "28px" }}>
          <button onClick={() => { setLoginType("store"); setErrorMsg(""); }} style={{ ...styles.toggleButton, ...(loginType === "store" && styles.toggleActive) }}>STORE</button>
          <button onClick={() => { setLoginType("admin"); setErrorMsg(""); }} style={{ ...styles.toggleButton, ...(loginType === "admin" && styles.toggleActive) }}>ADMIN</button>
        </div>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        <div style={styles.form}>
          <input style={styles.input} type="email" placeholder={loginType === "store" ? "Staff Email" : "Admin Email"} value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={styles.passwordWrapper}>
            <input style={styles.inputPassword} type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color={BLACK} /> : <Eye size={18} color={BLACK} />}
            </button>
          </div>
          <button style={styles.button} onClick={handleLogin} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { height: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", background: "#f3f4f6", fontFamily: '"Inter", sans-serif' },
  card: { background: "#fff", borderRadius: "32px", border: `1.5px solid ${BORDER}`, textAlign: "center", boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" },
  logoContainer: { marginBottom: "24px", display: "flex", justifyContent: "center", width: "100%" },
  logo: { height: "auto", borderRadius: "16px", objectFit: "contain", display: "block", padding: "8px", background: "#fff", border: `1px solid ${BORDER}`, filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.05))" },
  title: { fontWeight: "900", color: BLACK, letterSpacing: '-0.5px', width: "100%" },
  toggleBar: { display: "flex", background: "#f3f4f6", borderRadius: "16px", padding: "6px", width: "100%", boxSizing: "border-box" },
  toggleButton: { flex: 1, padding: "12px", border: "none", background: "transparent", borderRadius: "12px", fontSize: "12px", fontWeight: "800", color: "#6b7280", cursor: "pointer", transition: '0.2s' },
  toggleActive: { background: PRIMARY, color: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "14px", width: "100%" },
  input: { width: "100%", padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box" },
  passwordWrapper: { position: "relative", width: "100%" },
  inputPassword: { width: "100%", padding: "16px 50px 16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600', boxSizing: "border-box" },
  eyeBtn: { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer" },
  button: { width: "100%", padding: "18px", borderRadius: "16px", background: PRIMARY, color: "#fff", border: "none", fontSize: "13px", fontWeight: "800", marginTop: "16px", cursor: "pointer" },
  errorBox: { width: "100%", background: "#fee2e2", color: "#ef4444", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", marginBottom: "18px", boxSizing: "border-box" },
};

export default Login;