import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  FileText, 
  CreditCard, 
  Percent, 
  Calculator, 
  Send, 
  Lock,
  X,
  CheckCircle2
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function Accounts() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 

  const [invoiceSettings, setInvoiceSettings] = useState({ gstin: "", email: "", phone: "", address: "", terms: "" });
  const [bankDetails, setBankDetails] = useState({ accountName: "", bankName: "", accountNumber: "", ifsc: "" });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data } = await supabase.from("accounts").select("*").eq("created_by", session.user.id).maybeSingle();
      if (data) {
        setInvoiceSettings({ gstin: data.gstin ?? "", email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "", terms: data.terms ?? "" });
        setBankDetails({ accountName: data.account_name ?? "", bankName: data.bank_name ?? "", accountNumber: data.account_number ?? "", ifsc: data.ifsc ?? "" });
      }
      setLoading(false);
    };
    load();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      created_by: user.id, updated_at: new Date(),
      ...invoiceSettings,
      account_name: bankDetails.accountName, bank_name: bankDetails.bankName,
      account_number: bankDetails.accountNumber, ifsc: bankDetails.ifsc
    };
    await supabase.from("accounts").upsert(payload, { onConflict: "created_by" });
    setSaving(false);
    setActiveModal(null);
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={{...styles.page, overflow: isMobile ? 'auto' : 'hidden'}}>
      <div style={styles.container}>
        
        {/* HEADER AREA - With top spacing */}
        <header style={{...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0'}}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          </div>
          <h1 style={{...styles.centerTitle, position: isMobile ? 'static' : 'absolute', transform: isMobile ? 'none' : 'translateX(-50%)'}}>
            ACCOUNTS
          </h1>
          <div style={styles.headerRight}></div>
        </header>

        {/* 3x2 GRID - Scaled down for better fit */}
        <div style={{
          ...styles.grid, 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
          height: isMobile ? 'auto' : '62vh'
        }}>
          <ActionCard 
            icon={<FileText size={isMobile ? 24 : 28}/>} 
            title="Invoicing" 
            onClick={() => setActiveModal("invoice")} 
            active={!!invoiceSettings.gstin}
            isMobile={isMobile}
          />
          <ActionCard 
            icon={<CreditCard size={isMobile ? 24 : 28}/>} 
            title="Bank Details" 
            onClick={() => setActiveModal("bank")} 
            active={!!bankDetails.accountNumber}
            isMobile={isMobile}
          />
          <DisabledCard icon={<Percent size={isMobile ? 24 : 28}/>} title="Item GST" />
          <DisabledCard icon={<Calculator size={isMobile ? 24 : 28}/>} title="Taxation" />
          <DisabledCard icon={<Send size={isMobile ? 24 : 28}/>} title="Payouts" />
          <DisabledCard icon={<Lock size={isMobile ? 24 : 28}/>} title="Security" />
        </div>
      </div>

      {/* POPUP MODAL */}
      {activeModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '92%' : '460px'}}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalHeading}>
                {activeModal === "invoice" ? "Invoice Settings" : "Banking Information"}
              </h3>
              <button onClick={() => setActiveModal(null)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            <div style={styles.modalBody}>
              {activeModal === "invoice" ? (
                <div style={styles.formGrid}>
                  <FormInput label="GST Identifier" value={invoiceSettings.gstin} onChange={v => setInvoiceSettings({...invoiceSettings, gstin: v})} />
                  <FormInput label="Support Email" value={invoiceSettings.email} onChange={v => setInvoiceSettings({...invoiceSettings, email: v})} />
                  <FormInput label="Business Address" textarea value={invoiceSettings.address} onChange={v => setInvoiceSettings({...invoiceSettings, address: v})} />
                </div>
              ) : (
                <div style={styles.formGrid}>
                  <FormInput label="Account Holder" value={bankDetails.accountName} onChange={v => setBankDetails({...bankDetails, accountName: v})} />
                  <FormInput label="Bank Name" value={bankDetails.bankName} onChange={v => setBankDetails({...bankDetails, bankName: v})} />
                  <FormInput label="Account Number" value={bankDetails.accountNumber} onChange={v => setBankDetails({...bankDetails, accountNumber: v})} />
                  <FormInput label="IFSC Code" value={bankDetails.ifsc} onChange={v => setBankDetails({...bankDetails, ifsc: v})} />
                </div>
              )}
              <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ActionCard = ({ icon, title, onClick, active, isMobile }) => (
  <div 
    onClick={onClick}
    style={{...styles.card, padding: isMobile ? '25px 20px' : '0 30px'}}
    onMouseEnter={e => { if(!isMobile) { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.transform = "translateY(-4px)"; } }}
    onMouseLeave={e => { if(!isMobile) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = "translateY(0)"; } }}
  >
    <div style={styles.cardIcon}>{icon}</div>
    <div style={styles.cardContent}>
      <h2 style={{...styles.cardTitle, fontSize: isMobile ? '16px' : '18px'}}>{title}</h2>
      {active && <CheckCircle2 size={18} color={PRIMARY} />}
    </div>
  </div>
);

const DisabledCard = ({ icon, title }) => (
  <div style={{...styles.card, opacity: 0.5, cursor: 'not-allowed', padding: '0 30px'}}>
    <div style={{...styles.cardIcon, color: '#9ca3af', background: '#f3f4f6'}}>{icon}</div>
    <h2 style={{...styles.cardTitle, color: '#9ca3af', fontSize: '18px'}}>{title}</h2>
  </div>
);

const FormInput = ({ label, value, onChange, textarea }) => (
  <div style={styles.inputGroup}>
    <label style={styles.inputLabel}>{label}</label>
    {textarea ? (
      <textarea style={{...styles.input, height: '80px', resize: 'none'}} value={value} onChange={e => onChange(e.target.value)} />
    ) : (
      <input style={styles.input} value={value} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);

const styles = {
  page: { background: "#fff", minHeight: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  container: { maxWidth: "1200px", width: '100%', margin: "0 auto", padding: "60px 40px" }, // Added more top padding (60px)
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", position: "relative" },
  headerLeft: { width: '120px' },
  headerRight: { width: '120px' },
  centerTitle: { fontSize: "24px", fontWeight: "900", letterSpacing: "-1px", margin: 0, left: "50%", color: "#000" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  grid: { display: "grid", gap: "20px", width: "100%" },
  card: { display: "flex", alignItems: "center", background: "#fff", borderRadius: "20px", border: `1.5px solid ${BORDER}`, transition: "all 0.3s ease", cursor: 'pointer' },
  cardIcon: { width: "56px", height: "56px", background: "rgba(6, 95, 70, 0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, marginRight: "18px" },
  cardContent: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontWeight: "800", margin: 0, color: "#000", letterSpacing: "-0.5px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: "#fff", borderRadius: "24px", padding: "30px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  modalHeading: { fontSize: "18px", fontWeight: "900", margin: 0, color: "#000", letterSpacing: "-0.4px" },
  modalBody: { display: "flex", flexDirection: "column", gap: "15px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "4px" },
  inputLabel: { fontSize: "10px", fontWeight: "900", color: "#9ca3af", textTransform: 'uppercase', letterSpacing: "0.5px" },
  input: { padding: "12px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, outline: "none", fontSize: "14px", background: '#f9fafb', color: "#000", fontWeight: "500" },
  saveBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "14px", marginTop: "10px" },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", color: PRIMARY }
};

export default Accounts;