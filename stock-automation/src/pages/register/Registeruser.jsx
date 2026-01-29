import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, ArrowLeft, MapPin, Building2, User, Phone, Mail, KeyRound, Sparkles, Map, Fingerprint } from "lucide-react";

// --- CONSTANTS ---
const PRIMARY = "#065f46";
const PRIMARY_LIGHT = "rgba(6, 95, 70, 0.08)";
const BORDER = "#e2e8f0";
const TEXT_MAIN = "#1e293b";
const TEXT_MUTED = "#64748b";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Jammu and Kashmir", "Ladakh"
];

const InputGroup = ({ icon: Icon, children, isFocused, label }) => (
  <div style={{ width: "100%" }}>
    {label && <label style={styles.inputLabel}>{label}</label>}
    <div style={{
      display: "flex",
      alignItems: "center",
      border: `1.5px solid ${isFocused ? PRIMARY : BORDER}`,
      borderRadius: "10px",
      padding: "0 12px",
      background: isFocused ? "#fff" : "#fcfcfd",
      transition: "all 0.2s ease",
      boxShadow: isFocused ? `0 0 0 3px ${PRIMARY_LIGHT}` : "none",
      height: "44px" 
    }}>
      {Icon && <Icon size={16} color={isFocused ? PRIMARY : TEXT_MUTED} style={{ minWidth: "16px", marginRight: "10px" }} />}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  </div>
);

function RegisterUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [adminId, setAdminId] = useState("..."); 
  const [suggestedId, setSuggestedId] = useState("");

  const [formData, setFormData] = useState({
    company: "", franchise_id: "", name: "", phone: "", email: "",
    password: "", branch_location: "", role: "franchise", country: "India",
    state: "", city: "", pincode: "", addressLine: ""
  });

  useEffect(() => {
    const getAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).maybeSingle();
        if (data) setAdminId(data.franchise_id);
      }
    };
    getAdminProfile();
  }, []);

  useEffect(() => {
    const fetchNextId = async () => {
      if (!formData.company) {
        setSuggestedId("");
        return;
      }
      let prefix = formData.company === "T vanamm" ? "TV-" : "TL-";
      try {
        const { data } = await supabase.from('profiles').select('franchise_id').eq('company', formData.company);
        let maxNum = 0;
        if (data) {
            data.forEach(item => {
                const match = item.franchise_id.match(/\d+$/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
        }
        setSuggestedId(`${prefix}${maxNum + 1}`);
      } catch (err) { console.error(err); }
    };
    fetchNextId();
  }, [formData.company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const applySuggestion = () => {
    setFormData(prev => ({ ...prev, franchise_id: suggestedId }));
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
        const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: formData.email.trim(),
            password: formData.password,
        });
        if (authError) throw authError;

        await supabase.from("profiles").insert([{
            id: authData.user.id,
            company: formData.company,
            franchise_id: formData.franchise_id.trim(),
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim().toLowerCase(),
            branch_location: formData.branch_location.trim(),
            address: formData.addressLine.trim(), 
            city: formData.city.trim().toUpperCase(),
            state: formData.state,
            pincode: formData.pincode.trim(),
            role: "franchise",
            country: "India"
        }]);
        alert("Account Created!");
        navigate(-1);
    } catch (err) {
        alert(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* --- INDUSTRY STANDARD HEADER --- */}
      <div style={styles.headerBar}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
            <ArrowLeft size={18} style={{ marginRight: "6px" }} />
            <span>Back</span>
        </button>

        <div style={styles.headerTextContainer}>
            <h1 style={styles.title}>Create Account</h1>
        </div>

        <div style={styles.idContainer}>
            <span style={styles.idLabel}>ID :</span>
            <div style={styles.idBox}>
                {adminId}
            </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.formCard}>
          
          {/* SECTION 1: BRAND & IDENTITY */}
          <div style={styles.sectionHeader}>
            <Building2 size={18} color={PRIMARY} />
            <h2 style={styles.sectionTitle}>Brand & Identity</h2>
          </div>
          
          <div style={styles.gridRowThree}>
            <InputGroup isFocused={focusedField === "company"} label="Select Brand">
              <select name="company" value={formData.company} onChange={handleChange} style={styles.selectInput}
                onFocus={() => setFocusedField("company")} onBlur={() => setFocusedField(null)}>
                <option value="">Choose...</option>
                <option value="T vanamm">T vanamm</option>
                <option value="T leaf">T leaf</option>
              </select>
            </InputGroup>

            <div style={styles.suggestionWrapper}>
                <label style={styles.inputLabel}>Suggested ID</label>
                <div style={styles.suggestionBox} onClick={applySuggestion}>
                    <Sparkles size={14} style={{ marginRight: '6px' }} />
                    {suggestedId || "Waiting..."}
                </div>
            </div>

            <InputGroup isFocused={focusedField === "franchise_id"} label="Confirm ID">
              <input name="franchise_id" value={formData.franchise_id} placeholder="e.g. TV-10" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("franchise_id")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
          </div>

          <div style={styles.divider}></div>

          {/* SECTION 2: OWNER & SECURITY */}
          <div style={styles.sectionHeader}>
            <User size={18} color={PRIMARY} />
            <h2 style={styles.sectionTitle}>Account Information</h2>
          </div>

          <div style={styles.gridRowTwo}>
            <InputGroup icon={User} isFocused={focusedField === "name"} label="Owner Full Name">
              <input name="name" value={formData.name} placeholder="Enter name" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
            <InputGroup icon={Phone} isFocused={focusedField === "phone"} label="Phone Number">
              <input name="phone" value={formData.phone} placeholder="+91" type="tel" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
          </div>

          <div style={styles.gridRowTwo}>
            <InputGroup icon={Mail} isFocused={focusedField === "email"} label="Email Address">
              <input name="email" value={formData.email} type="email" placeholder="email@domain.com" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
            <InputGroup icon={KeyRound} isFocused={focusedField === "password"} label="Asign Password">
               <input name="password" value={formData.password} type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange} style={styles.cleanInput}
                  onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </InputGroup>
          </div>

          <div style={styles.divider}></div>

          {/* SECTION 3: LOCATION DETAILS */}
          <div style={styles.sectionHeader}>
            <MapPin size={18} color={PRIMARY} />
            <h2 style={styles.sectionTitle}>Location Details</h2>
          </div>

          <div style={styles.gridRowTwo}>
             <InputGroup isFocused={focusedField === "branch_location"} label="Branch Name">
              <input name="branch_location" value={formData.branch_location} placeholder="e.g. Madhapur" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("branch_location")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
            <InputGroup icon={Map} isFocused={focusedField === "addressLine"} label="Street Address">
              <input name="addressLine" value={formData.addressLine} placeholder="Door No, Building, Street..." onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("addressLine")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
          </div>

          <div style={styles.gridRowThree}>
            <InputGroup isFocused={focusedField === "city"} label="City">
              <input name="city" value={formData.city} placeholder="City" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("city")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
            <InputGroup isFocused={focusedField === "state"} label="State">
              <select name="state" value={formData.state} onChange={handleChange} style={styles.selectInput}
                onFocus={() => setFocusedField("state")} onBlur={() => setFocusedField(null)}>
                <option value="">Select...</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </InputGroup>
            <InputGroup isFocused={focusedField === "pincode"} label="Pincode">
              <input name="pincode" value={formData.pincode} placeholder="######" maxLength={6} onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("pincode")} onBlur={() => setFocusedField(null)} />
            </InputGroup>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={styles.button}>
            {loading ? "Processing..." : "Create Franchise Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterUser;

const styles = {
  pageContainer: { height: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: '"Inter", sans-serif' },
  headerBar: { height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", backgroundColor: "#fff", borderBottom: `1px solid ${BORDER}`, position: "relative" },
  headerTextContainer: { position: "absolute", left: "50%", transform: "translateX(-50%)" },
  backButton: { background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", fontWeight: "600", color: TEXT_MAIN, fontSize: "14px" },
  title: { fontSize: "18px", fontWeight: "700", color: TEXT_MAIN, margin: 0 },
  idContainer: { display: "flex", alignItems: "center", gap: "10px" },
  idLabel: { fontSize: "14px", fontWeight: "600", color: TEXT_MUTED },
  idBox: { padding: "6px 14px", border: `1.5px solid ${PRIMARY}`, borderRadius: "8px", color: PRIMARY, fontWeight: "700", fontFamily: "monospace", fontSize: "14px" },
  mainContent: { flex: 1, padding: "24px", overflowY: "auto" },
  formCard: { display: "flex", flexDirection: "column", padding: "40px", maxWidth: "900px", width: "100%", margin: "0 auto", gap: "20px", backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${BORDER}` },
  sectionHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", marginTop: "10px" },
  sectionTitle: { fontSize: "14px", fontWeight: "700", color: TEXT_MAIN, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 },
  inputLabel: { fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" },
  suggestionWrapper: { width: "100%" },
  suggestionBox: { height: "44px", display: "flex", alignItems: "center", padding: "0 12px", backgroundColor: "#f0fdf4", border: `1.5px dashed ${PRIMARY}`, borderRadius: "10px", color: PRIMARY, fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  gridRowTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  gridRowThree: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" },
  cleanInput: { width: "100%", border: "none", outline: "none", fontSize: "14px", background: "transparent", color: TEXT_MAIN },
  selectInput: { width: "100%", border: "none", outline: "none", fontSize: "14px", background: "transparent", cursor: "pointer", color: TEXT_MAIN },
  eyeButton: { background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED },
  divider: { height: "1px", backgroundColor: BORDER, margin: "10px 0" },
  button: { width: "100%", padding: "16px", borderRadius: "12px", border: "none", backgroundColor: PRIMARY, color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer", marginTop: "20px", boxShadow: "0 4px 12px rgba(6, 95, 70, 0.2)" }
};