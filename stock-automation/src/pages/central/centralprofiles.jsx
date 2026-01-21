import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  X,
  Calendar,
  Trash2,
  Edit2,
  Building2,
  ChevronDown,
  AlertTriangle,
  MapPin
} from "lucide-react";

const PRIMARY = "#065f46";
const ACTION_GREEN = "rgb(0, 100, 55)";
const DANGER_RED = "#dc2626";
const BORDER = "#e5e7eb";

function CentralProfiles() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  
  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);
  
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userFranchiseId, setUserFranchiseId] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/");

      const [profileRes, listRes] = await Promise.all([
        supabase.from("profiles").select("role, franchise_id").eq("id", session.user.id).single(),
        supabase.from("profiles").select("*")
      ]);

      if (profileRes.data?.role !== "central") return navigate("/");
      
      setUserFranchiseId(profileRes.data?.franchise_id || "CENTRAL-HQ");
      setProfiles(listRes.data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  const companies = useMemo(() => {
    const list = profiles.map(p => p.company).filter(Boolean);
    return ["all", ...new Set(list)];
  }, [profiles]);

  const sortedAndFilteredProfiles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = profiles.filter(p => {
      const matchesSearch = 
        p.name?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.franchise_id?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query);
      
      const matchesCompany = companyFilter === "all" || p.company === companyFilter;
      return matchesSearch && matchesCompany;
    });

    const roleOrder = { central: 1, stock: 2, franchise: 3 };
    return filtered.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
  }, [profiles, searchQuery, companyFilter]);

  /* ================= ACTIONS ================= */
  const confirmDelete = (profile) => {
    setProfileToDelete(profile);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("profiles").delete().eq("id", profileToDelete.id);
    if (error) {
      alert("Error deleting user: " + error.message);
    } else {
      setProfiles(prev => prev.filter(p => p.id !== profileToDelete.id));
      setShowDeleteModal(false);
      setProfileToDelete(null);
    }
    setDeleting(false);
  };

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setEditForm({ ...profile }); 
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveChanges = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("id", selectedProfile.id);
    if (!error) {
      setShowEditModal(false);
      fetchProfiles();
    } else {
      alert("Update failed: " + error.message);
    }
    setSaving(false);
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'central': return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }; 
      case 'stock': return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };   
      case 'franchise': return { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }; 
      default: return { background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' };
    }
  };

  if (loading && profiles.length === 0) return <div style={styles.loader}>Loading Profiles...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        <header style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 style={styles.centerTitle}>PROFILES</h1>
          
          <div style={styles.topRightActions}>
            <div style={styles.franchiseDisplay}>
                <span style={styles.franchiseLabel}>Franchise ID :</span>
                <span style={styles.franchiseValue}>{userFranchiseId}</span>
            </div>
            <button onClick={() => navigate("/register")} style={styles.registerBtn}>
                <UserPlus size={18} />
                <span>REGISTER</span>
            </button>
          </div>
        </header>

        <div style={styles.actionBar}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={styles.searchWrapper}>
                    <Search size={18} color="#9ca3af" />
                    <input 
                        style={styles.searchInput} 
                        placeholder="Search name, phone or address..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={styles.dateSection}>
                    <Calendar size={16} color={PRIMARY} />
                    <span style={styles.dateText}>{today}</span>
                </div>
            </div>
            <div style={styles.countBadge}>{sortedAndFilteredProfiles.length} TOTAL USERS</div>
        </div>

        <div style={styles.filterRow}>
            <div style={styles.companyFilterWrapper}>
                <Building2 size={16} color={PRIMARY} />
                <select 
                    style={styles.companySelect}
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                >
                    <option value="all">All Companies</option>
                    {companies.filter(c => c !== "all").map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <ChevronDown size={14} color="#6b7280" />
            </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>S.NO</th>
                <th style={styles.th}>USER</th>
                <th style={styles.th}>COMPANY</th>
                <th style={styles.th}>FRANCHISE ID</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>ADDRESS</th>
                <th style={styles.th}>CONTACT</th>
                <th style={{...styles.th, textAlign: 'center'}}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredProfiles.map((p, index) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={{...styles.td, color: '#9ca3af', fontWeight: 'bold'}}>{index + 1}</td>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.company || "—"}</td>
                  <td style={styles.td}><code style={styles.code}>{p.franchise_id || "—"}</code></td>
                  <td style={styles.td}>
                    <span style={{...styles.roleBadge, ...getRoleStyle(p.role)}}>
                        {p.role?.toUpperCase()}
                    </span>
                  </td>
                  {/* CHANGED FROM BRANCH TO ADDRESS */}
                  <td style={{...styles.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {p.address || "No Address Provided"}
                  </td>
                  <td style={styles.td}>{p.phone || "—"}</td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                        <button onClick={() => openEditModal(p)} style={styles.actionIconBtn}>
                            <Edit2 size={16} color={ACTION_GREEN} />
                        </button>
                        <button onClick={() => confirmDelete(p)} style={styles.actionIconBtn}>
                            <Trash2 size={16} color={DANGER_RED} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0}}>Update Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            <div style={styles.modalBody}>
                <div style={styles.formRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input style={styles.modalInput} name="name" value={editForm.name || ""} onChange={handleInputChange} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>System Role</label>
                        <select style={styles.modalSelect} name="role" value={editForm.role || ""} onChange={handleInputChange}>
                            <option value="central">Central</option>
                            <option value="franchise">Franchise</option>
                            <option value="stock">Stock Manager</option>
                        </select>
                    </div>
                </div>
                <div style={styles.formRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Company Name</label>
                        <input style={styles.modalInput} name="company" value={editForm.company || ""} onChange={handleInputChange} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Franchise ID</label>
                        <input style={styles.modalInput} name="franchise_id" value={editForm.franchise_id || ""} onChange={handleInputChange} />
                    </div>
                </div>
                <div style={styles.formRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Phone Number</label>
                        <input style={styles.modalInput} name="phone" value={editForm.phone || ""} onChange={handleInputChange} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Work Email</label>
                        <input style={styles.modalInput} name="email" value={editForm.email || ""} onChange={handleInputChange} />
                    </div>
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Permanent Address</label>
                    <textarea 
                        style={{...styles.modalInput, height: '80px', resize: 'none'}} 
                        name="address" 
                        value={editForm.address || ""} 
                        onChange={handleInputChange} 
                    />
                </div>
                <button onClick={saveChanges} disabled={saving} style={styles.saveBtn}>
                    {saving ? "SYNCING..." : "SAVE CHANGES"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: '400px', textAlign: 'center'}}>
            <div style={{color: DANGER_RED, marginBottom: '20px'}}>
                <AlertTriangle size={48} style={{margin: '0 auto'}} />
            </div>
            <h3 style={{margin: '0 0 10px 0', fontSize: '18px'}}>Confirm Deletion</h3>
            <p style={{color: '#6b7280', fontSize: '14px', lineHeight: '1.5', marginBottom: '25px'}}>
                Are you sure you want to delete <strong>{profileToDelete?.name}</strong>?<br/>
                This action is permanent and cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '12px'}}>
                <button 
                    onClick={() => setShowDeleteModal(false)} 
                    style={{...styles.saveBtn, background: '#f3f4f6', color: '#374151', flex: 1, marginTop: 0}}
                >
                    CANCEL
                </button>
                <button 
                    onClick={handleDelete} 
                    disabled={deleting}
                    style={{...styles.saveBtn, background: DANGER_RED, flex: 1, marginTop: 0}}
                >
                    {deleting ? "DELETING..." : "DELETE USER"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", position: "relative" },
  centerTitle: { fontSize: "24px", fontWeight: "900", letterSpacing: "-1px", margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "600", cursor: "pointer" },
  topRightActions: { display: "flex", alignItems: "center", gap: "25px" },
  franchiseDisplay: { display: "flex", alignItems: "center", gap: "8px" },
  franchiseLabel: { fontSize: "11px", fontWeight: "700", color: "#9ca3af", letterSpacing: "0.5px" },
  franchiseValue: { fontSize: "13px", fontWeight: "900", color: PRIMARY, background: "#f0fdf4", padding: "4px 10px", borderRadius: "8px", border: `1px solid #bbf7d0` },
  registerBtn: { display: "flex", alignItems: "center", gap: "8px", background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", cursor: "pointer" },
  actionBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  filterRow: { marginBottom: "25px", display: "flex", justifyContent: "flex-start" },
  companyFilterWrapper: { display: "flex", alignItems: "center", gap: "10px", background: "#fff", border: `1.5px solid ${BORDER}`, padding: "8px 15px", borderRadius: "12px", width: "fit-content" },
  companySelect: { border: "none", background: "none", outline: "none", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", appearance: "none", paddingRight: "5px" },
  dateSection: { display: "flex", alignItems: "center", gap: "10px", background: "#f3f4f6", padding: "0 16px", borderRadius: "14px", border: `1px solid ${BORDER}`, height: "46px" },
  dateText: { fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" },
  searchWrapper: { display: "flex", alignItems: "center", gap: "12px", background: "#f9fafb", border: `1.5px solid ${BORDER}`, borderRadius: "16px", padding: "0 16px", width: "350px", height: "46px" },
  searchInput: { border: "none", background: "none", padding: "14px 0", outline: "none", fontSize: "14px", width: "100%", fontWeight: "500" },
  countBadge: { fontSize: "10px", fontWeight: "800", color: "#9ca3af", letterSpacing: "1px" },
  tableWrapper: { border: `1px solid ${BORDER}`, borderRadius: "24px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thRow: { background: "#f3f4f6", borderBottom: `2px solid ${PRIMARY}` }, 
  th: { padding: "18px 24px", fontSize: "11px", fontWeight: "900", color: PRIMARY, letterSpacing: "1.5px" },
  tr: { borderTop: `1px solid ${BORDER}`, transition: "background-color 0.2s ease" },
  td: { padding: "16px 24px", fontSize: "13px", color: "#111827", fontWeight: "500" },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#4b5563", fontFamily: "monospace" },
  roleBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: "800", display: "inline-block" },
  actionIconBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "4px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: "#fff", borderRadius: "28px", width: "550px", padding: "35px", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  modalBody: { display: "flex", flexDirection: "column", gap: "18px" },
  formRow: { display: 'flex', gap: '15px' },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  label: { fontSize: "11px", fontWeight: "800", color: "#9ca3af", textTransform: 'uppercase' },
  modalInput: { padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, outline: "none", fontSize: "14px", background: '#f9fafb' },
  modalSelect: { 
    padding: "12px 35px 12px 14px", 
    borderRadius: "12px", 
    border: `1.5px solid ${BORDER}`, 
    outline: "none", 
    fontSize: "14px", 
    background: '#f9fafb',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px'
  },
  saveBtn: { background: ACTION_GREEN, color: "#fff", border: "none", padding: "16px", borderRadius: "16px", fontWeight: "800", cursor: "pointer", marginTop: '10px', fontSize: '12px' },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: PRIMARY }
};

export default CentralProfiles;