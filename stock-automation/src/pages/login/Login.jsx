import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
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
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanFranchiseId = franchiseId.trim();

      if (!cleanEmail || !cleanPassword) {
        throw new Error("Email and password are required");
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, franchise_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Login not allowed");
      }

      /* STORE LOGIN */
      if (loginType === "store") {
        if (!["franchise", "central"].includes(profile.role)) {
          throw new Error("You cannot use the store");
        }

        await login(authData.user, profile);
        navigate("/store");
        return;
      }

      /* ADMIN LOGIN */
      if (!cleanFranchiseId) {
        throw new Error("Franchise ID is required");
      }

      if (String(profile.franchise_id) !== cleanFranchiseId) {
        throw new Error("Wrong franchise ID");
      }

      await login(authData.user, profile);

      const routes = {
        central: "central",
        franchise: "franchiseowner",
        stock: "stockmanager",
      };

      navigate(`/dashboard/${routes[profile.role]}`);
    } catch (err) {
      setErrorMsg(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>

        {/* MODE SWITCH */}
        <div style={styles.toggleBar}>
          <button
            onClick={() => setLoginType("store")}
            style={{
              ...styles.toggleButton,
              ...(loginType === "store" && styles.toggleActive),
            }}
          >
            Store
          </button>
          <button
            onClick={() => setLoginType("admin")}
            style={{
              ...styles.toggleButton,
              ...(loginType === "admin" && styles.toggleActive),
            }}
          >
            Admin
          </button>
        </div>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        <div style={styles.form}>
          {loginType === "admin" && (
            <input
              style={styles.input}
              placeholder="Franchise ID"
              value={franchiseId}
              onChange={(e) => setFranchiseId(e.target.value)}
            />
          )}

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            style={styles.button}
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#fff",
    fontFamily: '"Inter", sans-serif',
  },
  card: {
    width: "400px",
    padding: "50px 40px",
    background: "#fff",
    borderRadius: "32px",
    border: `1.5px solid ${BORDER}`,
    textAlign: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: "900",
    marginBottom: "28px",
  },
  toggleBar: {
    display: "flex",
    background: "#f3f4f6",
    borderRadius: "16px",
    padding: "6px",
    marginBottom: "28px",
  },
  toggleButton: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "transparent",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    cursor: "pointer",
  },
  toggleActive: {
    background: PRIMARY,
    color: "#fff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: "16px",
    border: `1.5px solid ${BORDER}`,
    fontSize: "14px",
    outline: "none",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
  },
  inputPassword: {
    width: "100%",
    padding: "16px 50px 16px 20px",
    borderRadius: "16px",
    border: `1.5px solid ${BORDER}`,
    fontSize: "14px",
    outline: "none",
  },
  eyeBtn: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "none",
    color: "#9ca3af",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "18px",
    borderRadius: "16px",
    background: PRIMARY,
    color: "#fff",
    border: "none",
    fontSize: "13px",
    fontWeight: "800",
    marginTop: "16px",
    cursor: "pointer",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#ef4444",
    padding: "12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "18px",
  },
};

export default Login;
