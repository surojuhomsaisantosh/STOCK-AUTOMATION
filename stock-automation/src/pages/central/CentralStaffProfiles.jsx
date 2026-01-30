import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Clock, Building2, ChevronRight, User, Phone, ChevronDown
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
          else alert("✅ Profile updated and Password reset!");
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
    if (window.confirm("⚠️ Are you sure? This will wipe the user AND all their data.")) {
      try {
        const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
        if (error) throw error;
        alert("✅ Deleted successfully.");
        setProfiles(prev => prev.filter(p => p.id !== id));
      } catch (err) { alert("System Error: " + err.message); }
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ ...styles.page, padding: isMobile ? "15px" : "40px" }}>
      {/* HEADER */}
      <div style={{ ...styles.headerRow, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "15px" : "0" }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={{ ...styles.mainHeading, fontSize: isMobile ? "22px" : "28px" }}>Central Staff</h1>
        <div style={{ ...styles.franchiseIdLabel, width: isMobile ? "100%" : "auto", textAlign: "center" }}>
          Franchise : <span style={{ color: PRIMARY }}>{loggedInFranchiseId}</span>
        </div>
      </div>

      {/* FILTER SEARCH AREA */}
      <div style={styles.filterCard}>
        <form onSubmit={handleFranchiseFetch} style={{ ...styles.filterForm, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={20} color={PRIMARY} />
            <span style={styles.filterLabel}>Target Franchise:</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: "100%", flex: 1 }}>
            <input
              type="text"
              placeholder="Franchise ID (e.g., HYD001)"
              value={searchFranchiseId}
              onChange={(e) => setSearchFranchiseId(e.target.value.toUpperCase())}
              style={{ ...styles.filterInput, flex: 1 }}
            />
            <button type="submit" style={styles.fetchBtn}>
              {isMobile ? "LOAD" : "Load Profiles"}
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH AND ADD ACTION ROW */}
      <div style={{ ...styles.actionRow, flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ ...styles.searchContainer, width: "100%" }}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search loaded staff..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', width: isMobile ? "100%" : "auto", gap: "10px" }}>
          {!isMobile && (
            <div style={styles.dateBtn}>
              <Calendar size={18} />
              {new Date().toLocaleDateString('en-GB')}
            </div>
          )}
          <button style={{ ...styles.addBtn, flex: isMobile ? 1 : "none" }} onClick={() => {
            if (!searchFranchiseId) alert("Load a Franchise ID first.");
            else setIsModalOpen(true);
          }}>
            <Plus size={18} /> {isMobile ? "ADD" : "Add New User"}
          </button>
        </div>
      </div>

      {/* DATA VIEW: TABLE OR CARDS */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" color={PRIMARY} /></div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((p) => (
              <div key={p.id} style={styles.mobileCard}>
                <div onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={styles.cardAvatar}><User size={20} /></div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '15px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {p.staff_id}</div>
                    </div>
                  </div>
                  {expandedId === p.id ? <ChevronDown size={18} /> : <ChevronRight size={18} opacity={0.3} />}
                </div>
                {expandedId === p.id && (
                  <div style={styles.cardBody}>
                    <div style={styles.cardInfoRow}><Phone size={12} /> {p.phone}</div>
                    <div style={styles.cardInfoRow}><Building2 size={12} /> {companyName}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px', borderTop: `1px solid ${BORDER}`, paddingTop: '15px' }}>
                      <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: p.id, targetName: p.name, franchiseId: searchFranchiseId } })} style={{ ...styles.cardActionBtn, color: '#2563eb', background: '#eff6ff' }}><Clock size={16} /> LOGS</button>
                      <button onClick={() => handleOpenEdit(p)} style={{ ...styles.cardActionBtn, color: PRIMARY, background: `${PRIMARY}10` }}><Edit2 size={16} /> EDIT</button>
                      <button onClick={() => handleDelete(p.id)} style={{ ...styles.cardActionBtn, color: '#ef4444', background: '#fef2f2' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No profiles loaded.</div>
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
                <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
              ) : filteredProfiles.map((profile, index) => (
                <tr key={profile.id} style={{ ...styles.tr, backgroundColor: editingId === profile.id ? "rgba(6, 95, 70, 0.05)" : "transparent" }}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>{companyName}</td>
                  <td style={styles.td}>{profile.name}</td>
                  <td style={styles.td}>{profile.staff_id}</td>
                  <td style={styles.td}>{profile.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: profile.id, targetName: profile.name, franchiseId: searchFranchiseId } })} style={styles.timeBtn}><Clock size={16} /></button>
                    <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(profile.id)} style={styles.deleteBtn}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? "95%" : "600px", height: isMobile ? "90vh" : "auto", overflowY: isMobile ? "auto" : "visible" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus color={PRIMARY} />
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? "18px" : "24px" }}>
                  {editingId ? "Edit Staff" : "Add Staff"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.inputGroup}><label style={styles.label}>Full Name *</label><input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Staff ID *</label><input required style={styles.input} type="text" value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} /></div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password {editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div style={styles.inputGroup}><label style={styles.label}>Phone Number *</label><input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Email</label><input style={styles.input} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Aadhar Card</label><input style={styles.input} type="text" value={formData.aadhar_card} onChange={e => setFormData({ ...formData, aadhar_card: e.target.value })} /></div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div style={{ ...styles.modalFooter, gridColumn: isMobile ? "span 1" : "span 2" }}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>{submitting ? "..." : "Save"}</button>
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
  headerRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: BLACK, fontWeight: '700', cursor: 'pointer' },
  mainHeading: { fontWeight: "900", margin: 0, letterSpacing: '-0.5px' },
  franchiseIdLabel: { fontWeight: '800', background: "#fff", padding: "8px 16px", borderRadius: "10px", border: `1px solid ${BORDER}` },
  filterCard: { background: 'white', padding: '15px', borderRadius: '16px', border: `1px solid ${BORDER}`, marginBottom: '25px' },
  filterForm: { display: 'flex', alignItems: 'center', gap: '15px' },
  filterLabel: { fontWeight: '700', fontSize: '13px' },
  filterInput: { padding: '12px', borderRadius: '10px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '800' },
  fetchBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: BLACK, color: 'white', borderRadius: '10px', fontWeight: '800', border: 'none' },
  actionRow: { display: 'flex', gap: '15px', marginBottom: '25px' },
  searchContainer: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '15px' },
  searchInput: { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: `1px solid ${BORDER}`, outline: 'none' },
  dateBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', background: 'white', border: `1px solid ${BORDER}`, borderRadius: '12px', fontWeight: '700' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: PRIMARY, color: 'white', borderRadius: '12px', fontWeight: '800', border: 'none' },
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '18px', fontSize: '11px', fontWeight: '900', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '18px', fontSize: '14px', fontWeight: '600' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '18px' },
  timeBtn: { padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: 'none' },
  editBtn: { padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: PRIMARY, border: 'none' },
  deleteBtn: { padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: 'none' },
  mobileCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  cardHeader: { padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardAvatar: { width: '40px', height: '40px', borderRadius: '10px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY },
  cardBody: { padding: '0 15px 15px 15px' },
  cardInfoRow: { fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  cardActionBtn: { flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  roleBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '24px', padding: '25px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  formGrid: { display: 'grid', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800' },
  input: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none' },
  modalFooter: { display: 'flex', gap: '10px', marginTop: '10px' },
  cancelBtn: { padding: '12px 20px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: 'white', fontWeight: '700' },
  submitBtn: { padding: '12px 25px', borderRadius: '10px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '800' }
};

export default CentralStaffProfiles;