import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiPlus, FiSave, FiX, FiTrash2, FiEdit3
} from "react-icons/fi";

const PRIMARY = "#065f46";
const BACKGROUND = "#f9fafb";
const BORDER = "#e5e7eb";

function InvoiceDesign() {
  const navigate = useNavigate();
  
  // --- RESPONSIVE STATE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- DATA STATE ---
  const [profile, setProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const initialFormState = {
    company_name: "",
    company_email: "",
    company_address: "",
    company_gst: "",
    parent_company: "",
    bank_ifsc: "UTIB0001380",
    bank_acc_no: "920020057250778",
    bank_name: "AXIS BANK BASHEERBAGH",
    terms: "1) Goods once sold will not be taken back or exchanged\n2) Payments terms: 100% advance payments\n3) Once placed order cannot be cancelled\n4) All legal matters are subject to Hyderabad jurisdiction only\n5) Delivery lead time 3-5 working days"
  };

  const [formData, setFormData] = useState(initialFormState);

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  // --- EFFECTS ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    
    fetchProfile();
    fetchCompanies();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- DATA FETCHING ---
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  };

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching companies:", error);
    else setCompanies(data || []);
  };

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditId(null);
    setShowModal(true);
  };

  const handleEdit = (company) => {
    setFormData({
      company_name: company.company_name,
      company_email: company.company_email || "",
      company_address: company.company_address,
      company_gst: company.company_gst,
      parent_company: company.parent_company,
      bank_ifsc: company.bank_ifsc,
      bank_acc_no: company.bank_acc_no,
      bank_name: company.bank_name,
      terms: company.terms
    });
    setIsEditing(true);
    setEditId(company.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.company_name) {
      alert("Company Name is required");
      return;
    }
    setLoading(true);
    try {
      let error;
      if (isEditing) {
        const { error: updateError } = await supabase
          .from("companies")
          .update(formData)
          .eq("id", editId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("companies")
          .insert([{ ...formData, franchise_id: profile?.franchise_id || 'CENTRAL' }]);
        error = insertError;
      }

      if (error) throw error;
      alert(isEditing ? "Updated Successfully!" : "Saved Successfully!");
      setShowModal(false);
      fetchCompanies(); 
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure? This cannot be undone.")) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) fetchCompanies();
  };

  const filteredCompanies = companies.filter(c => 
    c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      
      {/* --- STICKY HEADER --- */}
      <nav style={styles.header}>
        {/* Left: Back Button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
                <FiArrowLeft size={isMobile ? 16 : 18} /> 
                {/* FIXED: Text is now ALWAYS visible */}
                <span style={{ marginLeft: '6px', fontSize: isMobile ? '12px' : '14px' }}>Back</span>
            </button>
        </div>
        
        {/* Center: Title */}
        <div style={{ flex: 2, textAlign: 'center' }}>
            <h1 style={{ 
                ...styles.heading, 
                fontSize: isMobile ? '14px' : '20px' // Responsive Font Size
            }}>
                Design Invoice
            </h1>
        </div>
        
        {/* Right: ID Box */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
             <div style={styles.idBox}>
                {/* FIXED: Label is now ALWAYS visible */}
                <span style={{ ...styles.idLabel, fontSize: isMobile ? '10px' : '11px' }}>ID :</span>
                <span style={{ ...styles.idValue, fontSize: isMobile ? '10px' : '12px', padding: isMobile ? '4px 8px' : '6px 12px' }}>
                    {profile?.franchise_id || "..."}
                </span>
            </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div style={{
          ...styles.container,
          padding: isMobile ? "20px" : "40px"
      }}>
        
        {/* --- ACTION BAR --- */}
        <div style={{
            ...styles.actionBar,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center'
        }}>
            {/* Search */}
            <div style={styles.searchContainer}>
                <FiSearch style={styles.searchIcon} />
                <input 
                    placeholder="Search Company..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.searchInput} 
                />
            </div>

            {/* Date & Add Button Group */}
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                <div style={styles.dateCard}>
                    <FiCalendar style={{ opacity: 0.6, marginRight: '8px' }} /> 
                    <span>{today}</span>
                </div>

                <button onClick={handleAddNew} style={styles.addBtn}>
                    <FiPlus size={18} /> <span style={{ marginLeft: '6px' }}>Add New</span>
                </button>
            </div>
        </div>

        {/* --- GRID OF CARDS --- */}
        <div style={styles.grid}>
            {filteredCompanies.map((item) => (
                <div key={item.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>{item.company_name}</h3>
                        <div style={styles.cardActions}>
                            <button onClick={() => handleEdit(item)} style={styles.iconBtnBlue} title="Edit">
                                <FiEdit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} style={styles.iconBtnRed} title="Delete">
                                <FiTrash2 size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div style={styles.cardBody}>
                        <p style={styles.cardText}>{item.company_address}</p>
                        {item.company_email && <p style={{...styles.cardText, color: PRIMARY, fontWeight: 500}}>✉️ {item.company_email}</p>}
                        <p style={styles.badge}>GST: {item.company_gst || 'N/A'}</p>
                    </div>

                    <div style={styles.cardFooter}>
                        <div style={styles.footerRow}>
                            <span style={styles.footerLabel}>Parent:</span>
                            <span style={styles.footerValue}>{item.parent_company}</span>
                        </div>
                        <div style={styles.footerRow}>
                            <span style={styles.footerLabel}>Bank:</span>
                            <span style={styles.footerValue}>{item.bank_name}</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {filteredCompanies.length === 0 && (
                <div style={styles.emptyState}>
                    <p>No invoice designs found.</p>
                    <button onClick={handleAddNew} style={{...styles.addBtn, marginTop: '10px'}}>Create Your First Design</button>
                </div>
            )}
        </div>

      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div style={styles.modalOverlay}>
            <div style={{
                ...styles.modalContent,
                width: isMobile ? "95%" : "600px",
                maxHeight: isMobile ? "90vh" : "85vh"
            }}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        {isEditing ? "Edit Invoice Details" : "Add Invoice Details"}
                    </h2>
                    <button onClick={() => setShowModal(false)} style={styles.closeBtn}><FiX size={22} /></button>
                </div>

                <div style={styles.formScroll}>
                    <div style={{
                        ...styles.formGrid,
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"
                    }}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>1) Company Name <span style={{color:'red'}}>*</span></label>
                            <input name="company_name" value={formData.company_name} onChange={handleInputChange} style={styles.input} placeholder="e.g. JKSH Food Enterprises" />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>2) Company Email</label>
                            <input name="company_email" value={formData.company_email} onChange={handleInputChange} style={styles.input} placeholder="billing@company.com" />
                        </div>

                        <div style={styles.inputGroupFull}>
                            <label style={styles.label}>3) Company Address</label>
                            <input name="company_address" value={formData.company_address} onChange={handleInputChange} style={styles.input} placeholder="Full Address with Pincode" />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>4) GSTIN</label>
                            <input name="company_gst" value={formData.company_gst} onChange={handleInputChange} style={styles.input} placeholder="36AAAAA0000A1Z5" />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>5) Parent Company</label>
                            <input name="parent_company" value={formData.parent_company} onChange={handleInputChange} style={styles.input} placeholder="TVANAMM or T-LEAF" />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>6) IFSC Code</label>
                            <input name="bank_ifsc" value={formData.bank_ifsc} onChange={handleInputChange} style={styles.input} />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>7) Account Number</label>
                            <input name="bank_acc_no" value={formData.bank_acc_no} onChange={handleInputChange} style={styles.input} />
                        </div>

                        <div style={styles.inputGroupFull}>
                            <label style={styles.label}>8) Bank Name</label>
                            <input name="bank_name" value={formData.bank_name} onChange={handleInputChange} style={styles.input} />
                        </div>

                        <div style={styles.inputGroupFull}>
                            <label style={styles.label}>9) Terms & Conditions</label>
                            <textarea name="terms" value={formData.terms} onChange={handleInputChange} style={styles.textarea} />
                        </div>
                    </div>
                </div>

                <div style={styles.modalFooter}>
                    <button onClick={handleSave} disabled={loading} style={styles.saveBtn}>
                        {loading ? "Saving..." : <><FiSave size={18} style={{ marginRight: '8px' }} /> {isEditing ? "UPDATE DETAILS" : "SAVE DETAILS"}</>}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// --- PRODUCTION READY STYLES ---
