import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus,
  Loader2, Eye, EyeOff, Clock, User, Phone, ChevronRight, ChevronDown, Mail, Info, AlertCircle
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedId, setExpandedId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    staff_id: "",
    password: "",
    phone: "",
    email: "",
    address: ""
  });

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

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      staff_id: profile.staff_id,
      password: "",
      phone: profile.phone,
      email: profile.email || "",
      address: profile.address || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", staff_id: "", password: "", phone: "", email: "", address: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) return alert("Email is required.");
    setSubmitting(true);

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('staff_profiles')
          .update({
            name: formData.name,
            staff_id: formData.staff_id,
            phone: formData.phone,
            email: formData.email.trim().toLowerCase(),
            address: formData.address
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        if (formData.password && formData.password.trim() !== "") {
          await supabase.rpc('update_staff_password', {
            target_user_id: editingId,
            new_password: formData.password
          });
        }
        alert("Staff updated successfully!");
      } else {
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        const loginEmail = formData.email.trim().toLowerCase();
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: loginEmail,
          password: formData.password,
        });

        if (authError) throw authError;

        const dbPayload = {
          id: authData.user.id,
          name: formData.name,
          staff_id: formData.staff_id,
          phone: formData.phone,
          email: loginEmail,
          address: formData.address,
          franchise_id: franchiseId
        };

        const { error: dbError } = await supabase
          .from('staff_profiles')
          .insert([dbPayload]);

        if (dbError) throw dbError;
        alert(`New staff member created!`);
      }

      await fetchStaffProfiles(franchiseId);
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
      if (error) throw error;
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.staff_id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>Staff <span style={{ color: PRIMARY }}>Profiles</span></h1>
          <div style={styles.idBox}>FRANCHISE ID : {franchiseId || "---"}</div>
        </div>
      </header>

      <main style={{ ...styles.mainContent, padding: isMobile ? "0 15px 20px 15px" : "0 40px 20px 40px" }}>
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
            {!isMobile && <div style={styles.dateBadge}><Calendar size={16} />{new Date().toLocaleDateString('en-GB')}</div>}
            <button style={{ ...styles.addBtn, width: isMobile ? '100%' : 'auto' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> {isMobile ? "Add New" : "Add New Staff"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 className="animate-spin" size={32} color={PRIMARY} /></div>
        ) : filteredProfiles.length === 0 ? (
          <div style={styles.emptyState}><User size={48} style={{ opacity: 0.2, marginBottom: '10px' }} /><p>No staff profiles found.</p></div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }}>
            {filteredProfiles.map((p) => (
              <div key={p.id} style={styles.mobileCard}>
                <div onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={styles.mobileCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={styles.avatar}><User size={20} /></div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: BLACK }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {p.staff_id}</div>
                    </div>
                  </div>
                  {expandedId === p.id ? <ChevronDown size={18} color={PRIMARY} /> : <ChevronRight size={18} color="#cbd5e1" />}
                </div>
                {expandedId === p.id && (
                  <div style={styles.mobileCardBody}>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}><Phone size={12} /> {p.phone}</div>
                      <div style={styles.infoItem}><Mail size={12} /> {p.email}</div>
                    </div>
                    <div style={styles.mobileActions}>
                      <button onClick={() => navigate('/franchise/timings', { state: { targetUserId: p.id, targetName: p.name } })} style={{ ...styles.mobileBtn, background: '#eff6ff', color: '#2563eb' }}><Clock size={14} /> Timings</button>
                      <button onClick={() => handleOpenEdit(p)} style={{ ...styles.mobileBtn, background: '#f0fdf4', color: PRIMARY }}><Edit2 size={14} /> Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ ...styles.mobileBtn, background: '#fef2f2', color: '#ef4444' }}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>S.NO</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>NAME</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>STAFF ID</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>PHONE</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>EMAIL</th>
                  <th style={{ ...styles.th, width: '150px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p, index) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{String(index + 1).padStart(2, '0')}</td>
                    <td style={{ ...styles.td, fontWeight: '700', textAlign: 'left' }}>{p.name}</td>
                    <td style={{ ...styles.td, textAlign: 'left' }}><span style={styles.badge}>{p.staff_id}</span></td>
                    <td style={{ ...styles.td, textAlign: 'left' }}>{p.phone}</td>
                    <td style={{ ...styles.td, textAlign: 'left' }}>{p.email}</td>
                    <td style={{ ...styles.actionTd }}>
                      <button title="Timings" onClick={() => navigate('/franchise/timings', { state: { targetUserId: p.id, targetName: p.name } })} style={styles.iconBtn}><Clock size={16} /></button>
                      <button title="Edit" onClick={() => handleOpenEdit(p)} style={{ ...styles.iconBtn, color: PRIMARY }}><Edit2 size={16} /></button>
                      <button title="Delete" onClick={() => handleDelete(p.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
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
          <div style={{ ...styles.modalContent, width: isMobile ? '95%' : '600px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingId ? "Update Staff" : "Add New Staff Member"}</h2>
              <button onClick={closeModal} style={styles.closeBtn} aria-label="Close">
                <X size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.field}><label style={styles.label}>Full Name *</label><input required placeholder="Enter full name" style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div style={styles.field}><label style={styles.label}>Staff ID *</label><input required placeholder="e.g. STF001" style={styles.input} value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} /></div>

              <div style={styles.field}>
                <label style={styles.label}>{editingId ? "Reset Password" : "Login Password *"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>

              <div style={styles.field}><label style={styles.label}>Phone Number *</label><input required type="tel" maxLength="10" placeholder="10 digit mobile" style={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>

              <div style={{ ...styles.field, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Email Address *</label>
                <input required style={styles.input} type="email" placeholder="staff.name@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />

                {/* Red Alert Disclaimer */}
                <div style={styles.disclaimerBoxRed}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <AlertCircle size={20} color="#b91c1c" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: "800", color: "#991b1b" }}>Critical Requirement</span>
                      <p style={{ margin: 0, lineHeight: "1.4", fontSize: '11px' }}>
                        A unique email is <strong>strictly required</strong> for staff authentication. If they do not have one, you must create a new Gmail/Outlook account for them before proceeding. This email will be their permanent Login ID.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ ...styles.field, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Resident Address</label>
                <textarea placeholder="Enter current residential address" style={{ ...styles.input, height: '70px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div style={{ ...styles.modalFooter, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Discard</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>{submitting ? "Processing..." : editingId ? "Update Profile" : "Register Staff"}</button>
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
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', width: '100%', marginBottom: '24px' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { background: "none", border: "none", fontWeight: "700", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' },
  heading: { fontWeight: "900", textTransform: 'uppercase', fontSize: '20px', flex: 1, textAlign: 'center', letterSpacing: '0.5px' },
  idBox: { background: '#f1f5f9', borderRadius: '8px', padding: '8px 14px', fontSize: '11px', fontWeight: '900', color: '#475569', border: '1px solid #e2e8f0' },
  mainContent: { display: "flex", flexDirection: "column", gap: "10px" },
  actionRow: { display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '16px', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: `1px solid ${BORDER}`, outline: 'none', transition: 'border 0.2s', fontSize: '14px' },
  dateBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRadius: '12px', background: '#f1f5f9', fontSize: '12px', fontWeight: '700', color: '#475569' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: PRIMARY, border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(6, 95, 70, 0.2)' },
  emptyState: { textAlign: 'center', padding: '100px 0', color: '#94a3b8' },
  mobileCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  mobileCardHeader: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY },
  mobileCardBody: { padding: '0 16px 16px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '16px' },
  infoItem: { background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' },
  mobileActions: { display: 'flex', gap: '8px' },
  mobileBtn: { flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  tableContainer: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '16px 20px', fontSize: '11px', fontWeight: '800', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', background: '#f8fafc', letterSpacing: '0.05em' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '13px', color: '#334155', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  badge: { background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', border: '1px solid #e2e8f0' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '4px', padding: '16px' },
  iconBtn: { padding: '10px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { background: 'white', borderRadius: '24px', padding: '32px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '900', color: BLACK },
  closeBtn: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' },
  formGrid: { display: 'grid', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800', color: '#475569' },
  input: { padding: '12px 14px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px', background: '#fcfcfc' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  disclaimerBoxRed: {
    fontSize: '11px',
    color: '#991b1b',
    marginTop: '12px',
    background: '#fef2f2',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #fecaca'
  },
  modalFooter: { display: 'flex', gap: '12px', marginTop: '10px' },
  cancelBtn: { padding: '14px', borderRadius: '12px', border: `1px solid ${BORDER}`, background: 'white', fontWeight: '700', flex: 1, cursor: 'pointer', color: '#64748b' },
  submitBtn: { padding: '14px', borderRadius: '12px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '700', flex: 2, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(6, 95, 70, 0.2)' }
};

export default FranchiseProfiles;