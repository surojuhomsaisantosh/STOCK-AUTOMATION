import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff,
  Clock, ChevronRight, User, Phone, ChevronDown, MapPin, Mail, ShieldCheck, AlertCircle
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#111827";

// OPTIMIZATION: Isolated Auth Client with UNIQUE storage key and config to stop conflicts
const authAdminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'sb-staff-manager-storage', // Prevents collision with main app
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const FranchiseProfiles = () => {
  const navigate = useNavigate();
  const isMounted = useRef(true);

  // --- CACHE KEYS ---
  const CACHE_KEY_PROFILES = "franchise_profiles_data";
  const CACHE_KEY_FID = "franchise_id_context";

  // --- STATE WITH INSTANT LOAD ---
  const [profiles, setProfiles] = useState(() => {
    const cached = sessionStorage.getItem(CACHE_KEY_PROFILES);
    return cached ? JSON.parse(cached) : [];
  });

  const [franchiseId, setFranchiseId] = useState(() => {
    return sessionStorage.getItem(CACHE_KEY_FID) || "...";
  });

  const [loading, setLoading] = useState(profiles.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "", staff_id: "", password: "", phone: "", email: "", address: ""
  });

  useEffect(() => {
    isMounted.current = true;
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    initFlow();
    return () => {
      isMounted.current = false;
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const initFlow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ownerRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('id, franchise_id, company, email, phone').eq('id', user.id).single(),
        supabase.from('staff_profiles').select('*').eq('franchise_id', franchiseId === "..." ? "" : franchiseId).order('created_at', { ascending: false })
      ]);

      if (ownerRes.data) {
        const op = ownerRes.data;
        setFranchiseId(op.franchise_id);
        sessionStorage.setItem(CACHE_KEY_FID, op.franchise_id);

        const combined = [
          { ...op, name: op.company || "Owner", staff_id: "OWNER/ADMIN", isOwner: true, address: "Main Branch Office" },
          ...(staffRes.data || [])
        ];

        if (isMounted.current) {
          setProfiles(combined);
          sessionStorage.setItem(CACHE_KEY_PROFILES, JSON.stringify(combined));
        }
      }
    } catch (err) {
      console.error("Init Flow Error:", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const cleanEmail = formData.email.trim().toLowerCase();
    console.log("DEBUG: Submission triggered for", cleanEmail);

    try {
      if (editingId) {
        // UPDATE STAFF
        const { error } = await supabase
          .from('staff_profiles')
          .update({
            name: formData.name,
            staff_id: formData.staff_id,
            phone: formData.phone,
            email: cleanEmail,
            address: formData.address
          })
          .eq('id', editingId);

        if (error) throw error;

        if (formData.password?.trim()) {
          await supabase.rpc('update_staff_password', {
            target_user_id: editingId,
            new_password: formData.password
          });
        }
      } else {
        // REGISTER NEW STAFF
        console.log("DEBUG: Attempting Auth Signup...");
        const { data: authData, error: authError } = await authAdminClient.auth.signUp({
          email: cleanEmail,
          password: formData.password,
          options: {
            data: {
              role: 'staff',
              name: formData.name,
              franchise_id: franchiseId
            }
          }
        });

        if (authError) throw new Error(`Auth Error: ${authError.message}`);
        if (!authData?.user) throw new Error("User creation failed.");

        console.log("DEBUG: Auth success. Creating DB Profile...");

        const { error: dbError } = await supabase.from('staff_profiles').insert([{
          id: authData.user.id,
          name: formData.name,
          staff_id: formData.staff_id,
          phone: formData.phone,
          email: cleanEmail,
          address: formData.address,
          franchise_id: franchiseId
        }]);

        if (dbError) throw new Error(`Database Error: ${dbError.message}`);
      }

      await initFlow();
      closeModal();
      alert("Staff profile saved successfully!");
    } catch (err) {
      console.error("DEBUG: Submission failed:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff member permanently?")) return;
    try {
      const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
      if (error) throw error;
      const updated = profiles.filter(p => p.id !== id);
      setProfiles(updated);
      sessionStorage.setItem(CACHE_KEY_PROFILES, JSON.stringify(updated));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p =>
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.staff_id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setShowPassword(false);
    setFormData({ name: "", staff_id: "", password: "", phone: "", email: "", address: "" });
  };

  const handleOpenEdit = (profile) => {
    if (profile.isOwner) return alert("Owner profiles must be updated via Account Settings.");
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={18} /> Back</button>
          <h1 style={styles.heading}>Staff <span style={{ color: PRIMARY }}>Management</span></h1>
          <div style={styles.idBox}>ID: {franchiseId}</div>
        </div>
      </header>

      <main style={{ ...styles.mainContent, padding: isMobile ? "0 15px 20px 15px" : "0 40px 20px 40px" }}>
        <div style={styles.actionRow}>
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search staff..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> {!isMobile && "Add New Staff"}
          </button>
        </div>

        {loading && profiles.length === 0 ? (
          <div style={styles.loaderCenter}><Loader2 className="animate-spin" size={32} color={PRIMARY} /></div>
        ) : (
          isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredProfiles.map((p) => (
                <div key={p.id} style={{ ...styles.mobileCard, borderColor: p.isOwner ? PRIMARY : BORDER }}>
                  <div onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ ...styles.cardAvatar, background: p.isOwner ? `${PRIMARY}15` : '#f3f4f6' }}>
                        {p.isOwner ? <ShieldCheck size={20} color={PRIMARY} /> : <User size={20} color='#64748b' />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: BLACK }}>{p.name} {p.isOwner && <span style={{ color: PRIMARY, fontSize: '10px' }}>(OWNER)</span>}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {p.staff_id}</div>
                      </div>
                    </div>
                    {expandedId === p.id ? <ChevronDown size={20} color={PRIMARY} /> : <ChevronRight size={20} color="#cbd5e1" />}
                  </div>
                  {expandedId === p.id && (
                    <div style={styles.cardBody}>
                      <div style={styles.cardDetailGrid}>
                        <div style={styles.cardInfoRow}><Phone size={14} color={PRIMARY} /> {p.phone}</div>
                        <div style={styles.cardInfoRow}><Mail size={14} color={PRIMARY} /> {p.email}</div>
                        <div style={styles.cardInfoRow}><MapPin size={14} color={PRIMARY} /> {p.address}</div>
                      </div>
                      <div style={styles.cardActions}>
                        <button onClick={() => navigate('/franchise/timings', { state: { targetUserId: p.id, targetName: p.name } })} style={{ ...styles.cardActionBtn, color: '#2563eb', background: '#eff6ff' }}><Clock size={16} /> LOGS</button>
                        {!p.isOwner && (
                          <>
                            <button onClick={() => handleOpenEdit(p)} style={{ ...styles.cardActionBtn, color: PRIMARY, background: `${PRIMARY}10` }}><Edit2 size={16} /> EDIT</button>
                            <button onClick={() => handleDelete(p.id)} style={{ ...styles.cardActionBtn, color: '#ef4444', background: '#fef2f2' }}><Trash2 size={16} /></button>
                          </>
                        )}
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
                  {filteredProfiles.map((p, index) => (
                    <tr key={p.id} style={{ ...styles.tr, background: p.isOwner ? '#f0fdf4' : 'transparent' }}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>{p.isOwner ? "OWNER" : "STAFF"}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{p.name}</td>
                      <td style={styles.td}>{p.staff_id}</td>
                      <td style={styles.td}>{p.phone}</td>
                      <td style={styles.actionTd}>
                        <button onClick={() => navigate('/franchise/timings', { state: { targetUserId: p.id, targetName: p.name } })} style={styles.timeBtn}><Clock size={16} /></button>
                        {!p.isOwner && <button onClick={() => handleOpenEdit(p)} style={styles.editBtn}><Edit2 size={16} /></button>}
                        {!p.isOwner && <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn}><Trash2 size={16} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? "95%" : "550px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}><UserPlus size={20} color={PRIMARY} /></div>
                <h2 style={{ margin: 0, fontWeight: '800' }}>{editingId ? "Update Staff" : "New Staff"}</h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.inputGroup}><label style={styles.label}>Full Name *</label><input required style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Staff ID *</label><input required style={styles.input} value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} /></div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password {!editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} placeholder={editingId ? "Min 6 chars" : "Password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div style={styles.inputGroup}><label style={styles.label}>Phone Number *</label><input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Email Address *</label>
                <input required style={styles.input} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '60px', resize: 'none' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div style={{ ...styles.modalFooterFixed }}>
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
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { background: "none", border: "none", fontWeight: "700", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' },
  heading: { fontWeight: "900", textTransform: 'uppercase', fontSize: '18px', flex: 1, textAlign: 'center' },
  idBox: { background: '#f1f5f9', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '900', color: '#475569', border: '1px solid #e2e8f0' },
  mainContent: { display: "flex", flexDirection: "column", gap: "10px" },
  actionRow: { display: 'flex', gap: '10px', marginBottom: '15px' },
  searchContainer: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px' },
  searchInput: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '600', fontSize: '14px', background: 'white' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', background: PRIMARY, color: 'white', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: 'pointer' },
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
  editBtn: { padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: PRIMARY, border: 'none', cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '28px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '95vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalIconBox: { width: '40px', height: '40px', background: `${PRIMARY}10`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formGrid: { display: 'grid', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800', color: '#475569' },
  input: { padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, outline: 'none', fontSize: '14px', fontWeight: '600' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' },
  modalFooterFixed: { gridColumn: "span 2", display: 'flex', gap: '10px', marginTop: '10px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: 'white', fontWeight: '700', cursor: 'pointer' },
  submitBtn: { flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '800', cursor: 'pointer' },
  loaderCenter: { display: 'flex', justifyContent: 'center', padding: '50px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '600' }
};

export default FranchiseProfiles;