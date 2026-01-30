import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Edit2, Trash2, X, Users, RefreshCw, Phone, Layers, ChevronRight
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchUserData();
    return () => window.removeEventListener('resize', handleResize);
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

  const uniqueCategories = ["All", ...new Set(vendors.map(v => v.category || "Uncategorized"))].sort();

  const filteredVendors = vendors.filter(v => {
    const vendorCat = v.category || "Uncategorized";
    if (selectedCategory !== "All" && vendorCat !== selectedCategory) return false;
    const matchText = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorCat.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchText) return false;
    const createdDate = new Date(v.created_at).toISOString().split('T')[0];
    if (filterType === 'date') return createdDate === selectedDate;
    else return createdDate >= startDate && createdDate <= endDate;
  });

  return (
    <div style={{ ...styles.page, padding: isMobile ? "15px" : "30px 40px" }}>
      {/* HEADER */}
      <div style={{ ...styles.headerRow, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "15px" : "0" }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> {!isMobile && "Back"}
        </button>
        <h1 style={{ ...styles.mainHeading, fontSize: isMobile ? "22px" : "24px" }}>Vendors List</h1>
        <div style={{ ...styles.franchiseLabel, width: isMobile ? "100%" : "auto", textAlign: "center" }}>
          Franchise ID : <span style={{ color: PRIMARY }}>{franchiseId}</span>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ ...styles.controlsRow, flexDirection: isMobile ? "column" : "row", alignItems: "stretch" }}>
        <div style={{ ...styles.filtersGroup, flexDirection: isMobile ? "column" : "row", width: "100%" }}>
          <div style={{ ...styles.searchBox, width: isMobile ? "100%" : "250px" }}>
            <Search size={18} color="#64748b" />
            <input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={{ ...styles.toggleContainer, width: isMobile ? "100%" : "auto" }}>
            <button style={filterType === 'date' ? { ...styles.toggleBtnActive, flex: 1 } : { ...styles.toggleBtn, flex: 1 }} onClick={() => setFilterType('date')}>Date</button>
            <button style={filterType === 'range' ? { ...styles.toggleBtnActive, flex: 1 } : { ...styles.toggleBtn, flex: 1 }} onClick={() => setFilterType('range')}>Range</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: isMobile ? "100%" : "auto" }}>
            {filterType === 'date' ? (
              <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
            <button onClick={resetFilters} style={styles.resetBtn}><RefreshCw size={16} /></button>
          </div>
        </div>

        <button onClick={handleOpenAdd} style={{ ...styles.addBtn, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
          <Plus size={18} /> {isMobile ? "ADD VENDOR" : "Add a vendor"}
        </button>
      </div>

      {/* CATEGORY TABS */}
      <div style={styles.categoryBar}>
        {uniqueCategories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={selectedCategory === cat ? styles.catBtnActive : styles.catBtn}>
            {selectedCategory === cat && <Layers size={14} />} {cat}
          </button>
        ))}
      </div>

      {/* DATA VIEW */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : filteredVendors.length > 0 ? (
            filteredVendors.map((vendor, index) => (
              <div key={vendor.id} style={styles.mobileCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: PRIMARY, textTransform: 'uppercase' }}>{vendor.category || "General"}</div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: BLACK }}>{vendor.name}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>#{index + 1}</div>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                      <Phone size={14} /> {vendor.phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: `1px solid ${BORDER}`, paddingTop: '15px' }}>
                    <button onClick={() => openWhatsApp(vendor.phone)} style={styles.mobileWaBtn}>WHATSAPP</button>
                    <button onClick={() => handleOpenEdit(vendor)} style={styles.mobileEditBtn}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(vendor.id)} style={styles.mobileDelBtn}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No vendors found.</div>
          )}
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SERIAL NUMBER</th>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>PHONE</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>Loading...</td></tr>
              ) : filteredVendors.map((vendor, index) => (
                <tr key={vendor.id} style={styles.tr}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{vendor.name}</td>
                  <td style={styles.td}>{vendor.phone}</td>
                  <td style={styles.actionTd}>
                    <button onClick={() => handleOpenEdit(vendor)} style={styles.iconBtn}><Edit2 size={16} color={PRIMARY} /></button>
                    <button onClick={() => handleDelete(vendor.id)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444" /></button>
                    <button onClick={() => openWhatsApp(vendor.phone)} style={styles.waBtn}><Phone size={14} fill="white" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={{ ...styles.modalContent, width: isMobile ? "90%" : "400px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Users color={PRIMARY} />
                <h3 style={{ margin: 0, fontWeight: '700' }}>{editingId ? "Edit Vendor" : "Add Vendor"}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}><label style={styles.label}>Name *</label><input required style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Vendor Name" /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Category</label><input style={styles.input} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Dairy" /></div>
              <div style={styles.inputGroup}><label style={styles.label}>Phone *</label><input required type="tel" style={styles.input} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="91..." /></div>
              <button type="submit" disabled={submitting} style={styles.submitBtn}>{submitting ? "Saving..." : "Save Vendor"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', fontSize: '14px', fontWeight: '700', color: BLACK, cursor: 'pointer' },
  mainHeading: { margin: 0, fontWeight: '800', color: BLACK },
  franchiseLabel: { fontWeight: '700', fontSize: '14px', color: BLACK, background: '#fff', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${BORDER}` },
  controlsRow: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', gap: '15px' },
  filtersGroup: { display: 'flex', gap: '15px', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 15px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: BLACK },
  toggleContainer: { display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' },
  toggleBtn: { padding: '6px 12px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '600', color: '#64748b' },
  toggleBtnActive: { padding: '6px 12px', border: 'none', background: 'white', fontSize: '12px', fontWeight: '700', color: PRIMARY, borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  dateInput: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, fontSize: '12px' },
  resetBtn: { padding: '10px', borderRadius: '8px', background: 'white', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: PRIMARY, color: 'white', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '12px' },
  categoryBar: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' },
  catBtn: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${BORDER}`, background: 'white', color: '#64748b', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  catBtnActive: { padding: '8px 16px', borderRadius: '20px', border: `1px solid ${PRIMARY}`, background: PRIMARY, color: 'white', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' },
  tableContainer: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '16px 20px', fontSize: '14px' },
  actionTd: { padding: '16px 20px', display: 'flex', gap: '10px', justifyContent: 'center' },
  iconBtn: { padding: '8px', borderRadius: '8px', background: '#f8fafc', border: `1px solid ${BORDER}` },
  waBtn: { padding: '8px', borderRadius: '8px', background: '#25D366', border: 'none' },
  // MOBILE CARD
  mobileCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  cardHeader: { padding: '15px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' },
  cardAvatar: { width: '36px', height: '36px', borderRadius: '10px', background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY },
  cardBody: { padding: '15px' },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mobileWaBtn: { flex: 2, padding: '12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '11px' },
  mobileEditBtn: { flex: 1, padding: '12px', background: '#f3f4f6', color: PRIMARY, border: 'none', borderRadius: '10px', display: 'flex', justifyContent: 'center' },
  mobileDelBtn: { flex: 1, padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', display: 'flex', justifyContent: 'center' },
  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
  modalContent: { background: 'white', padding: '25px', borderRadius: '24px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '700' },
  input: { padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, outline: 'none' },
  submitBtn: { padding: '14px', background: PRIMARY, color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800' }
};

export default CentralVendors;