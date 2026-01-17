import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, 
  Lock, 
  LogOut, 
  ShieldCheck, 
  Smartphone, 
  Bell, 
  Globe,
  X,
  Eye,
  EyeOff,
  MessageSquareText
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function CentralSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      alert("Security Key updated successfully");
      setNewPassword("");
      setActiveModal(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div style={{...styles.page, overflow: isMobile ? 'auto' : 'hidden'}}>
      <div style={styles.container}>
        
        {/* HEADER AREA */}
        <header style={{...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0'}}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          </div>
          <h1 style={{...styles.centerTitle, position: isMobile ? 'static' : 'absolute', transform: isMobile ? 'none' : 'translateX(-50%)'}}>
            SETTINGS
          </h1>
          <div style={styles.headerRight}></div>
        </header>

        {/* 3x2 GRID SYSTEM */}
        <div style={{
          ...styles.grid, 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
          height: isMobile ? 'auto' : '62vh'
        }}>
          
          <ActionCard 
            icon={<Lock size={isMobile ? 24 : 28}/>} 
            title="Password" 
            onClick={() => setActiveModal("password")} 
            isMobile={isMobile}
          />

          <ActionCard 
            icon={<MessageSquareText size={isMobile ? 24 : 28}/>} 
            title="Franchise Replies" 
            onClick={() => navigate("/central/replies")} 
            isMobile={isMobile}
          />

          <ActionCard 
            icon={<LogOut size={isMobile ? 24 : 28}/>} 
            title="Logout" 
            onClick={handleLogout} 
            isMobile={isMobile}
            color="#ef4444"
          />

          <DisabledCard icon={<Bell size={isMobile ? 24 : 28}/>} title="Alerts" />
          <DisabledCard icon={<Smartphone size={isMobile ? 24 : 28}/>} title="Devices" />
          <DisabledCard icon={<Globe size={isMobile ? 24 : 28}/>} title="Language" />
          
        </div>
      </div>

      {/* POPUP MODAL */}
      {activeModal === "password" && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '92%' : '420px'}}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalHeading}>Change Password</h3>
              <button onClick={() => setActiveModal(null)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>New Security Key</label>
                <div style={styles.passwordWrapper}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      style={styles.input} 
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={styles.eyeBtn}
                    >
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>
              </div>
              
              <button 
                onClick={handleChangePassword} 
                disabled={loading} 
                style={{...styles.saveBtn, opacity: loading ? 0.7 : 1}}
              >
                {loading ? "UPDATING..." : "CONFIRM UPDATE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================
   SUB-COMPONENTS
====================== */

const ActionCard = ({ icon, title, onClick, isMobile, color }) => (
  <div 
    onClick={onClick}
    style={{...styles.card, padding: isMobile ? '25px 20px' : '0 40px'}}
    onMouseEnter={e => { if(!isMobile) { e.currentTarget.style.borderColor = color || PRIMARY; e.currentTarget.style.transform = "translateY(-4px)"; } }}
    onMouseLeave={e => { if(!isMobile) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = "translateY(0)"; } }}
  >
    <div style={{...styles.cardIcon, color: color || PRIMARY}}>{icon}</div>
    <div style={styles.cardContent}>
      <h2 style={{...styles.cardTitle, fontSize: isMobile ? '16px' : '18px'}}>{title}</h2>
    </div>
  </div>
);

const DisabledCard = ({ icon, title }) => (
  <div style={{...styles.card, opacity: 0.4, cursor: 'not-allowed', padding: '0 40px'}}>
    <div style={{...styles.cardIcon, color: '#9ca3af', background: '#f3f4f6'}}>{icon}</div>
    <h2 style={{...styles.cardTitle, color: '#9ca3af', fontSize: '18px'}}>{title}</h2>
  </div>
);

const styles = {
  page: { background: "#fff", minHeight: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  container: { maxWidth: "1200px", width: '100%', margin: "0 auto", padding: "60px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", position: "relative" },
  headerLeft: { width: '120px' },
  headerRight: { width: '120px' },
  centerTitle: { fontSize: "24px", fontWeight: "900", letterSpacing: "-1px", margin: 0, left: "50%", color: "#000" },
  backBtn: { display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  
  grid: { display: "grid", gap: "20px", width: "100%" },
  card: { display: "flex", alignItems: "center", background: "#fff", borderRadius: "20px", border: `1.5px solid ${BORDER}`, transition: "all 0.3s ease", cursor: 'pointer' },
  cardIcon: { width: "56px", height: "56px", background: "rgba(6, 95, 70, 0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "18px" },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "800", margin: 0, color: "#000", letterSpacing: "-0.5px" },
  
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: "#fff", borderRadius: "24px", padding: "35px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  modalHeading: { fontSize: "18px", fontWeight: "900", margin: 0, color: "#000" },
  modalBody: { display: "flex", flexDirection: "column", gap: "15px" },
  
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  inputLabel: { fontSize: "10px", fontWeight: "900", color: "#9ca3af", textTransform: 'uppercase', letterSpacing: "0.5px" },
  passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, outline: "none", fontSize: "14px", background: '#f9fafb', color: "#000", fontWeight: "600" },
  eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' },
  
  saveBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "14px", marginTop: "10px" },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", color: PRIMARY }
};

export default CentralSettings;