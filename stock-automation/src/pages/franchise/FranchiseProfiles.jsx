import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus, 
  Loader2, Eye, EyeOff, Clock, User, Phone, Hash, ChevronRight, ChevronDown, Mail
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#111827";

const FranchiseProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [franchiseId, setFranchiseId] = useState("...");
  const [companyName, setCompanyName] = useState("");
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedId, setExpandedId] = useState(null);
  
  // Form States
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    staff_id: "",
    password: "",
    phone: "",
    email: "",
    address: "",
    aadhar_card: ""
  });

  // Handle Resize for Responsive Layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchInitialData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerProfile, error } = await supabase
        .from('profiles')
        .select('franchise_id, company')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (ownerProfile) {
        setFranchiseId(ownerProfile.franchise_id);
        setCompanyName(ownerProfile.company || "Franchise");
        await fetchStaffProfiles(ownerProfile.franchise_id);
      }
    } catch (err) {
      console.error("Error loading profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffProfiles = async (fid) => {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('franchise_id', fid)
      .order('created_at', { ascending: false });

    if (!error) setProfiles(data || []);
  };

  // --- FORM HANDLERS ---

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      staff_id: profile.staff_id,
      password: "", // Don't show existing password
      phone: profile.phone,
      email: profile.email || "",
      address: profile.address || "",
      aadhar_card: profile.aadhar_card || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", staff_id: "", password: "", phone: "", email: "", address: "", aadhar_card: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validation
    if (!editingId && (!formData.password || formData.password.length < 6)) {
      alert("Password must be at least 6 characters.");
      setSubmitting(false);
      return;
    }
    if (formData.phone.length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        // UPDATE EXISTING USER
        const { error: updateError } = await supabase
          .from('staff_profiles')
          .update({
            name: formData.name,
            staff_id: formData.staff_id,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            aadhar_card: formData.aadhar_card
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        // Optional Password Reset
        if (formData.password && formData.password.trim() !== "") {
          await supabase.rpc('update_staff_password', {
            target_user_id: editingId,
            new_password: formData.password
          });
        }
        alert("Staff updated successfully!");

      } else {
        // CREATE NEW USER
        // 1. Create independent client to avoid logging out the admin
        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL, 
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } } // Critical: Do not persist this session
        );

        const loginEmail = formData.email || `${formData.staff_id.toLowerCase().replace(/\s/g, '')}@${franchiseId.toLowerCase()}.com`;

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: loginEmail,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user account.");

        // 2. Insert into DB
        const { password, ...dbPayload } = formData;
        const { error: dbError } = await supabase
          .from('staff_profiles')
          .insert([{
            ...dbPayload,
            id: authData.user.id,
            franchise_id: franchiseId,
            email: loginEmail
          }]);

        if (dbError) throw dbError;
        alert("New staff member created!");
      }

      await fetchStaffProfiles(franchiseId);
      closeModal();

    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this staff member? This cannot be undone.")) return;
    try {
      const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
      if (error) throw error;
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Could not delete user: " + err.message);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ ...styles.page, padding: isMobile ? "20px" : "40px" }}>
      
      {/* HEADER */}
      <div style={styles.headerRow}>
        <div style={{ flex: 1 }}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={20} /> <span style={{fontSize: '14px', fontWeight: '700'}}>Back</span>
            </button>
        </div>
        
        <h1 style={styles.mainHeading}>Profiles</h1>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={styles.idBox}>
                <span style={styles.idLabel}>ID :</span>
                <span style={styles.idValue}>{franchiseId}</span>
            </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ ...styles.actionRow, flexDirection: isMobile ? "column" : "row" }}>
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Name or ID..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          {!isMobile && (
            <div style={styles.dateBadge}>
              <Calendar size={16} />
              {new Date().toLocaleDateString('en-GB')}
            </div>
          )}
          <button style={{ ...styles.addBtn, width: isMobile ? '100%' : 'auto' }} onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {isMobile ? "Add New" : "Add New Staff"}
          </button>
        </div>
      </div>

      {/* CONTENT: MOBILE LIST vs DESKTOP TABLE */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 className="animate-spin" size={32} color={PRIMARY} />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div style={styles.emptyState}>
            <User size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
            <p>No staff profiles found.</p>
        </div>
      ) : isMobile ? (
        // --- MOBILE CARD VIEW ---
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }}>
          {filteredProfiles.map((profile) => (
            <div key={profile.id} style={styles.mobileCard}>
              <div
                onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                style={styles.mobileCardHeader}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={styles.avatar}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: BLACK }}>{profile.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {profile.staff_id}</div>
                  </div>
                </div>
                {expandedId === profile.id ? <ChevronDown size={18} color={PRIMARY} /> : <ChevronRight size={18} color="#cbd5e1" />}
              </div>

              {expandedId === profile.id && (
                <div style={styles.mobileCardBody}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}><Phone size={12} /> {profile.phone}</div>
                    <div style={styles.infoItem}><Mail size={12} /> {profile.email || "No Email"}</div>
                  </div>
                  <div style={styles.mobileActions}>
                    <button
                      onClick={() => navigate('/franchise/timings', { state: { targetUserId: profile.id, targetName: profile.name } })}
                      style={{ ...styles.mobileBtn, background: '#eff6ff', color: '#2563eb' }}
                    >
                      <Clock size={14} /> Timings
                    </button>
                    <button
                      onClick={() => handleOpenEdit(profile)}
                      style={{ ...styles.mobileBtn, background: '#f0fdf4', color: PRIMARY }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      style={{ ...styles.mobileBtn, background: '#fef2f2', color: '#ef4444' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // --- DESKTOP TABLE VIEW ---
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={styles.th}>S.NO</th>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>STAFF ID</th>
                <th style={styles.th}>PHONE</th>
                <th style={styles.th}>EMAIL</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile, index) => (
                <tr key={profile.id} style={styles.tr}>
                  <td style={styles.td}>{String(index + 1).padStart(2, '0')}</td>
                  <td style={{ ...styles.td, fontWeight: '700' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><User size={14}/></div>
                        {profile.name}
                    </div>
                  </td>
                  <td style={styles.td}><span style={styles.badge}>{profile.staff_id}</span></td>
                  <td style={styles.td}>{profile.phone}</td>
                  <td style={{ ...styles.td, fontSize: '13px', color: '#64748b' }}>{profile.email}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => navigate('/franchise/timings', { state: { targetUserId: profile.id, targetName: profile.name } })} style={styles.iconBtn} title="View Timings"><Clock size={16} /></button>
                    <button onClick={() => handleOpenEdit(profile)} style={{ ...styles.iconBtn, color: PRIMARY }} title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(profile.id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? '90%' : '600px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingId ? "Update Staff" : "Add New Staff"}</h2>
              <button onClick={closeModal} style={styles.closeBtn}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
                <input required style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Staff ID <span style={styles.req}>*</span></label>
                <input required style={styles.input} value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>{editingId ? "Reset Password" : "Password *"}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{ ...styles.input, width: '100%' }} 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingId ? "Leave empty to keep current" : "Min 6 chars"} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Phone (10 Digits) <span style={styles.req}>*</span></label>
                <input required type="tel" maxLength="10" pattern="[0-9]{10}" style={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email (Optional)</label>
                <input type="email" style={styles.input} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Aadhar Number</label>
                <input style={styles.input} value={formData.aadhar_card} onChange={e => setFormData({ ...formData, aadhar_card: e.target.value })} />
              </div>

              <div style={{ ...styles.field, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div style={{ ...styles.modalFooter, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>
                    {submitting ? <Loader2 className="animate-spin" size={16}/> : (editingId ? "Save Changes" : "Create Profile")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { background: "#f9fafb", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0 },
  mainHeading: { fontSize: '20px', fontWeight: "900", margin: 0, letterSpacing: '-0.5px', color: BLACK, textTransform: 'uppercase', position: 'absolute', left: '50%', transform: 'translateX(-50%)' },
  idBox: { display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  idLabel: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  idValue: { fontSize: '12px', fontWeight: '800', color: BLACK },
  
  actionRow: { display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  searchIcon: { position: 'absolute', left: '16px', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px', color: BLACK, fontWeight: '500', transition: 'border 0.2s', background: 'white' },
  dateBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRadius: '12px', background: '#f1f5f9', fontSize: '12px', fontWeight: '700', color: '#64748b' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: PRIMARY, border: 'none', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'opacity 0.2s' },
  
  emptyState: { textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' },

  // Mobile Cards
  mobileCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s' },
  mobileCardHeader: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  avatar: { width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY },
  mobileCardBody: { padding: '0 16px 16px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  infoItem: { background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' },
  mobileActions: { display: 'flex', gap: '10px' },
  mobileBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' },

  // Desktop Table
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 0.1s' },
  td: { padding: '16px 24px', fontSize: '13px', fontWeight: '500', color: '#334155' },
  badge: { background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#475569' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' },
  iconBtn: { padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s', display: 'flex' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { background: 'white', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '800', color: BLACK },
  closeBtn: { background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },
  formGrid: { display: 'grid', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#374151' },
  req: { color: '#ef4444' },
  input: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px', color: BLACK, background: '#fff', width: '100%', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  modalFooter: { display: 'flex', gap: '12px', marginTop: '10px' },
  cancelBtn: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: 'white', fontWeight: '700', color: '#64748b', cursor: 'pointer', flex: 1 },
  submitBtn: { padding: '12px', borderRadius: '10px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '700', cursor: 'pointer', flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default FranchiseProfiles;