import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function RegisterUser() {
  const navigate = useNavigate();

  const [hover, setHover] = useState(false);
  const [backHover, setBackHover] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    branch_location: "",
    role: "franchise",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    /* 🔐 AUTH SIGNUP */
    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("User creation failed");
      setLoading(false);
      return;
    }

    const user = data.user;

    /* ✅ UPSERT PROFILE (NO DUPLICATES) */
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          address: formData.address.trim(),
          branch_location: formData.branch_location.trim(),
          role: "franchise",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      alert("Profile creation failed");
      setLoading(false);
      return;
    }

    alert("Registration successful! Please login.");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          ...styles.backButton,
          color: backHover ? "#0b3d2e" : "#0f5132",
        }}
        onMouseEnter={() => setBackHover(true)}
        onMouseLeave={() => setBackHover(false)}
      >
        ← Back
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>Register</h1>
        <h2 style={styles.brand}>T VANAMM</h2>

        <input
          name="name"
          placeholder="Full Name"
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="phone"
          placeholder="Phone Number"
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="address"
          placeholder="Address"
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="branch_location"
          placeholder="Branch Location"
          onChange={handleChange}
          style={styles.input}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...styles.button,
            backgroundColor: hover ? "#0b3d2e" : "#0f5132",
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p style={styles.footerText}>
          Already have an account?{" "}
          <Link to="/" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterUser;

/* 🎨 STYLES */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: "20px",
    left: "20px",
    background: "transparent",
    border: "none",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  card: {
    width: "380px",
    padding: "30px",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    textAlign: "center",
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
    marginBottom: "12px",
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
    transition: "background-color 0.3s ease",
    marginTop: "10px",
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