const styles = {
  page: { minHeight: "100vh", background: BACKGROUND, fontFamily: '"Inter", sans-serif', color: '#1f2937' },
  container: { maxWidth: "1200px", margin: "0 auto" },
  
  // Header
  header: { 
    display: "flex", alignItems: "center", padding: "12px 24px", 
    background: "#fff", borderBottom: `1px solid ${BORDER}`, 
    position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  backBtn: { 
    display: "flex", alignItems: "center", border: "none", background: "transparent", 
    cursor: "pointer", fontWeight: "600", color: "#4b5563", 
    padding: '8px 0px', borderRadius: '8px', transition: 'background 0.2s', whiteSpace: 'nowrap'
  },
  heading: { fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.02em", color: "#111827", margin: 0 },
  idBox: { display: "flex", alignItems: "center", gap: "6px" },
  idLabel: { fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" },
  idValue: { 
    background: "#f3f4f6", borderRadius: "6px", 
    fontWeight: "800", color: "#111827", border: `1px solid ${BORDER}` 
  },

  // Action Bar
  actionBar: { display: "flex", gap: "16px", marginBottom: "24px" },
  searchContainer: { flex: 1, position: "relative" },
  searchIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: { 
    width: "100%", padding: "12px 12px 12px 42px", borderRadius: "10px", 
    border: `1px solid ${BORDER}`, fontSize: "14px", outline: "none", 
    fontWeight: "500", background: '#fff', transition: 'border 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  
  dateCard: { 
    display: "flex", alignItems: "center", background: "#fff", padding: "0 16px", 
    borderRadius: "10px", border: `1px solid ${BORDER}`, fontSize: "13px", 
    fontWeight: "600", color: "#374151", height: '44px', whiteSpace: 'nowrap' 
  },
  
  addBtn: { 
    background: PRIMARY, color: "#fff", border: "none", padding: "0 20px", 
    borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", 
    display: "flex", alignItems: "center", justifyContent: 'center', height: '44px', 
    boxShadow: "0 4px 6px -1px rgba(6, 95, 70, 0.2)", transition: 'transform 0.1s'
  },

  // Grid & Cards
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  card: { 
    background: "#fff", borderRadius: "16px", padding: "20px", 
    border: `1px solid ${BORDER}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" },
  cardTitle: { margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827", lineHeight: 1.3 },
  cardActions: { display: 'flex', gap: '8px' },
  
  iconBtnBlue: { background: "#eff6ff", color: "#2563eb", border: "none", width: '32px', height: '32px', borderRadius: "8px", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBtnRed: { background: "#fef2f2", color: "#ef4444", border: "none", width: '32px', height: '32px', borderRadius: "8px", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center' },

  cardBody: { flex: 1 },
  cardText: { fontSize: "13px", color: "#4b5563", marginBottom: "6px", lineHeight: "1.5" },
  badge: { 
    display: 'inline-block', fontSize: "11px", color: "#4b5563", fontWeight: "600", 
    background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', marginTop: '8px' 
  },

  cardFooter: { marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' },
  footerRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' },
  footerLabel: { color: '#9ca3af', fontWeight: '500' },
  footerValue: { color: '#374151', fontWeight: '600' },

  emptyState: { gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#9ca3af', background: '#fff', borderRadius: '16px', border: `1px dashed ${BORDER}` },

  // Modal
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: 'blur(4px)', display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: "10px" },
  modalContent: { background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: 'flex', flexDirection: 'column' },
  modalHeader: { padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" },
  modalTitle: { fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', color: '#111827', margin: 0 },
  closeBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", transition: 'color 0.2s' },
  
  formScroll: { padding: "24px", overflowY: "auto" },
  formGrid: { display: "grid", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  inputGroupFull: { display: "flex", flexDirection: "column", gap: "6px", gridColumn: "1 / -1" },
  label: { fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#374151", letterSpacing: "0.02em" },
  input: { padding: "12px", borderRadius: "8px", border: `1px solid ${BORDER}`, fontSize: "14px", outline: "none", width: "100%", fontWeight: "500", transition: 'border-color 0.2s', color: '#111827' },
  textarea: { padding: "12px", borderRadius: "8px", border: `1px solid ${BORDER}`, fontSize: "14px", outline: "none", width: "100%", fontWeight: "500", height: '100px', resize: 'vertical', fontFamily: 'inherit', color: '#111827' },
  
  modalFooter: { padding: "20px 24px", borderTop: `1px solid ${BORDER}`, background: "#f9fafb" },
  saveBtn: { width: "100%", padding: "14px", background: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.05em", transition: 'opacity 0.2s' }
};

export default InvoiceDesign;