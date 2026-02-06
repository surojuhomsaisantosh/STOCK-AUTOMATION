import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Clock, Building2, ChevronRight, User, Phone, ChevronDown, Mail, CreditCard, MapPin
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000";

const CentralStaffProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);

  // STATE: Header & Search
  const [loggedInFranchiseId, setLoggedInFranchiseId] = useState("");
  const [searchFranchiseId, setSearchFranchiseId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [expandedId, setExpandedId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "", staff_id: "", password: "", phone: "", email: "", address: "", aadhar_card: ""
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchInitialData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('franchise_id, company')
        .eq('id', user.id)
        .single();

      if (ownerError) throw ownerError;

      if (ownerProfile) {
        setLoggedInFranchiseId(ownerProfile.franchise_id || "CENTRAL");
        setSearchFranchiseId(ownerProfile.franchise_id || "");
        if (ownerProfile.franchise_id) {
          await fetchStaffProfiles(ownerProfile.franchise_id);
        }
      }
    } catch (err) {
      console.error("Load Error:", err.message);
    }
  };

  const handleFranchiseFetch = async (e) => {
    e.preventDefault();
    if (!searchFranchiseId) return alert("Please enter a Franchise ID");
    await fetchStaffProfiles(searchFranchiseId);
  };

  const fetchStaffProfiles = async (fid) => {
    setLoading(true);
    const { data: franchiseData } = await supabase
      .from('profiles')
      .select('company')
      .eq('franchise_id', fid)
      .maybeSingle();

    setCompanyName(franchiseData ? franchiseData.company : "Unknown Franchise");

    const { data, error } = await supabase
      .from('staff_profiles')
      .select('id, name, staff_id, phone, email, address, aadhar_card, created_at')
      .eq('franchise_id', fid)
      .order('created_at', { ascending: false });

    if (!error) setProfiles(data || []);
    else setProfiles([]);
    setLoading(false);
  };

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      staff_id: profile.staff_id,
      password: "",
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
    if (!searchFranchiseId) return alert("No Franchise ID selected.");
    setSubmitting(true);

    if (editingId) {
      if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
        alert("⚠️ Password too short! It must be at least 8 characters.");
        setSubmitting(false);
        return;
      }
    } else {
      if (!formData.password || formData.password.length < 8) {
        alert("⚠️ Password is required and must be at least 8 characters.");
        setSubmitting(false);
        return;
      }
    }

    try {
      if (editingId) {
        const { error: profileError } = await supabase
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

        if (profileError) throw profileError;

        if (formData.password && formData.password.trim() !== "") {
          const { error: passwordError } = await supabase.rpc('update_staff_password', {
            target_user_id: editingId,
            new_password: formData.password
          });
          if (passwordError) alert("⚠️ Profile updated, but Password failed to reset.");
          else alert("✅ Profile updated!");
        } else {
          alert("✅ Profile updated successfully!");
        }
        fetchStaffProfiles(searchFranchiseId);
      } else {
        const loginEmail = formData.email || `${formData.staff_id}@${searchFranchiseId.toLowerCase()}.com`;
        const tempSupabase = createClient(supabase.supabaseUrl, supabase.supabaseKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: loginEmail, password: formData.password });
        if (authError) throw authError;
        const { password, ...dbPayload } = formData;
        await supabase.from('staff_profiles').insert([{ ...dbPayload, id: authData.user.id, franchise_id: searchFranchiseId, email: loginEmail }]);
        alert("Staff created successfully!");
        fetchStaffProfiles(searchFranchiseId);
      }
      closeModal();
    } catch (err) { alert("Error: " + err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("⚠️ Delete this user permanently?")) {
      try {
        const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
        if (error) throw error;
        alert("✅ Deleted successfully.");
        setProfiles(prev => prev.filter(p => p.id !== id));
      } catch (err) { alert("Error: " + err.message); }
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ ...styles.page, padding: isMobile ? "15px 15px 80px 15px" : "40px" }}>

      {/* HEADER SECTION */}
      <div style={{ ...styles.headerRow, flexDirection: isMobile ? "column" : "row", gap: isMobile ? "12px" : "0" }}>
        <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={20} /> {!isMobile && "Back"}
          </button>
          {isMobile && <div style={styles.mobileBadge}>{loggedInFranchiseId}</div>}
        </div>

        <h1 style={{ ...styles.mainHeading, fontSize: isMobile ? "24px" : "28px", textAlign: isMobile ? 'left' : 'center' }}>Staff Profiles</h1>

        {!isMobile && (
          <div style={styles.franchiseIdLabel}>
            Franchise : <span style={{ color: PRIMARY }}>{loggedInFranchiseId}</span>
          </div>
        )}
      </div>

      {/* SEARCH FRANCHISE CARD */}
      <div style={{ ...styles.filterCard, padding: isMobile ? '12px' : '15px' }}>
        <form onSubmit={handleFranchiseFetch} style={{ ...styles.filterForm, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <Building2 size={18} color={PRIMARY} />
            <span style={styles.filterLabel}>Load Branch:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: "100%", flex: 1 }}>
            <input
              type="text"
              placeholder="Enter ID (e.g. HYD01)"
              value={searchFranchiseId}
              onChange={(e) => setSearchFranchiseId(e.target.value.toUpperCase())}
              style={{ ...styles.filterInput, flex: 1, fontSize: isMobile ? '13px' : '14px' }}
            />
            <button type="submit" style={styles.fetchBtn}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : "LOAD"}
            </button>
          </div>
        </form>
      </div>

      {/* LOCAL SEARCH & ADD */}
      <div style={{ ...styles.actionRow, flexDirection: isMobile ? "row" : "row", gap: isMobile ? '8px' : '15px' }}>
        <div style={{ ...styles.searchContainer, flex: 1 }}>
          <Search size={18} style={styles.searchIcon} color="#94a3b8" />
          <input
            type="text"
            placeholder={isMobile ? "Search..." : "Search staff by name or ID..."}
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button style={styles.addBtn} onClick={() => {
          if (!searchFranchiseId) alert("Load a Franchise ID first.");
          else setIsModalOpen(true);
        }}>
          <Plus size={20} /> {!isMobile && "Add New User"}
        </button>
      </div>

      {/* LISTING VIEW */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={styles.loaderCenter}><Loader2 className="animate-spin" color={PRIMARY} size={32} /></div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((p) => (
              <div key={p.id} style={{ ...styles.mobileCard, borderColor: expandedId === p.id ? PRIMARY : BORDER }}>
                <div onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ ...styles.cardAvatar, background: expandedId === p.id ? `${PRIMARY}15` : '#f3f4f6' }}>
                      <User size={20} color={expandedId === p.id ? PRIMARY : '#64748b'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: BLACK }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {p.staff_id}</div>
                    </div>
                  </div>
                  {expandedId === p.id ? <ChevronDown size={20} color={PRIMARY} /> : <ChevronRight size={20} color="#cbd5e1" />}
                </div>

                {expandedId === p.id && (
                  <div style={styles.cardBody}>
                    <div style={styles.cardDetailGrid}>
                      <div style={styles.cardInfoRow}><Phone size={14} color={PRIMARY} /> {p.phone}</div>
                      <div style={styles.cardInfoRow}><Mail size={14} color={PRIMARY} /> {p.email || 'No Email'}</div>
                      <div style={styles.cardInfoRow}><CreditCard size={14} color={PRIMARY} /> {p.aadhar_card || 'No Aadhar'}</div>
                      <div style={styles.cardInfoRow}><MapPin size={14} color={PRIMARY} /> {p.address || 'No Address'}</div>
                    </div>

                    <div style={styles.cardActions}>
                      <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: p.id, targetName: p.name, franchiseId: searchFranchiseId } })} style={{ ...styles.cardActionBtn, color: '#2563eb', background: '#eff6ff' }}><Clock size={16} /> LOGS</button>
                      <button onClick={() => handleOpenEdit(p)} style={{ ...styles.cardActionBtn, color: PRIMARY, background: `${PRIMARY}10` }}><Edit2 size={16} /> EDIT</button>
                      <button onClick={() => handleDelete(p.id)} style={{ ...styles.cardActionBtn, color: '#ef4444', background: '#fef2f2' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>No staff profiles found.</div>
          )}
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>S.NO</th>
                <th style={styles.th}>COMPANY NAME</th>
                <th style={styles.th}>STAFF NAME</th>
                <th style={styles.th}>STAFF ID</th>
                <th style={styles.th}>PHONE NUMBER</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '20px auto' }} /></td></tr>
              ) : filteredProfiles.map((profile, index) => (
                <tr key={profile.id} style={styles.tr}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>{companyName}</td>
                  <td style={styles.td}>{profile.name}</td>
                  <td style={styles.td}>{profile.staff_id}</td>
                  <td style={styles.td}>{profile.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: profile.id, targetName: profile.name, franchiseId: searchFranchiseId } })} style={styles.timeBtn} title="View Logs"><Clock size={16} /></button>
                    <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn} title="Edit Profile"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(profile.id)} style={styles.deleteBtn} title="Delete User"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RESPONSIVE MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? "100%" : "550px", height: isMobile ? "100%" : "auto", borderRadius: isMobile ? "0" : "24px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}><UserPlus size={20} color={PRIMARY} /></div>
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? "20px" : "22px" }}>
                  {editingId ? "Update Staff" : "New Staff"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.inputGroup}><label style={styles.label}>Full Name *</label><input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Staff ID *</label><input required style={styles.input} type="text" value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} /></div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password {!editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} placeholder={editingId ? "Leave blank to keep same" : "Min 8 characters"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <div style={styles.inputGroup}><label style={styles.label}>Phone Number *</label><input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Email Address</label><input style={styles.input} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Aadhar Card No.</label><input style={styles.input} type="text" value={formData.aadhar_card} onChange={e => setFormData({ ...formData, aadhar_card: e.target.value })} /></div>

              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Residential Address</label>
                <textarea style={{ ...styles.input, height: '70px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div style={{ ...styles.modalFooter, gridColumn: isMobile ? "span 1" : "span 2" }}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>{submitting ? "Saving..." : "Save Profile"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: `1px solid ${BORDER}`, color: BLACK, fontWeight: '700', cursor: 'pointer', padding: '10px', borderRadius: '12px' },
  mobileBadge: { background: `${PRIMARY}10`, color: PRIMARY, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', border: `1px solid ${PRIMARY}30` },
  mainHeading: { fontWeight: "900", margin: 0, letterSpacing: '-0.8px' },
  franchiseIdLabel: { fontWeight: '800', background: "#fff", padding: "10px 18px", borderRadius: "12px", border: `1px solid ${BORDER}`, fontSize: '14px' },
  filterCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  filterForm: { display: 'flex', alignItems: 'center', gap: '12px' },
  filterLabel: { fontWeight: '700', fontSize: '13px', color: '#64748b' },
  filterInput: { padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '700', color: PRIMARY },
  fetchBtn: { padding: '10px 20px', background: BLACK, color: 'white', borderRadius: '10px', fontWeight: '800', border: 'none', cursor: 'pointer' },
  actionRow: { display: 'flex', marginBottom: '20px' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px' },
  searchInput: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '600', fontSize: '14px', background: 'white' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', background: PRIMARY, color: 'white', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: 'pointer' },

  // MOBILE CARDS
  mobileCard: { background: 'white', borderRadius: '18px', border: `1.5px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s ease' },
  cardHeader: { padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  cardAvatar: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: '0 16px 16px 16px', borderTop: `1px dashed ${BORDER}`, paddingTop: '16px' },
  cardDetailGrid: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' },
  cardInfoRow: { fontSize: '13px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px' },
  cardActions: { display: 'flex', gap: '8px' },
  cardActionBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },

  // DESKTOP TABLE
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', fontSize: '11px', fontWeight: '900', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '10px', padding: '16px' },
  timeBtn: { padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer' },
  editBtn: { padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: PRIMARY, border: 'none', cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' },

  // MODAL
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalIconBox: { width: '40px', height: '40px', background: `${PRIMARY}10`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formGrid: { display: 'grid', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800', color: '#475569' },
  input: { padding: '12px 14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, outline: 'none', fontSize: '14px', fontWeight: '600' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' },
  modalFooter: { display: 'flex', gap: '12px', marginTop: '14px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: 'white', fontWeight: '700', cursor: 'pointer' },
  submitBtn: { flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '800', cursor: 'pointer' },

  loaderCenter: { display: 'flex', justifyContent: 'center', padding: '50px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }
};

export default CentralStaffProfiles;