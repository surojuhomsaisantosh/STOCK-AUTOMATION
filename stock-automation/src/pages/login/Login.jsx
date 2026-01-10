import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";

function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "franchise") navigate("/dashboard/franchiseowner");
      else if (role === "stock") navigate("/dashboard/stockmanager");
      else if (role === "central") navigate("/dashboard/central");
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async () => {
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    login(profile.role);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        <h2 style={styles.brand}>T VANAMM</h2>

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          autoComplete="email"
        />

        {/* PASSWORD FIELD */}
        <div style={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.passwordInput}
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            style={styles.eyeButton}
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              /* Eye Off */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.64-1.5 1.63-2.87 2.9-4.06" />
                <path d="M1 1l22 22" />
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8-.46 1.08-1.1 2.08-1.9 2.94" />
                <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
              </svg>
            ) : (
              /* Eye */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <button
          onClick={handleLogin}
          style={{
            ...styles.button,
            backgroundColor: hover ? "#0b3d2e" : "#0f5132",
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          Login
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  card: {
    width: "360px",
    padding: "30px",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    textAlign: "center",
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: "5px",
    fontSize: "26px",
    fontWeight: "600",
    color: "#000",
  },
  brand: {
    marginBottom: "20px",
    fontSize: "14px",
    letterSpacing: "2px",
    color: "#0f5132",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    fontSize: "14px",
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: "15px",
  },
  passwordInput: {
    width: "100%",
    padding: "12px 44px 12px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    fontSize: "14px",
  },
  eyeButton: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  error: {
    color: "red",
    fontSize: "13px",
    marginBottom: "10px",
  },
};

export default Login;
