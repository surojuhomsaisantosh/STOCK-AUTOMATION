import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";

const GREEN = "rgb(0,100,55)";
const LIGHT_GREEN = "rgba(0,100,55,0.05)";
const DANGER = "#e63946";
const CENTRAL_ID = "TV-1";

function PosManagement() {
  const [allProfiles, setAllProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [targetFranchise, setTargetFranchise] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [viewFranchise, setViewFranchise] = useState("");
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [myFranchiseId, setMyFranchiseId] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", price: "", category: "" });
  const [editingItem, setEditingItem] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchFranchises();
    fetchCurrentUser();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setMyFranchiseId(data.franchise_id);
    }
  };

  const fetchFranchises = async () => {
    const { data, error } = await supabase.from("profiles").select("franchise_id, company").neq("role", "stock");
    if (data) {
      setAllProfiles(data);
      const uniqueCompanies = [...new Set(data.map(d => d.company).filter(Boolean))];
      setCompanies(uniqueCompanies);
    }
  };

  const filteredFranchises = useMemo(() => {
    if (!selectedCompany) return [];
    return [...new Set(allProfiles.filter(p => p.company === selectedCompany).map(p => p.franchise_id))];
  }, [selectedCompany, allProfiles]);

  const getMenu = async (idOverride) => {
    const id = (idOverride || viewFranchise)?.toString().trim();
    if (!id) { setMenus([]); return; }
    setLoading(true);
    setMenus([]);
    try {
      const { data, error } = await supabase.from("menus").select("*").eq("franchise_id", id).order("category");
      if (!error) setMenus(data || []);
    } finally {
      setSelectedCategory("All");
      setLoading(false);
    }
  };

  const cloneFromCentral = async () => {
    const finalTargetId = targetFranchise.trim();
    if (!finalTargetId) return showToast("Enter Target ID", "error");
    const exists = allProfiles.some(p => p.franchise_id === finalTargetId);
    if (!exists) return showToast(`ID ${finalTargetId} not found`, "error");

    setLoading(true);
    const { error } = await supabase.rpc('clone_franchise_menu', {
      target_id: finalTargetId,
      central_id: CENTRAL_ID
    });

    if (error) showToast(error.message, "error");
    else {
      showToast(`🚀 Menu Synced to ${finalTargetId}`);
      if (viewFranchise === finalTargetId) getMenu(finalTargetId);
    }
    setTargetFranchise("");
    setLoading(false);
  };

  const deleteWholeMenu = async () => {
    const finalTargetId = deleteTargetId.trim();
    if (!finalTargetId) return showToast("Enter Franchise ID", "error");
    if (finalTargetId === CENTRAL_ID) return showToast("Cannot wipe Central", "error");

    const exists = allProfiles.some(p => p.franchise_id === finalTargetId);
    if (!exists) return showToast(`Franchise ID ${finalTargetId} not found`, "error");

    if (window.confirm(`⚠️ DANGER: Permanent wipe for ${finalTargetId}?`)) {
      setLoading(true);
      const { error } = await supabase.rpc('delete_franchise_menu_global', {
        target_id: finalTargetId
      });

      if (error) showToast(error.message, "error");
      else {
        showToast(`🗑️ Menu Wiped for ${finalTargetId}`, "success");
        if (viewFranchise === finalTargetId) setMenus([]);
      }
      setDeleteTargetId("");
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete item?")) return;
    const { error } = await supabase.from("menus").delete().eq("id", id);
    if (!error) {
      setMenus(prev => prev.filter(m => m.id !== id));
      showToast("Item removed successfully");
    }
  };

  const addItem = async () => {
    if (!newItem.item_name || !newItem.price || !newItem.category) return showToast("Fill all fields", "error");
    setLoading(true);
    const { error } = await supabase.from("menus").insert({ franchise_id: viewFranchise, ...newItem });
    if (error) showToast(error.message, "error");
    else {
      showToast("Item added successfully");
      setIsAddModalOpen(false);
      setNewItem({ item_name: "", price: "", category: "" });
      getMenu();
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("menus").update({ ...editingItem }).eq("id", editingItem.id);
    if (error) showToast(error.message, "error");
    else {
      showToast("Item updated successfully");
      setIsEditModalOpen(false);
      getMenu();
    }
  };

  const filteredMenus = menus.filter(m =>
    (selectedCategory === "All" || m.category === selectedCategory) &&
    m.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMenu = filteredMenus.reduce((acc, i) => {
    acc[i.category] = acc[i.category] || [];
    acc[i.category].push(i);
    return acc;
  }, {});

  const categories = useMemo(() => ["All", ...new Set(menus.map(m => m.category))], [menus]);

  return (
    <div style={{ ...styles.page, padding: isMobile ? "10px" : "20px 20px 40px" }}>
      {toast.show && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === "success" ? GREEN : DANGER, width: isMobile ? '85%' : 'auto' }}>
          {toast.message}
        </div>
      )}

      <header style={{ ...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={() => window.history.back()} style={styles.backBtn}>← Back</button>
        </div>

        <div style={styles.titleWrapper}>
          <h1 style={{ ...styles.heading, fontSize: isMobile ? '24px' : '32px' }}>POS Management</h1>
          <p style={styles.subheading}>Centralized Menu Control System</p>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '10px' : '0' }}>
          <div style={styles.idDisplay}>
            <span style={styles.idLabel}>ID :</span>
            <span style={styles.idValue}>{myFranchiseId || "--"}</span>
          </div>
        </div>
      </header>

      <main style={styles.mainContent}>
        <section style={{ ...styles.adminCard, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '32px' }}>
          <div style={{ ...styles.inputGroup, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={cloneFromCentral} style={{ ...styles.primaryBtn, flex: isMobile ? 1 : 'none' }} disabled={loading}>Sync</button>
            <input style={{ ...styles.premiumInput, flex: isMobile ? 1 : 'none', width: isMobile ? '100%' : '160px' }} placeholder="Target ID" value={targetFranchise} onChange={e => setTargetFranchise(e.target.value)} />
          </div>
          <div style={{ ...styles.inputGroup, width: isMobile ? '100%' : 'auto' }}>
            <input style={{ ...styles.premiumInput, flex: isMobile ? 1 : 'none', borderColor: DANGER, width: isMobile ? '100%' : '160px' }} placeholder="Wipe ID" value={deleteTargetId} onChange={e => setDeleteTargetId(e.target.value)} />
            <button onClick={deleteWholeMenu} style={{ ...styles.dangerBtn, flex: isMobile ? 1 : 'none' }} disabled={loading}>Wipe</button>
          </div>
        </section>

        <section style={styles.controlCard}>
          <div style={{ ...styles.row, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '16px' }}>
            <div style={{ ...styles.selectWrapper, width: isMobile ? '100%' : '300px' }}>
              <label style={styles.miniLabel}>Filter by Company</label>
              <select style={styles.premiumSelect} value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); setViewFranchise(""); setMenus([]); }}>
                <option value="">Select Company...</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ ...styles.selectWrapper, width: isMobile ? '100%' : '300px' }}>
              <label style={styles.miniLabel}>Manage Menu For</label>
              <select
                style={{ ...styles.premiumSelect, opacity: !selectedCompany ? 0.5 : 1 }}
                disabled={!selectedCompany}
                value={viewFranchise}
                onChange={e => {
                  const val = e.target.value;
                  setViewFranchise(val);
                  getMenu(val);
                }}
              >
                <option value="">{selectedCompany ? "Choose Franchise..." : "Select Company First"}</option>
                {filteredFranchises.map(id => <option key={id} value={id}>Franchise ID : {id}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...styles.searchRow, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '16px' }}>
            <div style={styles.searchBarWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input style={styles.searchField} placeholder="Quick search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setIsAddModalOpen(true)} style={{ ...styles.addBtn, width: isMobile ? '100%' : 'auto', background: !viewFranchise ? '#f5f5f5' : GREEN, color: !viewFranchise ? '#aaa' : '#fff' }} disabled={!viewFranchise}>+ New Item</button>
          </div>

          {menus.length > 0 && (
            <div style={styles.scrollWrapper}>
              {categories.map(c => (
                <button key={c} onClick={() => setSelectedCategory(c)} style={selectedCategory === c ? styles.activeTab : styles.tab}>{c}</button>
              ))}
            </div>
          )}
        </section>

        <section style={styles.listContainer}>
          {loading ? (
            <div style={styles.loadingState}>Refreshing Menu...</div>
          ) : Object.keys(groupedMenu).length > 0 ? (
            Object.keys(groupedMenu).map(cat => (
              <div key={cat} style={styles.categoryGroup}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsWrapper}>
                  {groupedMenu[cat].map(item => (
                    <div key={item.id} style={{ ...styles.premiumItemRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '0' }}>
                      <div style={{ ...styles.itemLead, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                        <span style={{ ...styles.itemNameText, minWidth: isMobile ? 'none' : '250px' }}>{item.item_name}</span>
                        <span style={styles.itemPriceText}>₹{item.price}</span>
                      </div>
                      <div style={{ ...styles.itemActions, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start', borderTop: isMobile ? '1px solid #f0f0f0' : 'none', paddingTop: isMobile ? '10px' : '0' }}>
                        <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} style={styles.iconBtn}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={styles.deleteBtn}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DANGER} strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>{viewFranchise ? "No items found." : "Select a franchise to start."}</div>
          )}
        </section>
      </main>

      {/* MODALS (Responsive fixed width) */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '400px', padding: isMobile ? '25px' : '40px' }}>
            <h2 style={{ color: GREEN, marginBottom: '20px', fontSize: isMobile ? '18px' : '22px' }}>
              {isAddModalOpen ? "Add New Item" : "Modify Item"}
            </h2>
            <label style={styles.label}>Item Name</label>
            <input style={styles.modalInput} value={isEditModalOpen ? editingItem.item_name : newItem.item_name} onChange={e => isEditModalOpen ? setEditingItem({ ...editingItem, item_name: e.target.value }) : setNewItem({ ...newItem, item_name: e.target.value })} />
            <label style={styles.label}>Price (₹)</label>
            <input style={styles.modalInput} value={isEditModalOpen ? editingItem.price : newItem.price} onChange={e => isEditModalOpen ? setEditingItem({ ...editingItem, price: e.target.value }) : setNewItem({ ...newItem, price: e.target.value })} />
            <label style={styles.label}>Category</label>
            <input style={styles.modalInput} value={isEditModalOpen ? editingItem.category : newItem.category} onChange={e => isEditModalOpen ? setEditingItem({ ...editingItem, category: e.target.value }) : setNewItem({ ...newItem, category: e.target.value })} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button onClick={isAddModalOpen ? addItem : saveEdit} style={{ ...styles.primaryBtn, flex: 1 }}>Save</button>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} style={{ ...styles.cancelBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f8f9fa", minHeight: "100vh", fontFamily: '"Inter", sans-serif' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '14px 20px', borderRadius: '12px', color: '#fff', fontWeight: '800', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center' },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", maxWidth: "1100px", margin: "0 auto 20px auto", borderBottom: '1px solid #eee', paddingBottom: '20px' },
  backBtn: { background: "none", border: "none", color: GREEN, fontSize: "16px", fontWeight: "700", cursor: "pointer" },
  titleWrapper: { textAlign: "center" },
  heading: { fontWeight: "800", color: "#1a1a1a", letterSpacing: "-1px", margin: 0 },
  subheading: { color: "#6c757d", fontSize: "14px", marginTop: "5px", fontWeight: "500" },
  idDisplay: { display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
  idLabel: { fontSize: '14px', fontWeight: '800', color: '#888', textTransform: 'uppercase' },
  idValue: { fontSize: '16px', fontWeight: '700', color: GREEN, lineHeight: '1.2' },
  mainContent: { maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" },
  adminCard: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", justifyContent: "flex-start", alignItems: "center", border: "1px solid #edf2f7", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
  controlCard: { background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #edf2f7", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" },
  inputGroup: { display: "flex", gap: "12px", alignItems: "center" },
  premiumInput: { padding: "0 16px", height: "48px", borderRadius: "10px", border: "2px solid #edf2f7", outline: "none" },
  primaryBtn: { background: GREEN, color: "#fff", border: "none", height: "48px", padding: "0 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" },
  dangerBtn: { background: LIGHT_GREEN, color: DANGER, border: `2px solid ${DANGER}`, height: "48px", padding: "0 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" },
  row: { display: "flex", marginBottom: "24px", alignItems: "center" },
  miniLabel: { fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px', display: 'block' },
  premiumSelect: { width: "100%", height: "48px", padding: "0 16px", borderRadius: "10px", border: "2px solid #edf2f7", appearance: "none", cursor: "pointer", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%234A5568%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E') no-repeat right 15px center", outline: "none" },
  selectWrapper: { position: "relative" },
  searchRow: { display: "flex", alignItems: "center", marginBottom: "20px" },
  searchBarWrapper: { position: "relative", flex: 1, width: '100%' },
  searchIcon: { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" },
  searchField: { width: "100%", boxSizing: 'border-box', height: "54px", padding: "0 16px 0 48px", borderRadius: "12px", border: `2px solid ${LIGHT_GREEN}`, background: "#fcfcfc", outline: "none" },
  addBtn: { border: "none", height: "54px", padding: "0 28px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  scrollWrapper: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" },
  tab: { padding: "10px 20px", borderRadius: "30px", background: "#f1f3f5", border: "none", color: "#495057", fontWeight: "600", cursor: "pointer", whiteSpace: 'nowrap' },
  activeTab: { padding: "10px 20px", borderRadius: "30px", background: GREEN, color: "#fff", fontWeight: "700", border: "none", whiteSpace: 'nowrap' },
  listContainer: { display: "flex", flexDirection: "column", gap: "32px" },
  categoryGroup: { borderBottom: "1px solid #eee", paddingBottom: "20px" },
  categoryHeader: { fontSize: "12px", color: GREEN, fontWeight: "900", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px", display: "inline-block", background: LIGHT_GREEN, padding: "4px 12px", borderRadius: "4px" },
  premiumItemRow: { display: "flex", justifyContent: "space-between", padding: "16px", borderRadius: "12px", background: "#fff", marginBottom: "8px", boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  itemLead: { display: "flex", alignItems: "center" },
  itemNameText: { fontSize: "16px", fontWeight: "600", color: "#2d3436" },
  itemPriceText: { fontSize: "16px", fontWeight: "800", color: GREEN },
  itemActions: { display: "flex", gap: "12px", alignItems: "center" },
  iconBtn: { background: "none", border: `1.5px solid ${GREEN}`, color: GREEN, padding: "6px 16px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", padding: "5px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "16px", boxSizing: 'border-box' },
  modalInput: { padding: "12px", marginBottom: "15px", border: "1px solid #ddd", borderRadius: "8px", width: "100%", boxSizing: "border-box" },
  label: { fontSize: "12px", fontWeight: "bold", color: "#666", marginBottom: "5px", display: "block" },
  cancelBtn: { background: "#f5f5f5", border: "none", color: "#666", padding: "0 20px", borderRadius: "8px", height: "48px", cursor: "pointer", fontWeight: '600' },
  loadingState: { textAlign: "center", padding: "100px", color: "#aaa" },
  emptyState: { textAlign: "center", padding: "40px", color: "#666" }
};

export default PosManagement;