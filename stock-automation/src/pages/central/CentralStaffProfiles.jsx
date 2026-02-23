import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Clock, Building2, ChevronRight, User, Phone, ChevronDown, MapPin, Mail, ShieldCheck
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";

// OPTIMIZATION 1: Import the AuthContext so we don't have to query the DB for the current user!
import { useAuth } from "../../context/AuthContext";

const GREEN = "rgb(0,100,55)";
const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000";

const CentralStaffProfiles = () => {
  const navigate = useNavigate();

  // Use global auth state instead of making new DB calls
  const { profile: authProfile } = useAuth();

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
    name: "", staff_id: "", email: "", password: "", phone: "", address: ""
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    // Check if authProfile is loaded from Context, then trigger fetch
    if (authProfile && authProfile.franchise_id) {
      setLoggedInFranchiseId(authProfile.franchise_id);
      setSearchFranchiseId(authProfile.franchise_id);
      fetchStaffProfiles(authProfile.franchise_id);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [authProfile]);

  const handleFranchiseFetch = async (e) => {
    e.preventDefault();
    if (!searchFranchiseId) return alert("Please enter a Franchise ID");
    await fetchStaffProfiles(searchFranchiseId);
  };

  const fetchStaffProfiles = async (fid, isBackgroundRefresh = false) => {
    // OPTIMIZATION 2: Check Session Storage for Instant Load
    const cacheKey = `staff_profiles_${fid}`;
    if (!isBackgroundRefresh) {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        setProfiles(JSON.parse(cachedData));
      } else {
        setLoading(true); // Only show spinner if no cache exists
      }
    }

    try {
      // OPTIMIZATION 3: Parallel DB Fetching (Promise.all)
      // Instead of waiting for one to finish before starting the other, do both at once!
      const [ownerRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('id, name:company, email, phone').eq('franchise_id', fid).maybeSingle(),
        supabase.from('staff_profiles').select('id, name, staff_id, email, phone, address, created_at').eq('franchise_id', fid).order('created_at', { ascending: false })
      ]);

      const ownerData = ownerRes.data;
      const staffData = staffRes.data;

      setCompanyName(ownerData ? ownerData.name : "Unknown Franchise");

      let combined = [];

      // Add owner at the top with a flag
      if (ownerData) {
        combined.push({
          ...ownerData,
          staff_id: "OWNER/ADMIN",
          isOwner: true,
          address: "Branch Admin Office"
        });
      }

      if (!staffRes.error && staffData) {
        combined = [...combined, ...staffData];
      }

      setProfiles(combined);

      // Update the cache with the freshest data
      sessionStorage.setItem(cacheKey, JSON.stringify(combined));

    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      staff_id: profile.staff_id,
      email: profile.email || "",
      password: "",
      phone: profile.phone,
      address: profile.address || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", staff_id: "", email: "", password: "", phone: "", address: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchFranchiseId) return alert("No Franchise ID selected.");
    if (!formData.email) return alert("Email is required.");

    const isEditingOwner = profiles.find(p => p.id === editingId)?.isOwner;
    if (isEditingOwner) return alert("Owner profiles must be updated via Account Settings.");

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
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone,
            address: formData.address
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
      } else {
        const tempSupabase = createClient(supabase.supabaseUrl, supabase.supabaseKey, { auth: { persistSession: false } });

        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        });

        if (authError) throw authError;

        const { password, ...dbPayload } = formData;

        await supabase.from('staff_profiles').insert([
          { ...dbPayload, id: authData.user.id, franchise_id: searchFranchiseId, email: formData.email.trim().toLowerCase() }
        ]);

        alert(`✅ Account created successfully! Verification email sent.`);
      }
      // Re-fetch in background to keep UI smooth
      fetchStaffProfiles(searchFranchiseId, true);
      closeModal();
    } catch (err) { alert("Error: " + err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("⚠️ Delete this user permanently?")) {
      try {
        const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
        if (error) throw error;

        alert("✅ Deleted successfully.");

        // Optimistic UI + Cache Update
        const updatedProfiles = profiles.filter(p => p.id !== id);
        setProfiles(updatedProfiles);
        sessionStorage.setItem(`staff_profiles_${searchFranchiseId}`, JSON.stringify(updatedProfiles));

      } catch (err) { alert("Error: " + err.message); }
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>
            User <span style={{ color: GREEN }}>Management</span>
          </h1>
          <div style={styles.idBox}>ID : {loggedInFranchiseId || "---"}</div>
        </div>
      </header>

      <main style={{ ...styles.mainContent, padding: isMobile ? "0 15px 20px 15px" : "0 40px 20px 40px" }}>
        <div style={{ ...styles.filterCard, padding: isMobile ? '12px' : '15px' }}>
          <form onSubmit={handleFranchiseFetch} style={{ ...styles.filterForm, flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
              <Building2 size={18} color={GREEN} />
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

        <div style={{ ...styles.actionRow, flexDirection: isMobile ? "row" : "row", gap: isMobile ? '8px' : '15px' }}>
          <div style={{ ...styles.searchContainer, flex: 1 }}>
            <Search size={18} style={styles.searchIcon} color="#94a3b8" />
            <input
              type="text"
              placeholder={isMobile ? "Search..." : "Search by name or ID..."}
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

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={styles.loaderCenter}><Loader2 className="animate-spin" color={GREEN} size={32} /></div>
            ) : filteredProfiles.length > 0 ? (
              filteredProfiles.map((p) => (
                <div key={p.id} style={{ ...styles.mobileCard, borderColor: expandedId === p.id ? GREEN : (p.isOwner ? '#cbd5e1' : BORDER) }}>
                  <div onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ ...styles.cardAvatar, background: p.isOwner ? `${GREEN}15` : (expandedId === p.id ? `${GREEN}15` : '#f3f4f6') }}>
                        {p.isOwner ? <ShieldCheck size={20} color={GREEN} /> : <User size={20} color={expandedId === p.id ? GREEN : '#64748b'} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: BLACK }}>{p.name} {p.isOwner && "(Owner)"}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {p.staff_id}</div>
                      </div>
                    </div>
                    {expandedId === p.id ? <ChevronDown size={20} color={GREEN} /> : <ChevronRight size={20} color="#cbd5e1" />}
                  </div>

                  {expandedId === p.id && (
                    <div style={styles.cardBody}>
                      <div style={styles.cardDetailGrid}>
                        <div style={styles.cardInfoRow}><Phone size={14} color={GREEN} /> {p.phone}</div>
                        <div style={styles.cardInfoRow}><Mail size={14} color={GREEN} /> {p.email || 'No Email'}</div>
                        <div style={styles.cardInfoRow}><MapPin size={14} color={GREEN} /> {p.address || 'No Address'}</div>
                      </div>
                      <div style={styles.cardActions}>
                        <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: p.id, targetName: p.name, franchiseId: searchFranchiseId } })} style={{ ...styles.cardActionBtn, color: '#2563eb', background: '#eff6ff' }}><Clock size={16} /> LOGS</button>
                        {!p.isOwner && <button onClick={() => handleOpenEdit(p)} style={{ ...styles.cardActionBtn, color: GREEN, background: `${GREEN}10` }}><Edit2 size={16} /> EDIT</button>}
                        {!p.isOwner && <button onClick={() => handleDelete(p.id)} style={{ ...styles.cardActionBtn, color: '#ef4444', background: '#fef2f2' }}><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>No profiles found.</div>
            )}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>S.NO</th>
                  <th style={styles.th}>TYPE</th>
                  <th style={styles.th}>NAME</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>PHONE</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '20px auto' }} /></td></tr>
                ) : filteredProfiles.map((profile, index) => (
                  <tr key={profile.id} style={{ ...styles.tr, background: profile.isOwner ? '#f8fafc' : 'transparent' }}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{profile.isOwner ? <span style={{ color: GREEN, fontWeight: '800' }}>OWNER</span> : "STAFF"}</td>
                    <td style={styles.td}>{profile.name}</td>
                    <td style={styles.td}>{profile.staff_id}</td>
                    <td style={styles.td}>{profile.phone}</td>
                    <td style={styles.actionTd}>
                      <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: profile.id, targetName: profile.name, franchiseId: searchFranchiseId } })} style={styles.timeBtn} title="View Logs"><Clock size={16} /></button>
                      {!profile.isOwner && <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn} title="Edit"><Edit2 size={16} /></button>}
                      {!profile.isOwner && <button onClick={() => handleDelete(profile.id)} style={styles.deleteBtn} title="Delete"><Trash2 size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? "95%" : "550px", borderRadius: "18px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}><UserPlus size={20} color={GREEN} /></div>
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? "20px" : "22px" }}>
                  {editingId ? "Update Staff" : "New Staff"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Staff ID *</label>
                <input required style={styles.input} type="text" value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password {!editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} placeholder={editingId ? "Blank to keep" : "Min 8 chars"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Email Address *</label>
                <input required style={styles.input} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="staff@domain.com" />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Residential Address</label>
                <textarea style={{ ...styles.input, height: '50px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
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
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 },
  mainContent: { width: "100%", display: "flex", flexDirection: "column", gap: "10px" },
  filterCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  filterForm: { display: 'flex', alignItems: 'center', gap: '12px' },
  filterLabel: { fontWeight: '700', fontSize: '13px', color: '#64748b' },
  filterInput: { padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '700', color: GREEN },
  fetchBtn: { padding: '10px 20px', background: BLACK, color: 'white', borderRadius: '10px', fontWeight: '800', border: 'none', cursor: 'pointer' },
  actionRow: { display: 'flex', marginBottom: '10px' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px' },
  searchInput: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '600', fontSize: '14px', background: 'white' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', background: GREEN, color: 'white', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: 'pointer' },
  mobileCard: { background: 'white', borderRadius: '18px', border: `1.5px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s ease' },
  cardHeader: { padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  cardAvatar: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: '0 16px 16px 16px', borderTop: `1px dashed ${BORDER}`, paddingTop: '16px' },
  cardDetailGrid: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' },
  cardInfoRow: { fontSize: '13px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px' },
  cardActions: { display: 'flex', gap: '8px' },
  cardActionBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', fontSize: '11px', fontWeight: '900', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '10px', padding: '16px' },
  timeBtn: { padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer' },
  editBtn: { padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: GREEN, border: 'none', cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '95vh' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  modalIconBox: { width: '40px', height: '40px', background: `${GREEN}10`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formGrid: { display: 'grid', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800', color: '#475569' },
  input: { padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, outline: 'none', fontSize: '14px', fontWeight: '600' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' },
  modalFooter: { display: 'flex', gap: '12px', marginTop: '15px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: 'white', fontWeight: '700', cursor: 'pointer' },
  submitBtn: { flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: GREEN, color: 'white', fontWeight: '800', cursor: 'pointer' },
  loaderCenter: { display: 'flex', justifyContent: 'center', padding: '50px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }
};

export default CentralStaffProfiles;