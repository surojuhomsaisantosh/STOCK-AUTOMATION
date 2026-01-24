import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, Plus, Calendar, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Clock 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; 
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const BLACK = "#000000"; 

const FranchiseProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('franchise_id, company')
        .eq('id', user.id)
        .single();

      if (ownerError) throw ownerError;

      if (ownerProfile) {
        setFranchiseId(ownerProfile.franchise_id);
        setCompanyName(ownerProfile.company || "Your Company");
        await fetchStaffProfiles(ownerProfile.franchise_id);
      }
    } catch (err) {
      console.error("Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffProfiles = async (fid) => {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('id, name, staff_id, phone, email, address, aadhar_card, created_at')
      .eq('franchise_id', fid)
      .order('created_at', { ascending: false });

    if (!error) setProfiles(data || []);
  };

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      staff_id: profile.staff_id,
      password: "UNCHANGED",
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

    try {
      if (editingId) {
        // --- UPDATE ---
        const { error } = await supabase
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

        if (error) throw error;
        alert("Profile updated successfully!");
        fetchStaffProfiles(franchiseId);
      } else {
        // --- CREATE ---
        const loginEmail = formData.email || `${formData.staff_id}@${franchiseId.toLowerCase()}.com`;
        
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
            franchise_id: franchiseId,
            email: loginEmail 
          }]);

        if (dbError) throw dbError;
        alert("Staff created successfully!");
        fetchStaffProfiles(franchiseId);
      }
      closeModal();
      
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- FIXED DELETE LOGIC WITH CONFIRMATION ---
  const handleDelete = async (id) => {
    // 1. Ask for confirmation
    if (window.confirm("⚠️ Are you sure you want to permanently delete this staff member? All their data will be wiped.")) {
      
      try {
        console.log("Deleting ID:", id);
        
        // 2. Call the Database Function
        const { error } = await supabase.rpc('delete_staff_user', { target_id: id });
        
        // 3. Handle Errors
        if (error) {
            console.error("Delete Error:", error);
            if (error.message.includes("function delete_staff_user") || error.message.includes("does not exist")) {
                alert("❌ ERROR: You missed Step 1. Please run the SQL code in Supabase to create the delete function.");
            } else {
                alert("❌ Delete Failed: " + error.message);
            }
            return;
        }
        
        // 4. Success
        alert("✅ User deleted successfully.");
        
        // 5. Update UI immediately
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
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.headerRow}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={styles.mainHeading}>Manage Profiles</h1>
        <div style={styles.franchiseIdLabel}>
          FRANCHISE ID : <span style={{ color: PRIMARY }}>{franchiseId || "..."}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={styles.actionRow}>
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search staff..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={styles.dateBtn}>
          <Calendar size={18} />
          {new Date().toLocaleDateString('en-GB')}
        </div>

        <button style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add New User
        </button>
      </div>

      {/* TABLE */}
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
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" style={{ margin: '0 auto', color: PRIMARY }} />
                </td>
              </tr>
            ) : filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile, index) => (
                <tr 
                  key={profile.id} 
                  style={{ 
                    ...styles.tr, 
                    backgroundColor: editingId === profile.id ? "rgba(6, 95, 70, 0.05)" : "transparent",
                    borderLeft: editingId === profile.id ? `4px solid ${PRIMARY}` : "4px solid transparent"
                  }}
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>{companyName}</td>
                  <td style={styles.td}>{profile.name}</td>
                  <td style={styles.td}>{profile.staff_id}</td>
                  <td style={styles.td}>{profile.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => navigate('/franchise/timings')} style={styles.timeBtn} title="Login Timings">
                      <Clock size={16} />
                    </button>
                    <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(profile.id)} style={styles.deleteBtn} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{...styles.td, textAlign: 'center'}}>No staff profiles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus color={PRIMARY} />
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK }}>
                  {editingId ? "Edit Staff Profile" : "Create Staff Account"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Staff ID *</label>
                <input required style={styles.input} type="text" value={formData.staff_id} onChange={e => setFormData({...formData, staff_id: e.target.value})} />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    required={!editingId}
                    disabled={!!editingId}
                    style={{ ...styles.input, width: '100%' }} 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  {!editingId && (
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={styles.eyeBtn}
                    >
                      {showPassword ? <EyeOff size={18} color={BLACK} /> : <Eye size={18} color={BLACK} />}
                    </button>
                  )}
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
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>
                  {submitting ? "Processing..." : editingId ? "Save Changes" : "Create Account"}
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
  page: { padding: "40px", background: "#f9fafb", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: BLACK, fontWeight: '700', cursor: 'pointer' },
  mainHeading: { fontWeight: "900", margin: 0, fontSize: '28px', letterSpacing: '-0.5px', color: BLACK },
  franchiseIdLabel: { fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px', color: BLACK },
  actionRow: { display: 'flex', gap: '15px', marginBottom: '30px', alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '15px', color: BLACK },
  searchInput: { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px', color: BLACK },
  dateBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '12px', background: 'white', border: `1px solid ${BORDER}`, fontWeight: '700', color: BLACK },
  addBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px', borderRadius: '12px', background: PRIMARY, border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' },
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '20px', fontSize: '12px', fontWeight: '900', color: BLACK, borderBottom: `1px solid ${BORDER}`, letterSpacing: '1px' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'all 0.2s' },
  td: { padding: '20px', fontSize: '14px', fontWeight: '600', color: BLACK },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '10px', padding: '20px' },
  
  // BUTTON STYLES
  timeBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: '#2563eb', cursor: 'pointer' },
  editBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: PRIMARY, cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: '#f3f4f6', color: '#ef4444', cursor: 'pointer' },
  
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', width: '600px', borderRadius: '24px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: BLACK },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: BLACK },
  input: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px', color: BLACK },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  modalFooter: { gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' },
  cancelBtn: { padding: '12px 20px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: 'white', fontWeight: '700', color: BLACK, cursor: 'pointer' },
  submitBtn: { padding: '12px 25px', borderRadius: '10px', border: 'none', background: PRIMARY, color: 'white', fontWeight: '700', cursor: 'pointer' }
};

export default FranchiseProfiles;