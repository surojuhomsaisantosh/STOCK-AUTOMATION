import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(""); // Used for Admin (actual email)
  const [staffId, setStaffId] = useState(""); // Used for Store
  const [password, setPassword] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [loginType, setLoginType] = useState("store");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMsg("");
    setIsLoading(true);

    try {
      const cleanPassword = password.trim();
      const cleanFranchiseId = franchiseId.trim();
      let targetEmail = "";

      if (!cleanPassword) throw new Error("Password is required");

      /* --- LOGIC FOR STAFF (STORE) LOGIN --- */
      if (loginType === "store") {
        if (!staffId.trim() || !cleanFranchiseId) {
          throw new Error("Staff ID and Franchise ID are required");
        }
        // Construct the hidden email we created during staff registration
        targetEmail = `${staffId.trim()}@${cleanFranchiseId.toLowerCase()}.com`;
      } 
      /* --- LOGIC FOR ADMIN LOGIN --- */
      else {
        if (!email.trim() || !cleanFranchiseId) {
          throw new Error("Email and Franchise ID are required");
        }
        targetEmail = email.trim().toLowerCase();
      }

      // 1. Sign in with the constructed/provided email
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: cleanPassword,
        });

      if (authError) throw authError;

      // 2. Fetch Profile from EITHER 'profiles' or 'staff_profiles'
      // First try 'profiles' (Admin/Central/Stock)
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, franchise_id")
        .eq("id", authData.user.id)
        .maybeSingle();

      // If not found, try 'staff_profiles' (Store Staff)
      if (!profile) {
        const { data: staffProfile } = await supabase
          .from("staff_profiles")
          .select("franchise_id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (staffProfile) {
          profile = { role: "staff", franchise_id: staffProfile.franchise_id };
        }
      }

      if (!profile) throw new Error("Profile not found");

      // 3. Validate Franchise ID
      if (String(profile.franchise_id) !== cleanFranchiseId) {
        throw new Error("Invalid Franchise ID for this user");
      }

      // 4. Final Routing
      await login(authData.user, profile);

      if (loginType === "store") {
        navigate("/store");
      } else {
        const routes = {
          central: "central",
          franchise: "franchiseowner",
          stock: "stockmanager",
        };
        navigate(`/dashboard/${routes[profile.role] || "franchiseowner"}`);
      }
    } catch (err) {
      setErrorMsg(err.message || "Login failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>LOGIN</h1>

        {/* MODE SWITCH */}
        <div style={styles.toggleBar}>
          <button
            onClick={() => { setLoginType("store"); setErrorMsg(""); }}
            style={{
              ...styles.toggleButton,
              ...(loginType === "store" && styles.toggleActive),
            }}
          >
            Store Mode
          </button>
          <button
            onClick={() => { setLoginType("admin"); setErrorMsg(""); }}
            style={{
              ...styles.toggleButton,
              ...(loginType === "admin" && styles.toggleActive),
            }}
          >
            Admin Mode
          </button>
        </div>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        <div style={styles.form}>
          {/* Always ask for Franchise ID */}
          <input
            style={styles.input}
            placeholder="Franchise ID (e.g., TV-3)"
            value={franchiseId}
            onChange={(e) => setFranchiseId(e.target.value)}
          />

          {loginType === "store" ? (
            <input
              style={styles.input}
              placeholder="Staff ID"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            />
          ) : (
            <input
              style={styles.input}
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          <div style={styles.passwordWrapper}>
            <input
              style={styles.inputPassword}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} color={BLACK} /> : <Eye size={18} color={BLACK} />}
            </button>
          </div>

          <button
            style={styles.button}
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Access Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { height: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", background: "#f9fafb", fontFamily: '"Inter", sans-serif' },
  card: { width: "400px", padding: "50px 40px", background: "#fff", borderRadius: "32px", border: `1.5px solid ${BORDER}`, textAlign: "center", boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' },
  title: { fontSize: "24px", fontWeight: "900", marginBottom: "28px", color: BLACK, letterSpacing: '-0.5px' },
  toggleBar: { display: "flex", background: "#f3f4f6", borderRadius: "16px", padding: "6px", marginBottom: "28px" },
  toggleButton: { flex: 1, padding: "12px", border: "none", background: "transparent", borderRadius: "12px", fontSize: "12px", fontWeight: "800", color: "#6b7280", cursor: "pointer", transition: '0.2s' },
  toggleActive: { background: PRIMARY, color: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  input: { width: "100%", padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600' },
  passwordWrapper: { position: "relative", width: "100%" },
  inputPassword: { width: "100%", padding: "16px 50px 16px 20px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, fontSize: "14px", outline: "none", color: BLACK, fontWeight: '600' },
  eyeBtn: { position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer" },
  button: { width: "100%", padding: "18px", borderRadius: "16px", background: PRIMARY, color: "#fff", border: "none", fontSize: "13px", fontWeight: "800", marginTop: "16px", cursor: "pointer" },
  errorBox: { background: "#fee2e2", color: "#ef4444", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", marginBottom: "18px" },
};

export default Login;