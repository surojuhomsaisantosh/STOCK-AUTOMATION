import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, X, Users, RefreshCw, Phone, Layers 
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

// --- THEME CONSTANTS ---
const PRIMARY = "#065f46"; 
const BORDER = "#e5e7eb";
const BLACK = "#000000";
const BG_GRAY = "#f8fafc";

const CentralVendors = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [franchiseId, setFranchiseId] = useState(""); 
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("date"); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", category: "", phone: "" });

  // --- LIFECYCLE ---
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (franchiseId) fetchVendors();
  }, [franchiseId]);

  // --- DATA FETCHING ---
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('franchise_id')
        .eq('id', user.id)
        .single();
      if (profile) setFranchiseId(profile.franchise_id || "CENTRAL");
    } catch (err) {
      console.error("User fetch error:", err);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching vendors:", error);
    else setVendors(data || []);
    setLoading(false);
  };

  // --- HANDLERS ---
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: "", category: "", phone: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingId(vendor.id);
    setFormData({ 
      name: vendor.name, 
      category: vendor.category || "", 
      phone: vendor.phone 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!franchiseId) return alert("Franchise ID missing.");
    setSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('vendors')
          .update({ 
            name: formData.name, 
            category: formData.category, 
            phone: formData.phone 
          })
          .eq('id', editingId);
        if (error) throw error;
        alert("Vendor updated successfully!");
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert([{ ...formData, franchise_id: franchiseId }]);
        if (error) throw error;
        alert("Vendor added successfully!");
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedCategory("All");
  };

  const openWhatsApp = (phone) => {
    if (!phone) return alert("No phone number available");
    const cleanNumber = phone.replace(/[^0-9]/g, ''); 
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  // --- LOGIC: Extract Unique Categories ---
  const uniqueCategories = ["All", ...new Set(vendors.map(v => v.category || "Uncategorized"))].sort();

  // --- LOGIC: Filter Vendors ---
  const filteredVendors = vendors.filter(v => {
    // 1. Category Filter
    const vendorCat = v.category || "Uncategorized";
    if (selectedCategory !== "All" && vendorCat !== selectedCategory) return false;

    // 2. Text Search
    const matchText = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      vendorCat.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchText) return false;

    // 3. Date Filter
    const createdDate = new Date(v.created_at).toISOString().split('T')[0];
    if (filterType === 'date') return createdDate === selectedDate;
    else return createdDate >= startDate && createdDate <= endDate;
  });

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.headerRow}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={styles.mainHeading}>Vendors List</h1>
        <div style={styles.franchiseLabel}>
          Franchise ID : <span style={{ color: PRIMARY }}>{franchiseId}</span>
        </div>
      </div>

      {/* CONTROLS (Search, Dates, Add Button) */}
      <div style={styles.controlsRow}>
        <div style={styles.filtersGroup}>
          <div style={styles.searchBox}>
            <Search size={18} color="#64748b" />
            <input 
              placeholder="Search vendors..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.toggleContainer}>
             <button 
               style={filterType === 'date' ? styles.toggleBtnActive : styles.toggleBtn} 
               onClick={() => setFilterType('date')}
             >
               Date
             </button>
             <button 
               style={filterType === 'range' ? styles.toggleBtnActive : styles.toggleBtn} 
               onClick={() => setFilterType('range')}
             >
               Range
             </button>
          </div>

          {filterType === 'date' ? (
             <input type="date" style={styles.dateInput} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          ) : (
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
               <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
               <span style={{color:'#94a3b8'}}>-</span>
               <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}

          <button onClick={resetFilters} style={styles.resetBtn} title="Reset Filters">
             <RefreshCw size={16} />
          </button>
        </div>

        <button onClick={handleOpenAdd} style={styles.addBtn}>
           <Plus size={18} /> Add a vendor
        </button>
      </div>

      {/* CATEGORY TABS (Outside Table) */}
      <div style={styles.categoryBar}>
        {uniqueCategories.map(cat => (
            <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={selectedCategory === cat ? styles.catBtnActive : styles.catBtn}
            >
                {selectedCategory === cat && <Layers size={14} />}
                {cat}
            </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>SERIAL NUMBER</th>
              <th style={styles.th}>NAME</th>
              <th style={styles.th}>PHONE</th>
              <th style={{...styles.th, textAlign: 'center'}}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{padding:'40px', textAlign:'center'}}>Loading...</td></tr>
            ) : filteredVendors.length > 0 ? (
              filteredVendors.map((vendor, index) => (
                <tr key={vendor.id} style={styles.tr}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={{...styles.td, fontWeight: '600'}}>{vendor.name}</td>
                  {/* CATEGORY COLUMN REMOVED */}
                  <td style={styles.td}>{vendor.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => handleOpenEdit(vendor)} style={styles.iconBtn} title="Edit">
                      <Edit2 size={16} color={PRIMARY} />
                    </button>
                    <button onClick={() => handleDelete(vendor.id)} style={styles.iconBtn} title="Delete">
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                    <button onClick={() => openWhatsApp(vendor.phone)} style={styles.waBtn} title="Chat on WhatsApp">
                      <Phone size={14} fill="white" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{padding:'40px', textAlign:'center', color: '#64748b'}}>
                  No vendors found for "{selectedCategory}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <Users color={PRIMARY} />
                <h3 style={{margin:0, fontWeight:'700'}}>{editingId ? "Edit Vendor" : "Add New Vendor"}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Vendor Name *</label>
                <input required style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Fresh Dairy Co." />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Category</label>
                <input style={styles.input} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Milk, Vegetables" />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input required type="tel" style={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 919876543210" />
              </div>

              <button type="submit" disabled={submitting} style={styles.submitBtn}>
                {submitting ? "Saving..." : "Save Vendor"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const styles = {
  page: { padding: "30px 40px", background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', fontSize: '14px', fontWeight: '700', color: BLACK, cursor: 'pointer' },
  mainHeading: { margin: 0, fontSize: '24px', fontWeight: '800', color: BLACK },
  franchiseLabel: { fontWeight: '700', fontSize: '14px', color: BLACK },
  
  controlsRow: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  filtersGroup: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '8px 12px', width: '250px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: BLACK },
  toggleContainer: { display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' },
  toggleBtn: { padding: '6px 12px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer', borderRadius: '6px' },
  toggleBtnActive: { padding: '6px 12px', border: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: PRIMARY, cursor: 'pointer', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  dateInput: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '13px', color: BLACK },
  resetBtn: { padding: '8px', borderRadius: '8px', background: 'white', border: `1px solid ${BORDER}`, cursor: 'pointer', color: '#64748b' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: PRIMARY, color: 'white', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' },
  
  // Category Bar
  categoryBar: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' },
  catBtn: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${BORDER}`, background: 'white', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' },
  catBtnActive: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${PRIMARY}`, background: PRIMARY, color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(6, 95, 70, 0.2)' },

  // Table
  tableContainer: { background: 'white', borderRadius: '12px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', background: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '700', borderBottom: `1px solid ${BORDER}` },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '16px 20px', fontSize: '14px', color: '#1e293b' },
  actionTd: { padding: '16px 20px', display: 'flex', gap: '10px', justifyContent: 'center' },
  
  iconBtn: { padding: '6px', borderRadius: '6px', background: '#f8fafc', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  waBtn: { padding: '6px', borderRadius: '6px', background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  modalContent: { background: 'white', padding: '25px', borderRadius: '16px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '10px', borderRadius: '8px', border: `1px solid ${BORDER}`, outline: 'none', fontSize: '14px' },
  submitBtn: { padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }
};

export default CentralVendors;