import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, ArrowLeft, UserPlus, MapPin, Building2, User, Phone, Mail, KeyRound } from "lucide-react";

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

// --- COMPACT INPUT GROUP ---
const InputGroup = ({ icon: Icon, children, isFocused }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    border: `1px solid ${isFocused ? PRIMARY : BORDER}`,
    borderRadius: "8px",
    padding: "0 10px",
    background: "#fff",
    transition: "all 0.2s ease",
    boxShadow: isFocused ? `0 0 0 2px ${PRIMARY_LIGHT}` : "none",
    width: "100%",
    height: "42px" // Fixed Compact Height
  }}>
    {Icon && <Icon size={16} color={isFocused ? PRIMARY : TEXT_MUTED} style={{ minWidth: "16px", marginRight: "8px" }} />}
    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{children}</div>
  </div>
);

function RegisterUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const textareaRef = useRef(null);
  
  const isMobile = window.innerWidth < 768;

  const [formData, setFormData] = useState({
    company: "", franchise_id: "", name: "", phone: "", email: "",
    password: "", branch_location: "", role: "franchise", country: "India",
    state: "", city: "", pincode: "", addressLine: ""
  });

  // --- AUTO-FETCH FRANCHISE ID ---
  useEffect(() => {
    const fetchNextId = async () => {
      if (!formData.company) {
        setFormData(prev => ({ ...prev, franchise_id: "" }));
        return;
      }

      // 1. Determine Prefix
      let prefix = "";
      if (formData.company === "T vanamm") prefix = "TV-";
      else if (formData.company === "T leaf") prefix = "TL-";

      // Set prefix immediately (loading state)
      setFormData(prev => ({ ...prev, franchise_id: prefix + "..." }));

      try {
        // 2. Query DB for latest ID for this company
        const { data, error } = await supabase
          .from('profiles')
          .select('franchise_id')
          .eq('company', formData.company)
          .order('created_at', { ascending: false }) // Get the newest one
          .limit(1);

        if (error) throw error;

        let nextNum = 1; // Default if no users exist

        if (data && data.length > 0 && data[0].franchise_id) {
            const lastId = data[0].franchise_id;
            // Extract number from string (e.g. "TV-12" -> 12)
            const match = lastId.match(/(\d+)$/);
            if (match) {
                nextNum = parseInt(match[0], 10) + 1;
            }
        }

        // 3. Set the new ID
        setFormData(prev => ({ ...prev, franchise_id: `${prefix}${nextNum}` }));

      } catch (err) {
        console.error("Error generating ID:", err);
        // Fallback to just prefix if error
        setFormData(prev => ({ ...prev, franchise_id: prefix }));
      }
    };

    fetchNextId();
  }, [formData.company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "franchise_id") {
      let prefix = "";
      if (formData.company === "T vanamm") prefix = "TV-";
      else if (formData.company === "T leaf") prefix = "TL-";
      // Allow user to edit, but enforce prefix start
      if (prefix && !value.startsWith(prefix)) return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleAddressChange = (e) => {
    handleChange(e);
    e.target.style.height = "inherit";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleSubmit = async () => {
    if (loading) return;

    // --- VALIDATION ---
    const { email, password, company, franchise_id, name, city, state } = formData;
    if (!email || !password || !company || !franchise_id || !name || !city || !state) {
        alert("Please fill in all mandatory fields.");
        return;
    }

    setLoading(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentRole = session?.user?.app_metadata?.role;

        if (currentRole !== 'central') {
            alert("Permission denied. You must be a Central Admin.");
            setLoading(false);
            return;
        }

        const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
        });

        if (authError) throw authError;

        const { error: profileError } = await supabase.from("profiles").insert([{
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
        }]);

        if (profileError) throw profileError;

        alert(`✅ Account created! ID: ${formData.franchise_id}`);
        setFormData({
            company: "", franchise_id: "", name: "", phone: "", email: "",
            password: "", branch_location: "", role: "franchise", country: "India",
            state: "", city: "", pincode: "", addressLine: ""
        });

    } catch (err) {
        console.error("Registration failed:", err.message);
        alert("Error: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      
      {/* --- HEADER --- */}
      <div style={styles.headerBar}>
        
        {/* Left Button */}
        <button onClick={() => navigate(-1)} style={styles.backButton}>
            <ArrowLeft size={18} />
        </button>

        {/* Center Title (Absolute Positioned) */}
        <div style={styles.headerTextContainer}>
            <h1 style={styles.title}>Create Account</h1>
          </div>


      </div>

      {/* --- FORM CARD --- */}
      <div style={styles.formCard}>
        
        {/* ROW 1 */}
        <div style={styles.gridRowThree}>
           <InputGroup icon={Building2} isFocused={focusedField === "company"}>
            <select name="company" value={formData.company} onChange={handleChange} style={styles.selectInput}
              onFocus={() => setFocusedField("company")} onBlur={() => setFocusedField(null)}>
              <option value="">Brand</option>
              <option value="T vanamm">T vanamm</option>
              <option value="T leaf">T leaf</option>
            </select>
          </InputGroup>

          <InputGroup isFocused={focusedField === "franchise_id"}>
            <input name="franchise_id" value={formData.franchise_id} placeholder="Franchise ID" onChange={handleChange} style={styles.cleanInput}
              onFocus={() => setFocusedField("franchise_id")} onBlur={() => setFocusedField(null)} />
          </InputGroup>

          <InputGroup isFocused={focusedField === "branch_location"}>
            <input name="branch_location" value={formData.branch_location} placeholder="Branch Location" onChange={handleChange} style={styles.cleanInput}
              onFocus={() => setFocusedField("branch_location")} onBlur={() => setFocusedField(null)} />
          </InputGroup>
        </div>

        {/* ROW 2 */}
        <div style={styles.gridRowTwo}>
          <InputGroup icon={User} isFocused={focusedField === "name"}>
            <input name="name" value={formData.name} placeholder="Owner Full Name" onChange={handleChange} style={styles.cleanInput}
              onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
          </InputGroup>
          <InputGroup icon={Phone} isFocused={focusedField === "phone"}>
            <input name="phone" value={formData.phone} placeholder="Phone Number" type="tel" onChange={handleChange} style={styles.cleanInput}
              onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
          </InputGroup>
        </div>

        {/* ROW 3 */}
        <div style={styles.gridRowTwo}>
          <InputGroup icon={Mail} isFocused={focusedField === "email"}>
            <input name="email" value={formData.email} type="email" placeholder="Email Address" onChange={handleChange} style={styles.cleanInput}
              onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
          </InputGroup>
          <InputGroup icon={KeyRound} isFocused={focusedField === "password"}>
             <input name="password" value={formData.password} type={showPassword ? "text" : "password"} placeholder="Password" onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
          </InputGroup>
        </div>

        {/* DIVIDER */}
        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>ADDRESS</span>
          <div style={styles.dividerLine}></div>
        </div>

        {/* ROW 4 */}
        <div style={styles.gridRowThree}>
          <InputGroup icon={MapPin} isFocused={focusedField === "pincode"}>
             <input name="pincode" value={formData.pincode} placeholder="Pincode" type="tel" maxLength={6} onChange={handleChange} style={styles.cleanInput}
                onFocus={() => setFocusedField("pincode")} onBlur={() => setFocusedField(null)} />
          </InputGroup>
          
          <InputGroup isFocused={focusedField === "state"}>
             <select name="state" value={formData.state} onChange={handleChange} style={styles.selectInput}
                onFocus={() => setFocusedField("state")} onBlur={() => setFocusedField(null)}>
                <option value="">State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          </InputGroup>

          <InputGroup isFocused={focusedField === "city"}>
             <input 
                name="city" 
                value={formData.city} 
                placeholder="City Name" 
                onChange={handleChange} 
                style={{...styles.cleanInput, textTransform: 'uppercase'}}
                onFocus={() => setFocusedField("city")} 
                onBlur={() => setFocusedField(null)} 
             />
          </InputGroup>
        </div>

        {/* ROW 5: Auto-Expanding Address */}
        <div style={{ marginTop: "12px", minHeight: "42px" }}>
            <textarea 
              ref={textareaRef}
              name="addressLine" 
              value={formData.addressLine} 
              placeholder="Full Address (Start typing to expand...)" 
              onChange={handleAddressChange}
              style={{ 
                ...styles.textAreaInput, 
                borderColor: focusedField === "addressLine" ? PRIMARY : BORDER 
              }}
              onFocus={() => setFocusedField("addressLine")} 
              onBlur={() => setFocusedField(null)}
              rows={1}
            />
        </div>

        {/* SUBMIT BUTTON */}
        <button onClick={handleSubmit} disabled={loading} style={styles.button}>
          {loading ? "Creating..." : "Create Account"}
        </button>

      </div>
    </div>
  );
}

export default RegisterUser;

// --- STYLES ---

const styles = {
  pageContainer: {
    height: "100vh",
    width: "100vw",
    overflow: "hidden", 
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8fafc",
    fontFamily: '"Inter", sans-serif',
  },
  headerBar: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // Pushes items to edges
    padding: "0 20px",
    backgroundColor: "#fff",
    borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
    position: "relative" // Crucial for absolute center
  },
  backButton: {
    background: "transparent",
    border: "none",
    padding: "8px",
    cursor: "pointer",
    color: TEXT_MAIN,
    zIndex: 10 // Ensure clickable above centered text
  },
  headerTextContainer: {
    position: "absolute", // Absolute Centering
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    pointerEvents: "none" // Let clicks pass through if needed
  },
  title: {
    fontSize: "17px",
    fontWeight: "700",
    color: TEXT_MAIN,
    margin: 0
  },
  subtitle: {
    fontSize: "12px",
    color: TEXT_MUTED
  },
  headerRightBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f1f5f9",
    padding: "6px 12px",
    borderRadius: "20px",
    border: `1px solid ${BORDER}`,
    zIndex: 10
  },
  headerRightLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  headerRightValue: {
    fontSize: "12px",
    fontWeight: "700",
    color: PRIMARY,
    fontFamily: "monospace"
  },
  formCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px 20px 20px",
    maxWidth: "800px",
    width: "100%",
    margin: "0 auto",
    gap: "8px"
  },
  gridRowThree: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "10px",
    width: "100%"
  },
  gridRowTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    width: "100%"
  },
  cleanInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "14px",
    background: "transparent",
    color: TEXT_MAIN,
    height: "100%",
    padding: 0
  },
  selectInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "14px",
    background: "transparent",
    color: TEXT_MAIN,
    cursor: "pointer",
    appearance: "none"
  },
  textAreaInput: {
    width: "100%",
    minHeight: "42px",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    padding: "10px",
    fontSize: "14px",
    outline: "none",
    resize: "none",
    fontFamily: '"Inter", sans-serif',
    background: "#fff",
    overflow: "hidden",
    transition: "border-color 0.2s"
  },
  eyeButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: TEXT_MUTED,
    display: "flex",
    alignItems: "center"
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '4px 0',
  },
  dividerLine: {
    height: "1px",
    flex: 1,
    backgroundColor: BORDER
  },
  dividerText: {
    fontSize: '10px',
    fontWeight: '700',
    color: TEXT_MUTED,
    padding: "0 8px"
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: PRIMARY,
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "16px",
    boxShadow: "0 2px 6px rgba(6, 95, 70, 0.15)"
  }
};