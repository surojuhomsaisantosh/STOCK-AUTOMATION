import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
// ADDED: Import ArrowLeft for a better looking back button
import { ArrowLeft } from "lucide-react"; 

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

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", price: "", category: "" });
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  useEffect(() => { 
    fetchFranchises(); 
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setMyFranchiseId(data.franchise_id);
    }
  };

  const fetchFranchises = async () => {
    const { data } = await supabase.from("profiles").select("franchise_id, company").neq("role", "stock");
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
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; } 
        body { margin: 0; padding: 0; }
        
        .category-scroll::-webkit-scrollbar {
            height: 6px; 
        }
        .category-scroll::-webkit-scrollbar-track {
            background: transparent; 
        }
        .category-scroll::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2); 
            border-radius: 10px;
        }
        .category-scroll::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.4); 
        }
      `}</style>

      {toast.show && (
        <div style={{...styles.toast, backgroundColor: toast.type === "success" ? GREEN : DANGER}}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <header style={{
          ...styles.header, 
          flexDirection: isMobile ? 'column' : 'row', 
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '16px' : '0'
      }}>
        
        {/* Top Row on Mobile: Back Button & Franchise ID */}
        <div style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            order: isMobile ? 1 : 0, 
            flex: isMobile ? 'none' : 1
        }}>
            {/* FIX: Using ArrowLeft Icon and Flex Alignment */}
            <button onClick={() => window.history.back()} style={styles.backBtn}>
                <ArrowLeft size={20} strokeWidth={2.5} /> Back
            </button>
            
            {isMobile && (
                <div style={styles.idDisplay}>
                    <span style={styles.idLabel}>ID :</span>
                    <span style={styles.idValue}>{myFranchiseId || "--"}</span>
                </div>
            )}
        </div>
        
        {/* Center: Title */}
        <div style={{
            ...styles.titleWrapper,
            order: isMobile ? 2 : 1, 
            width: isMobile ? '100%' : 'auto',
            textAlign: isMobile ? 'center' : 'center'
        }}>
          <h1 style={{...styles.heading, fontSize: isMobile ? '24px' : '32px'}}>Menu Management</h1>
          <p style={styles.subheading}>Centralized Menu Control System</p>
        </div>
        
        {/* Right: Franchise ID (Desktop Only) */}
        {!isMobile && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', order: 2 }}>
                <div style={styles.idDisplay}>
                <span style={styles.idLabel}>ID :</span>
                <span style={styles.idValue}>{myFranchiseId || "--"}</span>
                </div>
            </div>
        )}
      </header>

      <main style={styles.mainContent}>
        
        {/* 1. ADMIN ACTIONS CARD */}
        <section style={{
            ...styles.adminCard, 
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'stretch' 
        }}>
          <div style={{...styles.inputGroup, width: isMobile ? '100%' : 'auto'}}>
            <button onClick={cloneFromCentral} style={{...styles.primaryBtn, width: isMobile ? '100%' : 'auto'}} disabled={loading}>Sync from Central</button>
            <input 
                style={{...styles.premiumInput, width: isMobile ? '100%' : '160px'}} 
                placeholder="Target ID" 
                value={targetFranchise} 
                onChange={e => setTargetFranchise(e.target.value)} 
            />
          </div>
          
          {isMobile && <div style={{height: '1px', background: '#eee', margin: '8px 0'}}></div>}

          <div style={{...styles.inputGroup, width: isMobile ? '100%' : 'auto'}}>
            <input 
                style={{...styles.premiumInput, borderColor: DANGER, width: isMobile ? '100%' : '160px'}} 
                placeholder="Wipe ID" 
                value={deleteTargetId} 
                onChange={e => setDeleteTargetId(e.target.value)} 
            />
            <button onClick={deleteWholeMenu} style={{...styles.dangerBtn, width: isMobile ? '100%' : 'auto'}} disabled={loading}>Wipe Menu</button>
          </div>
        </section>

        {/* 2. FILTERS & CONTROLS CARD */}
        <section style={styles.controlCard}>
          <div style={{...styles.row, flexDirection: isMobile ? 'column' : 'row'}}>
            
            <div style={{...styles.selectWrapper, width: isMobile ? '100%' : '300px'}}>
                <label style={styles.miniLabel}>Filter by Company</label>
                <select style={styles.premiumSelect} value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); setViewFranchise(""); setMenus([]); }}>
                    <option value="">Select Company...</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div style={{...styles.selectWrapper, width: isMobile ? '100%' : '300px'}}>
              <label style={styles.miniLabel}>Manage Menu For</label>
              <select 
                style={{...styles.premiumSelect, opacity: !selectedCompany ? 0.5 : 1}} 
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

          <div style={{...styles.searchRow, flexDirection: isMobile ? 'column' : 'row'}}>
            <div style={styles.searchBarWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input style={styles.searchField} placeholder="Quick search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                style={{
                    ...styles.addBtn, 
                    width: isMobile ? '100%' : 'auto', 
                    background: !viewFranchise ? '#f5f5f5' : GREEN, 
                    color: !viewFranchise ? '#aaa' : '#fff'
                }} 
                disabled={!viewFranchise}
            >
                + New Item
            </button>
          </div>

          {menus.length > 0 && (
            <div style={styles.scrollWrapper} className="category-scroll">
              {categories.map(c => (
                <button key={c} onClick={() => setSelectedCategory(c)} style={selectedCategory === c ? styles.activeTab : styles.tab}>{c}</button>
              ))}
            </div>
          )}
        </section>

        {/* 3. MENU LIST */}
        <section style={styles.listContainer}>
          {loading ? (
            <div style={styles.loadingState}>Refreshing Menu...</div>
          ) : Object.keys(groupedMenu).length > 0 ? (
            Object.keys(groupedMenu).map(cat => (
              <div key={cat} style={styles.categoryGroup}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsWrapper}>
                  {groupedMenu[cat].map(item => (
                    <div key={item.id} style={styles.premiumItemRow}>
                      <div style={styles.itemLead}>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                            <span style={styles.itemNameText}>{item.item_name}</span>
                            <span style={styles.itemPriceText}>₹{item.price}</span>
                        </div>
                      </div>
                      <div style={styles.itemActions}>
                        <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} style={styles.iconBtn}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={styles.deleteBtn}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DANGER} strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>{viewFranchise ? "No items found in this franchise menu." : "Please select a franchise to manage the menu."}</div>
          )}
        </section>
      </main>

      {/* MODALS */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '90%' : '400px'}}>
            <h2 style={{ color: GREEN, marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Add New Menu Item</h2>
            <label style={styles.label}>Item Name</label>
            <input style={styles.modalInput} placeholder="e.g. Chicken Burger" onChange={e => setNewItem({...newItem, item_name: e.target.value})} />
            <label style={styles.label}>Price (₹)</label>
            <input style={styles.modalInput} placeholder="e.g. 199" onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <label style={styles.label}>Category</label>
            <input style={styles.modalInput} placeholder="e.g. BURGERS" onChange={e => setNewItem({...newItem, category: e.target.value})} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button onClick={addItem} style={{...styles.primaryBtn, flex: 1}}>Save Item</button>
              <button onClick={() => setIsAddModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingItem && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '90%' : '400px'}}>
            <h2 style={{ color: GREEN, marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Modify Item</h2>
            <label style={styles.label}>Item Name</label>
            <input style={styles.modalInput} value={editingItem.item_name} onChange={e => setEditingItem({...editingItem, item_name: e.target.value})} />
            <label style={styles.label}>Price (₹)</label>
            <input style={styles.modalInput} value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} />
            <label style={styles.label}>Category</label>
            <input style={styles.modalInput} value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button onClick={saveEdit} style={{...styles.primaryBtn, flex: 1}}>Update Item</button>
              <button onClick={() => setIsEditModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f8f9fa", minHeight: "100vh", fontFamily: '"Inter", sans-serif', padding: "20px 20px 80px", overflowX: 'hidden' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '12px', color: '#fff', fontWeight: '800', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center', minWidth: '280px', maxWidth: '90%' },
  header: { display: "flex", justifyContent: "space-between", position: "relative", maxWidth: "1100px", margin: "0 auto 24px auto", borderBottom: '1px solid #eee', paddingBottom: '20px' },
  
  // FIX: Updated backBtn style to be flex container
  backBtn: { background: "none", border: "none", color: GREEN, fontSize: "16px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '8px' },
  
  titleWrapper: { textAlign: "center" },
  heading: { fontWeight: "800", color: "#1a1a1a", letterSpacing: "-1px", margin: 0 },
  subheading: { color: "#6c757d", fontSize: "14px", marginTop: "5px", fontWeight: "500" },
  
  idDisplay: { display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
  idLabel: { fontSize: '12px', fontWeight: '800', color: '#888', textTransform: 'uppercase' },
  idValue: { fontSize: '14px', fontWeight: '800', color: GREEN, background: LIGHT_GREEN, padding: '4px 8px', borderRadius: '6px' },

  mainContent: { maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" },
  adminCard: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", justifyContent: "flex-start", gap: "20px", border: "1px solid #edf2f7", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
  
  controlCard: { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #edf2f7", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" },
  inputGroup: { display: "flex", gap: "10px", alignItems: "center" },
  premiumInput: { padding: "0 16px", height: "48px", borderRadius: "10px", border: "2px solid #edf2f7", outline: "none", fontSize: '14px' },
  primaryBtn: { background: GREEN, color: "#fff", border: "none", height: "48px", padding: "0 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap' },
  dangerBtn: { background: "#fff", color: DANGER, border: `2px solid ${DANGER}`, height: "48px", padding: "0 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap' },
  
  row: { display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center" },
  miniLabel: { fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '6px', display: 'block' },
  premiumSelect: { width: "100%", height: "48px", padding: "0 16px", borderRadius: "10px", border: "2px solid #edf2f7", appearance: "none", cursor: "pointer", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%234A5568%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E') no-repeat right 15px center", outline: "none", fontSize: '14px', backgroundColor: '#fff' },
  selectWrapper: { position: "relative" },
  
  searchRow: { display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" },
  searchBarWrapper: { position: "relative", flex: 1, width: '100%' },
  searchIcon: { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: '#999' },
  searchField: { width: "100%", height: "50px", padding: "0 16px 0 44px", borderRadius: "12px", border: `2px solid ${LIGHT_GREEN}`, background: "#fcfcfc", outline: "none", fontSize: '14px' },
  addBtn: { border: "none", height: "50px", padding: "0 24px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap' },
  
  scrollWrapper: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" },
  tab: { padding: "8px 20px", borderRadius: "30px", background: "#f1f3f5", border: "none", color: "#495057", fontWeight: "600", cursor: "pointer", fontSize: '13px', whiteSpace: 'nowrap' },
  activeTab: { padding: "8px 20px", borderRadius: "30px", background: GREEN, color: "#fff", fontWeight: "700", border: "none", fontSize: '13px', whiteSpace: 'nowrap' },
  
  listContainer: { display: "flex", flexDirection: "column", gap: "24px" },
  categoryGroup: { borderBottom: "1px solid #eee", paddingBottom: "10px" },
  categoryHeader: { fontSize: "12px", color: GREEN, fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px", display: "inline-block", background: LIGHT_GREEN, padding: "4px 10px", borderRadius: "6px" },
  premiumItemRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "12px", background: "#fff", marginBottom: "10px", border: '1px solid #f0f0f0' },
  itemLead: { display: "flex", alignItems: "center", flex: 1, overflow: 'hidden' }, 
  itemNameText: { fontSize: "15px", fontWeight: "600", color: "#2d3436", display: 'block', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemPriceText: { fontSize: "14px", fontWeight: "800", color: GREEN },
  itemActions: { display: "flex", gap: "12px", alignItems: "center", paddingLeft: '10px' },
  iconBtn: { background: "none", border: `1px solid ${GREEN}`, color: GREEN, padding: "6px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: '12px' },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", padding: "5px", color: DANGER },
  
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" },
  modalInput: { padding: "12px", marginBottom: "15px", border: "1px solid #e2e8f0", borderRadius: "10px", width: "100%", fontSize: '14px', outline: 'none' },
  cancelBtn: { background: "#f1f5f9", border: "none", color: "#64748b", padding: "0 20px", borderRadius: "10px", height: "48px", cursor: "pointer", fontWeight: '700', fontSize: '14px' },
  
  loadingState: { textAlign: "center", padding: "60px", color: "#94a3b8", fontWeight: '500' },
  emptyState: { textAlign: "center", padding: "40px", color: "#94a3b8", background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }
};

export default PosManagement;