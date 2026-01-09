import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";

function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

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

        <p style={styles.footerText}>
          Don’t have an account?{" "}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
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
  footerText: {
    marginTop: "20px",
    fontSize: "13px",
    color: "#333",
  },
  link: {
    color: "#0f5132",
    textDecoration: "none",
    fontWeight: "500",
  },
};

export default Login;
