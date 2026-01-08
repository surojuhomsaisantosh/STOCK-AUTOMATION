import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function RegisterUser() {
  const navigate = useNavigate();

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    const user = data.user;

    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: user.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        branch_location: formData.branch_location,
        role: "franchise",
      },
    ]);

    if (profileError) {
      alert("Profile creation failed");
      console.error(profileError);
      return;
    }

    alert("Registration successful! Please login.");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register</h2>
        <p style={styles.subtitle}>T VANAMM</p>

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

        <button onClick={handleSubmit} style={styles.primaryButton}>
          Register
        </button>

        <Link to="/" style={styles.link}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default RegisterUser;

/* ---------- Styles ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f5f5",
  },
  card: {
    width: "360px",
    background: "#ffffff",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  title: {
    textAlign: "center",
    marginBottom: "0",
  },
  subtitle: {
    textAlign: "center",
    marginTop: "0",
    marginBottom: "20px",
    fontWeight: "bold",
    color: "#555",
  },
  input: {
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    outline: "none",
  },
  primaryButton: {
    marginTop: "10px",
    padding: "12px",
    fontSize: "15px",
    cursor: "pointer",
  },
  link: {
    marginTop: "10px",
    textAlign: "center",
    textDecoration: "none",
    color: "#000",
    fontSize: "14px",
  },
};
