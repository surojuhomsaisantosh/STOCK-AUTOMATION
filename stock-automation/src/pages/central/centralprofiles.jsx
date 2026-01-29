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
  AlertTriangle
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);
  
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userFranchiseId, setUserFranchiseId] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
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

  const handleDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("profiles").delete().eq("id", profileToDelete.id);
    if (!error) {
      setProfiles(prev => prev.filter(p => p.id !== profileToDelete.id));
      setShowDeleteModal(false);
    }
    setDeleting(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("id", selectedProfile.id);
    if (!error) {
      setShowEditModal(false);
      fetchProfiles();
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

  if (loading) return <div style={styles.loader}>Loading Profiles...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* HEADER SECTION */}
        <header style={{...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0'}}>
          <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
                <ArrowLeft size={22} />
                <span>Back</span>
            </button>
            {isMobile && (
              <div style={styles.idContainer}>
                <span style={styles.idLabel}>ID :</span>
                <div style={styles.idBox}>{userFranchiseId}</div>
              </div>
            )}
          </div>

          <h1 style={{...styles.centerTitle, position: isMobile ? 'static' : 'absolute', transform: isMobile ? 'none' : 'translateX(-50%)'}}>PROFILES</h1>
          
          <div style={{...styles.topRightActions, width: isMobile ? '100%' : 'auto'}}>
            {!isMobile && (
                <div style={styles.idContainer}>
                    <span style={styles.idLabel}>ID :</span>
                    <div style={styles.idBox}>{userFranchiseId}</div>
                </div>
            )}
            <button onClick={() => navigate("/register")} style={{...styles.registerBtn, flex: isMobile ? 1 : 'none'}}>
                <UserPlus size={18} />
                <span>REGISTER</span>
            </button>
          </div>
        </header>

        {/* LARGE SEARCH BAR & ACTION BAR */}
        <div style={{...styles.actionBar, flexDirection: isMobile ? 'column' : 'row'}}>
            <div style={{...styles.searchWrapper, width: isMobile ? '100%' : 'auto'}}>
                <Search size={30} color="#9ca3af" />
                <input 
                    style={styles.searchInput}
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div style={{display: 'flex', gap: '12px', justifyContent: isMobile ? 'space-between' : 'flex-end'}}>
                <div style={{...styles.dateSection, flex: isMobile ? 1 : 'none'}}>
                    <Calendar size={20} color={PRIMARY} />
                    <span style={styles.dateText}>{today}</span>
                </div>
            </div>
        </div>

        {/* LARGE FILTER DROPDOWN */}
        <div style={styles.filterRow}>
            <div style={{...styles.companyFilterWrapper, width: isMobile ? '100%' : 'fit-content'}}>
                <Building2 size={22} color={PRIMARY} />
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
                <ChevronDown size={20} color="#6b7280" />
            </div>
            {!isMobile && <div style={styles.countBadge}>{sortedAndFilteredProfiles.length} TOTAL USERS</div>}
        </div>

        {/* TABLE SECTION */}
        <div style={styles.tableWrapper}>
          <div style={{overflowX: 'auto'}}>
            <table style={{...styles.table, minWidth: '1000px'}}>
                <thead>
                <tr style={styles.thRow}>
                    <th style={styles.th}>S.NO</th>
                    <th style={styles.th}>USER</th>
                    <th style={styles.th}>COMPANY</th>
                    <th style={styles.th}>FRANCHISE ID</th>
                    <th style={styles.th}>ROLE</th>
                    <th style={styles.th}>ADDRESS</th>
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
                    <td style={{...styles.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {p.address || "—"}
                    </td>
                    <td style={{...styles.td, textAlign: 'center'}}>
                        <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                            <button onClick={() => { setSelectedProfile(p); setEditForm({...p}); setShowEditModal(true); }} style={styles.actionIconBtn}>
                                <Edit2 size={18} color={ACTION_GREEN} />
                            </button>
                            <button onClick={() => { setProfileToDelete(p); setShowDeleteModal(true); }} style={styles.actionIconBtn}>
                                <Trash2 size={18} color={DANGER_RED} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '95%' : '550px'}}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0}}>Update Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            <div style={styles.modalBody}>
                <div style={{...styles.formRow, flexDirection: isMobile ? 'column' : 'row'}}>
                    <div style={styles.inputGroup}><label style={styles.label}>Full Name</label>
                        <input style={styles.modalInput} name="name" value={editForm.name || ""} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                    </div>
                    <div style={styles.inputGroup}><label style={styles.label}>System Role</label>
                        <select style={styles.modalSelect} name="role" value={editForm.role || ""} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                            <option value="central">Central</option>
                            <option value="franchise">Franchise</option>
                            <option value="stock">Stock Manager</option>
                        </select>
                    </div>
                </div>
                <div style={{...styles.formRow, flexDirection: isMobile ? 'column' : 'row'}}>
                    <div style={styles.inputGroup}><label style={styles.label}>Company</label>
                        <input style={styles.modalInput} name="company" value={editForm.company || ""} onChange={(e) => setEditForm({...editForm, company: e.target.value})} />
                    </div>
                    <div style={styles.inputGroup}><label style={styles.label}>Franchise ID</label>
                        <input style={styles.modalInput} name="franchise_id" value={editForm.franchise_id || ""} onChange={(e) => setEditForm({...editForm, franchise_id: e.target.value})} />
                    </div>
                </div>
                <div style={styles.inputGroup}><label style={styles.label}>Permanent Address</label>
                    <textarea style={{...styles.modalInput, height: '60px', resize: 'none'}} name="address" value={editForm.address || ""} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                </div>
                <button onClick={saveChanges} disabled={saving} style={styles.saveBtn}>
                    {saving ? "SYNCING..." : "SAVE CHANGES"}
                </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '90%' : '400px', textAlign: 'center'}}>
            <AlertTriangle size={48} color={DANGER_RED} style={{margin: '0 auto 15px'}} />
            <h3 style={{margin: '0 0 10px 0'}}>Delete User?</h3>
            <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '20px'}}>This action is permanent.</p>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={() => setShowDeleteModal(false)} style={{...styles.saveBtn, background: '#f3f4f6', color: '#374151', flex: 1, marginTop: 0}}>CANCEL</button>
                <button onClick={handleDelete} disabled={deleting} style={{...styles.saveBtn, background: DANGER_RED, flex: 1, marginTop: 0}}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", position: "relative" },
  centerTitle: { fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px", margin: 0, left: "50%" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer", fontSize: '16px' },
  topRightActions: { display: "flex", alignItems: "center", gap: "20px" },
  idContainer: { display: "flex", alignItems: "center", gap: "10px" },
  idLabel: { fontSize: "14px", fontWeight: "600", color: "#64748b" },
  idBox: { padding: "6px 16px", backgroundColor: "#fff", border: `1.5px solid ${PRIMARY}`, borderRadius: "10px", color: PRIMARY, fontWeight: "700", fontFamily: "monospace", fontSize: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  registerBtn: { display: "flex", alignItems: "center", justifyContent: 'center', gap: "8px", background: PRIMARY, color: "#fff", border: "none", padding: "12px 20px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", cursor: "pointer" },
  actionBar: { display: "flex", justifyContent: "space-between", gap: '15px', marginBottom: "20px" },
  
  // FIXED: Changed radius to 12px for "dropdown-like" look
  searchWrapper: { 
    display: "flex", 
    alignItems: "center", 
    gap: "14px", 
    background: "#f9fafb", 
    border: `2px solid ${BORDER}`, 
    borderRadius: "12px", 
    padding: "0 20px", 
    flex: 2,
    height: "64px", 
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    boxSizing: "border-box" 
  },
  searchInput: { border: "none", background: "none", outline: "none", fontSize: "18px", width: "100%", fontWeight: "500", color: "#111827" },
  
  // FIXED: Changed radius to 12px to match search bar
  dateSection: { display: "flex", alignItems: "center", gap: "10px", background: "#f3f4f6", padding: "0 20px", borderRadius: "12px", border: `1px solid ${BORDER}`, height: "64px", boxSizing: "border-box" },
  dateText: { fontSize: "14px", fontWeight: "700", color: "#4b5563" },
  
  filterRow: { marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: 'center' },
  
  // FIXED: Changed radius to 12px to match search bar
  companyFilterWrapper: { 
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    background: "#fff", 
    border: `2px solid ${BORDER}`, 
    padding: "0 20px", 
    borderRadius: "12px",
    height: "64px",
    boxSizing: "border-box"
  },
  companySelect: { border: "none", background: "none", outline: "none", fontSize: "16px", fontWeight: "600", color: "#374151", cursor: "pointer", appearance: "none", minWidth: "150px", width: "100%" },
  
  countBadge: { fontSize: "12px", fontWeight: "800", color: "#9ca3af", letterSpacing: '0.5px' },
  tableWrapper: { border: `1px solid ${BORDER}`, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thRow: { background: "#f3f4f6" }, 
  th: { padding: "18px 24px", fontSize: "11px", fontWeight: "900", color: PRIMARY, letterSpacing: "1.2px", textTransform: 'uppercase' },
  tr: { borderTop: `1px solid ${BORDER}`, transition: 'background-color 0.2s' },
  td: { padding: "18px 24px", fontSize: "14px", color: "#111827" },
  code: { background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace", color: PRIMARY, fontWeight: '700' },
  roleBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: "800" },
  actionIconBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: '8px', transition: 'background-color 0.2s' },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: 'blur(5px)' },
  modal: { background: "#fff", borderRadius: "24px", padding: "30px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  modalBody: { display: "flex", flexDirection: "column", gap: "20px" },
  formRow: { display: 'flex', gap: '15px' },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  label: { fontSize: "11px", fontWeight: "800", color: "#9ca3af", textTransform: 'uppercase' },
  modalInput: { padding: "12px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, fontSize: "15px", boxSizing: "border-box" },
  modalSelect: { padding: "12px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, fontSize: "15px", background: '#f9fafb', boxSizing: "border-box" },
  saveBtn: { background: ACTION_GREEN, color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: '13px' },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: PRIMARY }
};

export default CentralProfiles;