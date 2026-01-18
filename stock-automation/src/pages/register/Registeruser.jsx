import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, ArrowLeft, UserPlus } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

function RegisterUser() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    company: "",
    franchise_id: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    branch_location: "",
    address: "",
    role: "franchise",
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    if (!formData.company) {
      alert("Please select a company");
      setLoading(false);
      return;
    }

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
      alert("User not created");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          company: formData.company,
          franchise_id: formData.franchise_id.trim(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          branch_location: formData.branch_location.trim(),
          address: formData.address.trim(),
          role: "franchise",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      alert("Profile not saved");
      setLoading(false);
      return;
    }

    alert("Account created. Please login.");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      {/* BACK BUTTON */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div style={{ ...styles.card, width: isMobile ? "90%" : "420px" }}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <UserPlus size={28} color={PRIMARY} />
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Add a new franchise user</p>
        </div>

        <div style={styles.form}>
          {/* COMPANY DROPDOWN */}
          <div style={styles.selectWrapper}>
            <select
              name="company"
              value={formData.company}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">Select Company</option>
              <option value="T vanamm">T vanamm</option>
              <option value="T leaf">T leaf</option>
            </select>

            {/* VECTOR ARROW */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.selectArrow}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <input
            name="franchise_id"
            placeholder="Franchise ID"
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="name"
            placeholder="Name"
            onChange={handleChange}
            style={styles.input}
          />

          <div style={styles.row}>
            <input
              name="phone"
              placeholder="Phone number"
              onChange={handleChange}
              style={{ ...styles.input, flex: 1 }}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              style={{ ...styles.input, flex: 1.5 }}
            />
          </div>

          <div style={styles.passwordWrapper}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              style={styles.passwordInput}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              style={styles.eyeButton}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <input
            name="branch_location"
            placeholder="Branch name"
            onChange={handleChange}
            style={styles.input}
          />

          <input
            name="address"
            placeholder="Address"
            onChange={handleChange}
            style={styles.input}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterUser;

/* SIMPLE STYLES */
const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    fontFamily: '"Inter", sans-serif',
    position: "relative",
    padding: "40px 0",
  },
  topBar: {
    position: "absolute",
    top: "30px",
    left: "30px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "transparent",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    color: "#6b7280",
    cursor: "pointer",
  },
  card: {
    padding: "50px 40px",
    border: `1.5px solid ${BORDER}`,
    borderRadius: "32px",
    backgroundColor: "#fff",
    textAlign: "center",
  },
  header: {
    marginBottom: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  iconWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "18px",
    background: "rgba(6, 95, 70, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "900",
    color: "#000",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  row: {
    display: "flex",
    gap: "10px",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: "16px",
    border: `1.5px solid ${BORDER}`,
    background: "#fff",
    fontSize: "14px",
    outline: "none",
  },

  /* SELECT FIX */
  selectWrapper: {
    position: "relative",
    width: "100%",
  },
  select: {
    width: "100%",
    padding: "16px 48px 16px 20px",
    borderRadius: "16px",
    border: `1.5px solid ${BORDER}`,
    background: "#fff",
    fontSize: "14px",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  selectArrow: {
    position: "absolute",
    right: "18px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    width: "100%",
    padding: "16px 50px 16px 20px",
    borderRadius: "16px",
    border: `1.5px solid ${BORDER}`,
    background: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  eyeButton: {
    position: "absolute",
    top: "50%",
    right: "18px",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
  },
  button: {
    width: "100%",
    padding: "18px",
    borderRadius: "16px",
    border: "none",
    backgroundColor: PRIMARY,
    color: "#fff",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
    marginTop: "10px",
    boxShadow: "0 4px 12px rgba(6, 95, 70, 0.2)",
  },
};
