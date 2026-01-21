import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, ArrowLeft, UserPlus } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Jammu and Kashmir", "Ladakh"
];

const MAJOR_CITIES = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Other"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Other"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "Other"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Other"],
  "Telangana": ["Hyderabad", "Warangal", "Other"],
  "West Bengal": ["Kolkata", "Howrah", "Other"],
  "default": ["Capital City", "Other"]
};

function RegisterUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    company: "", franchise_id: "", name: "", phone: "", email: "",
    password: "", branch_location: "", role: "franchise", country: "India",
    state: "", city: "", cityOther: "", pincode: "", addressLine: ""
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle Prefix Logic when Company changes
  useEffect(() => {
    let prefix = "";
    if (formData.company === "T vanamm") prefix = "TV-";
    else if (formData.company === "T leaf") prefix = "TL-";

    if (prefix && !formData.franchise_id.startsWith(prefix)) {
      setFormData(prev => ({ ...prev, franchise_id: prefix }));
    } else if (!formData.company) {
      setFormData(prev => ({ ...prev, franchise_id: "" }));
    }
  }, [formData.company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Lock the prefix so it can't be deleted
    if (name === "franchise_id") {
      let prefix = "";
      if (formData.company === "T vanamm") prefix = "TV-";
      else if (formData.company === "T leaf") prefix = "TL-";
      
      if (prefix && !value.startsWith(prefix)) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const getCityOptions = () => {
    if (!formData.state) return [];
    return MAJOR_CITIES[formData.state] || MAJOR_CITIES["default"];
  };

  const handleSubmit = async () => {
    if (loading) return;

    // 1. Check Identity
    const { data: { session } } = await supabase.auth.getSession();
    const currentRole = session?.user?.app_metadata?.role;

    if (currentRole !== 'central') {
      alert("Permission denied. You must be a Central Admin to register users.");
      return;
    }

    setLoading(true);

    try {
      /** * 2. TEMP CLIENT: Crucial to prevent current Admin from being 
       * automatically logged out by the new user registration 
       */
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false 
        }
      });

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (authError) throw authError;

      const finalCity = formData.city === "Other" ? formData.cityOther : formData.city;
      
      // 3. Insert into Profiles using MAIN Admin Client
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{
          id: authData.user.id,
          company: formData.company,
          franchise_id: formData.franchise_id.trim(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          branch_location: formData.branch_location.trim(),
          address: formData.addressLine.trim(), 
          city: finalCity,
          state: formData.state,
          pincode: formData.pincode.trim(),
          role: "franchise",
        }]);

      if (profileError) throw profileError;

      alert("✅ Franchise account successfully created!");
      
      // Reset Form for next entry
      setFormData({
        company: "", franchise_id: "", name: "", phone: "", email: "",
        password: "", branch_location: "", role: "franchise", country: "India",
        state: "", city: "", cityOther: "", pincode: "", addressLine: ""
      });

    } catch (err) {
      console.error("Registration failed:", err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div style={{ ...styles.card, width: isMobile ? "90%" : "500px" }}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}><UserPlus size={28} color={PRIMARY} /></div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Register new franchise owner</p>
        </div>

        <div style={styles.form}>
          <select name="company" value={formData.company} onChange={handleChange} style={styles.select}>
            <option value="">Select Company</option>
            <option value="T vanamm">T vanamm</option>
            <option value="T leaf">T leaf</option>
          </select>

          <div style={styles.row}>
            <input 
              name="franchise_id" 
              value={formData.franchise_id} 
              placeholder="Franchise ID" 
              onChange={handleChange} 
              style={styles.input} 
            />
            <input 
              name="branch_location" 
              value={formData.branch_location} 
              placeholder="Branch Name" 
              onChange={handleChange} 
              style={styles.input} 
            />
          </div>

          <input name="name" value={formData.name} placeholder="Owner Name" onChange={handleChange} style={styles.input} />

          <div style={styles.row}>
            <input name="phone" value={formData.phone} placeholder="Phone" onChange={handleChange} style={styles.input} />
            <input name="email" value={formData.email} type="email" placeholder="Email" onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.passwordWrapper}>
            <input
              name="password"
              value={formData.password}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              style={styles.passwordInput}
            />
            <button type="button" onClick={() => setShowPassword((p) => !p)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={styles.divider}><span style={styles.dividerText}>Address Details</span></div>

          <div style={styles.row}>
            <div style={styles.inputDisabled}>India</div>
            <input name="pincode" value={formData.pincode} placeholder="Pincode" onChange={handleChange} style={styles.input} maxLength={6} />
          </div>

          <div style={styles.row}>
            <select name="state" value={formData.state} onChange={handleChange} style={styles.select}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select name="city" value={formData.city} onChange={handleChange} style={styles.select} disabled={!formData.state}>
              <option value="">Select City</option>
              {getCityOptions().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formData.city === "Other" && (
            <input name="cityOther" value={formData.cityOther} placeholder="Enter City Name" onChange={handleChange} style={styles.input} />
          )}

          <textarea
            name="addressLine"
            value={formData.addressLine}
            placeholder="House No, Street, Landmark"
            onChange={handleChange}
            style={styles.textarea}
            rows={2}
          />

          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            style={{ 
              ...styles.button, 
              opacity: loading ? 0.7 : 1, 
              cursor: loading ? "not-allowed" : "pointer" 
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

const styles = {
  page: { minHeight: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff", fontFamily: '"Inter", sans-serif', position: "relative", padding: "40px 0" },
  topBar: { position: "absolute", top: "30px", left: "30px" },
  backButton: { display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", fontSize: "14px", fontWeight: "600", color: "#6b7280", cursor: "pointer" },
  card: { padding: "40px", border: `1.5px solid ${BORDER}`, borderRadius: "32px", backgroundColor: "#fff", textAlign: "center" },
  header: { marginBottom: "24px", display: "flex", flexDirection: "column", alignItems: "center" },
  iconWrapper: { width: "50px", height: "50px", borderRadius: "16px", background: "rgba(6, 95, 70, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" },
  title: { fontSize: "24px", fontWeight: "900", color: "#000", margin: "0 0 4px 0" },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "10px" },
  input: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none" },
  inputDisabled: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#f3f4f6", fontSize: "14px", color: "#6b7280", textAlign: "left" },
  textarea: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none", resize: "none", fontFamily: '"Inter", sans-serif' },
  select: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none", appearance: "none" },
  passwordWrapper: { position: "relative" },
  passwordInput: { width: "100%", padding: "14px 40px 14px 14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none" },
  eyeButton: { position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" },
  button: { width: "100%", padding: "16px", borderRadius: "12px", border: "none", backgroundColor: PRIMARY, color: "#fff", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginTop: "10px", boxShadow: "0 4px 12px rgba(6, 95, 70, 0.2)" },
  divider: { display: 'flex', alignItems: 'center', margin: '10px 0' },
  dividerText: { fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }
};