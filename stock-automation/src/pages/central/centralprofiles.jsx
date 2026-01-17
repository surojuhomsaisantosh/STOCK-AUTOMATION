import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  X
} from "lucide-react";

const PRIMARY = "#065f46";
const ACTION_GREEN = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function CentralProfiles() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/");

      const [profileRes, listRes] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", session.user.id).single(),
        supabase.from("profiles").select("*")
      ]);

      if (profileRes.data?.role !== "central") return navigate("/");
      
      setProfiles(listRes.data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const sortedAndFilteredProfiles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    let filtered = profiles.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.phone?.toLowerCase().includes(query) ||
      p.franchise_id?.toLowerCase().includes(query)
    );

    const roleOrder = { central: 1, stock: 2, franchise: 3 };

    return filtered.sort((a, b) => {
      return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
    });
  }, [profiles, searchQuery]);

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setEditForm({
      name: profile.name || "",
      email: profile.email || "", // Email hidden in table, shown here
      role: profile.role || "franchise",
      franchise_id: profile.franchise_id || "",
      phone: profile.phone || "",
      branch_location: profile.branch_location || "",
      address: profile.address || ""
    });
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveChanges = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(editForm)
      .eq("id", selectedProfile.id);

    if (!error) {
      setShowEditModal(false);
      fetchProfiles();
    } else {
      alert("Update failed.");
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
        
        <header style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 style={styles.centerTitle}>PROFILES</h1>
          <button onClick={() => navigate("/register")} style={styles.registerBtn}>
            <UserPlus size={18} />
            <span>REGISTER</span>
          </button>
        </header>

        <div style={styles.actionBar}>
            <div style={styles.searchWrapper}>
                <Search size={18} color="#9ca3af" />
                <input 
                    style={styles.searchInput} 
                    placeholder="Search personnel..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div style={styles.countBadge}>{sortedAndFilteredProfiles.length} TOTAL USERS</div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>USER</th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>BRANCH</th>
                <th style={styles.th}>CONTACT</th>
                <th style={{...styles.th, textAlign: 'center'}}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredProfiles.map((p) => (
                <tr key={p.id} style={styles.tr} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}><code style={styles.code}>{p.franchise_id || "—"}</code></td>
                  <td style={styles.td}>
                    <span style={{...styles.roleBadge, ...getRoleStyle(p.role)}}>
                        {p.role?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>{p.branch_location || "Global"}</td>
                  <td style={styles.td}>{p.phone || "—"}</td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <button onClick={() => openEditModal(p)} style={styles.editButtonText}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                        <input style={styles.modalInput} name="name" value={editForm.name} onChange={handleInputChange} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>System Role</label>
                        <select style={styles.modalSelect} name="role" value={editForm.role} onChange={handleInputChange}>
                            <option value="central">Central</option>
                            <option value="franchise">Franchise</option>
                            <option value="stock">Stock Manager</option>
                        </select>
                    </div>
                </div>

                <div style={styles.formRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Franchise ID</label>
                        <input style={styles.modalInput} name="franchise_id" value={editForm.franchise_id} onChange={handleInputChange} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Phone Number</label>
                        <input style={styles.modalInput} name="phone" value={editForm.phone} onChange={handleInputChange} />
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Work Email</label>
                    <input style={styles.modalInput} name="email" value={editForm.email} onChange={handleInputChange} />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Branch Location</label>
                    <input style={styles.modalInput} name="branch_location" value={editForm.branch_location} onChange={handleInputChange} />
                </div>

                <button onClick={saveChanges} disabled={saving} style={styles.saveBtn}>
                    {saving ? "SYNCING..." : "SAVE CHANGES"}
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
  registerBtn: { display: "flex", alignItems: "center", gap: "8px", background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", cursor: "pointer" },
  actionBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  searchWrapper: { display: "flex", alignItems: "center", gap: "12px", background: "#f9fafb", border: `1.5px solid ${BORDER}`, borderRadius: "16px", padding: "0 16px", width: "350px" },
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
  editButtonText: { background: "none", border: "none", color: ACTION_GREEN, fontWeight: "800", cursor: "pointer", fontSize: "13px", textTransform: "uppercase" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: "#fff", borderRadius: "28px", width: "500px", padding: "35px", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" },
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