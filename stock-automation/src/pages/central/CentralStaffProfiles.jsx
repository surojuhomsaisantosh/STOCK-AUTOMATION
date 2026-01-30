import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Clock, Building2, ChevronRight 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; 
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000"; 

const CentralStaffProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  
  // Responsive State
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;

  // STATE: Header & Search
  const [loggedInFranchiseId, setLoggedInFranchiseId] = useState("");
  const [searchFranchiseId, setSearchFranchiseId] = useState(""); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [companyName, setCompanyName] = useState(""); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "", staff_id: "", password: "", phone: "", email: "", address: "", aadhar_card: ""
  });

  useEffect(() => {
    fetchInitialData();
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
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

            if (passwordError) {
                alert("⚠️ Profile updated, but Password failed to reset.");
            } else {
                alert("✅ Profile updated and Password successfully reset!");
            }
        } else {
            alert("✅ Profile updated successfully!");
        }
        fetchStaffProfiles(searchFranchiseId);
      } else {
        const loginEmail = formData.email || `${formData.staff_id}@${searchFranchiseId.toLowerCase()}.com`;
        const tempSupabase = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: loginEmail,
          password: formData.password,
        });

        if (authError) throw authError;

        const { password, ...dbPayload } = formData;
        const { error: dbError } = await supabase
          .from('staff_profiles')
          .insert([{
            ...dbPayload,
            id: authData.user.id,
            franchise_id: searchFranchiseId, 
            email: loginEmail 
          }]);

        if (dbError) throw dbError;
        alert("Staff created successfully!");
        fetchStaffProfiles(searchFranchiseId);
      }
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("⚠️ Are you sure? This will wipe the user AND all their data.")) {
      try {
        const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
        if (error) {
           alert("❌ Delete Failed: " + error.message);
           return;
        }
        alert("✅ Deleted successfully.");
        setProfiles(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert("System Error: " + err.message);
      }
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.staff_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{...styles.page, padding: isMobile ? '20px' : '40px'}}>
      
      {/* === HEADER START === */}
      <div style={{
        ...styles.headerRow, 
        flexDirection: isMobile ? 'column' : 'row', 
        alignItems: isMobile ? 'center' : 'center', 
        gap: isMobile ? '12px' : '0'
      }}>
        
        {/* MOBILE: Top Row with Back + ID */}
        {isMobile ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ArrowLeft size={18} /> Back
                </button>
                <div style={styles.franchiseIdLabel}>
                    ID : <span style={{ color: PRIMARY }}>{loggedInFranchiseId}</span>
                </div>
            </div>
        ) : (
            // DESKTOP: Back button (Left)
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
                <ArrowLeft size={18} /> Back
            </button>
        )}

        {/* HEADING (Centered on Mobile) */}
        <h1 style={{
            ...styles.mainHeading, 
            fontSize: isMobile ? '22px' : '28px', 
            textAlign: isMobile ? 'center' : 'left'
        }}>
            Central Staff Profiles
        </h1>

        {/* DESKTOP: ID (Right) - Only show if NOT mobile */}
        {!isMobile && (
            <div style={styles.franchiseIdLabel}>
                ID : <span style={{ color: PRIMARY }}>{loggedInFranchiseId}</span>
            </div>
        )}
      </div>
      {/* === HEADER END === */}

      {/* FILTER */}
      <div style={styles.filterCard}>
        <form onSubmit={handleFranchiseFetch} style={{...styles.filterForm, flexDirection: isMobile ? 'column' : 'row'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Building2 size={20} color={PRIMARY} />
                <span style={styles.filterLabel}>Target Franchise ID:</span>
            </div>
            <div style={{display: 'flex', gap: '10px', flex: 1, width: isMobile ? '100%' : 'auto'}}>
                <input 
                    type="text" 
                    placeholder="E.g., HYD001" 
                    value={searchFranchiseId}
                    onChange={(e) => setSearchFranchiseId(e.target.value.toUpperCase())}
                    style={{...styles.filterInput, flex: 1}}
                />
                <button type="submit" style={styles.fetchBtn}>
                    {isMobile ? "Load" : "Load Profiles"} <ChevronRight size={16} />
                </button>
            </div>
        </form>
      </div>

      {/* ACTIONS */}
      <div style={{...styles.actionRow, flexDirection: isMobile ? 'column' : 'row'}}>
        <div style={{...styles.searchContainer, width: isMobile ? '100%' : 'auto'}}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search loaded staff..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto'}}>
            <div style={{...styles.dateBtn, flex: 1}}>
            <Calendar size={18} />
            {new Date().toLocaleDateString('en-GB')}
            </div>
            <button style={{...styles.addBtn, flex: 1}} onClick={() => {
                if(!searchFranchiseId) alert("Please enter and load a Franchise ID first.");
                else setIsModalOpen(true);
            }}>
            <Plus size={18} /> Add
            </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.tableContainer}>
        <table style={{...styles.table, minWidth: isMobile ? '800px' : '100%'}}>
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
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" style={{ margin: '0 auto', color: PRIMARY }} />
                </td>
              </tr>
            ) : filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile, index) => (
                <tr key={profile.id} style={styles.tr}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>{companyName}</td>
                  <td style={styles.td}>{profile.name}</td>
                  <td style={styles.td}>{profile.staff_id}</td>
                  <td style={styles.td}>{profile.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => navigate('/central/staff-logins', { state: { targetUserId: profile.id, targetName: profile.name, franchiseId: searchFranchiseId }})} style={styles.timeBtn}><Clock size={16} /></button>
                    <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(profile.id)} style={styles.deleteBtn}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                  <td colSpan="6" style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>
                    {searchFranchiseId ? "No staff found." : "Enter a Franchise ID above."}
                  </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{...styles.modalContent, width: isMobile ? '95%' : '600px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus color={PRIMARY} />
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? '18px' : '22px' }}>
                  {editingId ? "Edit Staff" : "Create Staff"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>
            
            <div style={styles.franchiseContextBox}>
                Franchise: <strong>{searchFranchiseId}</strong>
            </div>

            <form onSubmit={handleSubmit} style={{...styles.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Staff ID *</label>
                <input required style={styles.input} type="text" value={formData.staff_id} onChange={e => setFormData({...formData, staff_id: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password {editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%' }} type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingId ? "New password" : "Enter password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Aadhar Card</label>
                <input style={styles.input} type="text" value={formData.aadhar_card} onChange={e => setFormData({...formData, aadhar_card: e.target.value})} />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>
                  {submitting ? "..." : editingId ? "Update" : "Create"}
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
  headerRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: BLACK, fontWeight: '700', cursor: 'pointer' },
  mainHeading: { fontWeight: "900", margin: 0, letterSpacing: '-0.5px', color: BLACK },
  franchiseIdLabel: { fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: BLACK },
  filterCard: { background: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${BORDER}`, marginBottom: '30px' },
  filterForm: { display: 'flex', alignItems: 'center', gap: '20px' },
  filterLabel: { fontWeight: '700', fontSize: '14px', color: '#374151' },
  filterInput: { padding: '12px 16px', borderRadius: '10px', border: `2px solid ${BORDER}`, fontSize: '14px', outline: 'none', fontWeight: '600', color: BLACK },
  fetchBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: BLACK, color: 'white', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer' },
  actionRow: { display: 'flex', gap: '15px', marginBottom: '30px', alignItems: 'center' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1 },
  searchIcon: { position: 'absolute', left: '15px', color: BLACK },
  searchInput: { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px' },
  dateBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px', background: 'white', border: `1px solid ${BORDER}`, fontWeight: '700', fontSize: '12px' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px', borderRadius: '12px', background: PRIMARY, border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' },
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '20px', fontSize: '12px', fontWeight: '900', color: BLACK, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '20px', fontSize: '14px', fontWeight: '600', color: BLACK, whiteSpace: 'nowrap' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '10px', padding: '20px' },
  timeBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: '#2563eb', cursor: 'pointer' },
  editBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: PRIMARY, cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: '#ef4444', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '24px', padding: '30px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  franchiseContextBox: { background: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' },
  formGrid: { display: 'grid', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800' },
  input: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' },
  cancelBtn: { padding: '12px 20px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: 'white', fontWeight: '700' },
  submitBtn: { padding: '12px 25px', borderRadius: '10px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '700' }
};

export default CentralStaffProfiles;