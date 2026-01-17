import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";

const GREEN = "rgb(0,100,55)";
const LIGHT_GREEN = "rgba(0,100,55,0.05)";
const DANGER = "#e63946";
const CENTRAL_ID = "1";

function PosManagement() {
  const [franchises, setFranchises] = useState([]);
  const [targetFranchise, setTargetFranchise] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [viewFranchise, setViewFranchise] = useState("");
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", price: "", category: "" });
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => { fetchFranchises(); }, []);

  const fetchFranchises = async () => {
    const { data } = await supabase.from("profiles").select("franchise_id").neq("role", "stock");
    setFranchises([...new Set((data || []).map(d => d.franchise_id))]);
  };

  const getMenu = async (idOverride) => {
    const id = idOverride || viewFranchise;
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("menus").select("*").eq("franchise_id", id.trim()).order("category");
    setMenus(data || []);
    setSelectedCategory("All");
    setLoading(false);
  };

  const cloneFromCentral = async () => {
    const targetId = targetFranchise.trim();
    if (!targetId) return alert("Enter target ID");
    if (targetId === "2") return alert("Error: ID 2 belongs to Stock Manager.");
    setLoading(true);
    const { error } = await supabase.rpc('clone_franchise_menu', { target_id: targetId, central_id: CENTRAL_ID });
    if (error) alert(error.message);
    else {
        alert(`🚀 Sync Complete: Franchise ${targetId}`);
        if (viewFranchise === targetId) getMenu();
    }
    setTargetFranchise("");
    setLoading(false);
  };

  const deleteWholeMenu = async () => {
    const id = deleteTargetId.trim();
    if (!id) return alert("Enter Franchise ID to wipe");
    if (id === "2") return alert("Error: ID 2 belongs to Stock Manager.");
    if (!window.confirm(`Are you sure? This action is irreversible for ID: ${id}`)) return;
    setLoading(true);
    const { error } = await supabase.rpc('delete_franchise_menu_global', { target_id: id });
    if (!error) {
        alert(`🗑️ Wiped: Franchise ${id}`);
        if (viewFranchise === id) setMenus([]);
    } else {
        alert(error.message);
    }
    setDeleteTargetId("");
    setLoading(false);
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete item?")) return;
    setMenus(prev => prev.filter(m => m.id !== id));
    await supabase.from("menus").delete().eq("id", id);
  };

  const addItem = async () => {
    if (!newItem.item_name || !newItem.price || !newItem.category) return alert("Fill all fields");
    setLoading(true);
    const { error } = await supabase.from("menus").insert({ franchise_id: viewFranchise, ...newItem });
    if (error) alert(error.message);
    else {
      setIsAddModalOpen(false);
      setNewItem({ item_name: "", price: "", category: "" });
      getMenu();
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingItem.item_name || !editingItem.price) return;
    const { error } = await supabase.from("menus").update({ ...editingItem }).eq("id", editingItem.id);
    if (error) alert(error.message);
    else {
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
      {/* HEADER SECTION WITH BACK BUTTON */}
      <header style={styles.header}>
        <button onClick={() => window.history.back()} style={styles.backBtn}>
          ← Back
        </button>
        <div style={styles.titleWrapper}>
          <h1 style={styles.heading}>POS Management</h1>
          <p style={styles.subheading}>Centralized Menu Control System</p>
        </div>
      </header>

      <main style={styles.mainContent}>
        {/* ACTION ROW: CLONE & WIPE */}
        <section style={styles.adminCard}>
          <div style={styles.inputGroup}>
            <button onClick={cloneFromCentral} style={styles.primaryBtn}>Sync from Central</button>
            <input style={styles.premiumInput} placeholder="Target Franchise ID" value={targetFranchise} onChange={e => setTargetFranchise(e.target.value)} />
          </div>
          <div style={styles.inputGroup}>
            <input style={{...styles.premiumInput, borderColor: DANGER}} placeholder="Wipe Franchise ID" value={deleteTargetId} onChange={e => setDeleteTargetId(e.target.value)} />
            <button onClick={deleteWholeMenu} style={styles.dangerBtn}>Wipe Menu</button>
          </div>
        </section>

        {/* CONTROLS CARD */}
        <section style={styles.controlCard}>
          <div style={styles.row}>
            <div style={styles.selectWrapper}>
              <select style={styles.premiumSelect} value={viewFranchise} onChange={e => { setViewFranchise(e.target.value); getMenu(e.target.value); }}>
                <option value="">Select a Franchise...</option>
                {franchises.map(id => <option key={id} value={id}>Franchise {id}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px", flex: 1 }}>
              <input style={styles.premiumInput} value={viewFranchise} onChange={e => setViewFranchise(e.target.value)} placeholder="Franchise ID" />
              <button onClick={() => getMenu()} style={styles.secondaryBtn}>Load Data</button>
            </div>
          </div>

          <div style={styles.searchRow}>
            <div style={styles.searchBarWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input style={styles.searchField} placeholder="Quick search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                style={{...styles.addBtn, background: !viewFranchise ? '#f5f5f5' : GREEN, color: !viewFranchise ? '#aaa' : '#fff'}} 
                disabled={!viewFranchise}
            >
                + New Item
            </button>
          </div>

          {menus.length > 0 && (
            <div style={styles.scrollWrapper}>
              {categories.map(c => (
                <button key={c} onClick={() => setSelectedCategory(c)} style={selectedCategory === c ? styles.activeTab : styles.tab}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* LIST SECTION */}
        <section style={styles.listContainer}>
          {loading ? (
            <div style={styles.loadingState}>Updating System...</div>
          ) : Object.keys(groupedMenu).length > 0 ? (
            Object.keys(groupedMenu).map(cat => (
              <div key={cat} style={styles.categoryGroup}>
                <h3 style={styles.categoryHeader}>{cat}</h3>
                <div style={styles.itemsWrapper}>
                  {groupedMenu[cat].map(item => (
                    <div key={item.id} style={styles.premiumItemRow}>
                      <div style={styles.itemLead}>
                        <span style={styles.itemNameText}>{item.item_name}</span>
                        <span style={styles.itemPriceText}>₹{item.price}</span>
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
            <div style={styles.emptyState}>{viewFranchise ? "No items found." : "Please select a franchise to view menu."}</div>
          )}
        </section>
      </main>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: GREEN, marginBottom: '20px' }}>Add New Menu Item</h2>
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

      {/* EDIT MODAL */}
      {isEditModalOpen && editingItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: GREEN, marginBottom: '20px' }}>Modify Item</h2>
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
  page: { background: "#f8f9fa", minHeight: "100vh", fontFamily: '"Inter", sans-serif', padding: "40px 20px" },
  header: { display: "flex", alignItems: "center", position: "relative", maxWidth: "1100px", margin: "0 auto 40px auto" },
  backBtn: { background: "none", border: "none", color: GREEN, fontSize: "16px", fontWeight: "700", cursor: "pointer", padding: "10px 0", position: "absolute", left: 0 },
  titleWrapper: { flex: 1, textAlign: "center" },
  heading: { fontSize: "32px", fontWeight: "800", color: "#1a1a1a", letterSpacing: "-1px", margin: 0 },
  subheading: { color: "#6c757d", fontSize: "14px", marginTop: "5px", fontWeight: "500" },
  mainContent: { maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" },
  adminCard: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", justifyContent: "space-between", border: "1px solid #edf2f7", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
  controlCard: { background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #edf2f7", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" },
  inputGroup: { display: "flex", gap: "12px", alignItems: "center" },
  premiumInput: { padding: "0 16px", height: "48px", borderRadius: "10px", border: "2px solid #edf2f7", outline: "none", fontSize: "14px", fontWeight: "500", transition: "all 0.2s", width: "200px" },
  primaryBtn: { background: GREEN, color: "#fff", border: "none", height: "48px", padding: "0 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  dangerBtn: { background: LIGHT_GREEN, color: DANGER, border: `2px solid ${DANGER}`, height: "48px", padding: "0 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  secondaryBtn: { background: "#1a1a1a", color: "#fff", border: "none", height: "48px", padding: "0 24px", borderRadius: "10px", fontWeight: "600", cursor: "pointer" },
  row: { display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center" },
  premiumSelect: { width: "100%", height: "48px", padding: "0 16px", borderRadius: "10px", border: "2px solid #edf2f7", appearance: "none", cursor: "pointer", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%234A5568%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E') no-repeat right 15px center", outline: "none" },
  selectWrapper: { position: "relative", width: "300px" },
  searchRow: { display: "flex", gap: "16px", alignItems: "center", marginBottom: "20px" },
  searchBarWrapper: { position: "relative", flex: 1 },
  searchIcon: { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "18px" },
  searchField: { width: "100%", height: "54px", padding: "0 16px 0 48px", borderRadius: "12px", border: `2px solid ${LIGHT_GREEN}`, background: "#fcfcfc", outline: "none", fontSize: "15px" },
  addBtn: { border: "none", height: "54px", padding: "0 28px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  scrollWrapper: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" },
  tab: { padding: "10px 20px", borderRadius: "30px", background: "#f1f3f5", border: "none", color: "#495057", fontWeight: "600", cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap" },
  activeTab: { padding: "10px 20px", borderRadius: "30px", background: GREEN, color: "#fff", fontWeight: "700", border: "none", whiteSpace: "nowrap" },
  listContainer: { display: "flex", flexDirection: "column", gap: "32px" },
  categoryGroup: { borderBottom: "1px solid #eee", paddingBottom: "20px" },
  categoryHeader: { fontSize: "12px", color: GREEN, fontWeight: "900", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px", display: "inline-block", background: LIGHT_GREEN, padding: "4px 12px", borderRadius: "4px" },
  premiumItemRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "12px", background: "#fff", transition: "0.2s", marginBottom: "8px" },
  itemLead: { display: "flex", alignItems: "center", flex: 1 },
  itemNameText: { fontSize: "16px", fontWeight: "600", color: "#2d3436", minWidth: "250px" },
  itemPriceText: { fontSize: "16px", fontWeight: "800", color: GREEN },
  itemActions: { display: "flex", gap: "12px", alignItems: "center" },
  iconBtn: { background: "none", border: `1.5px solid ${GREEN}`, color: GREEN, padding: "6px 16px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", padding: "5px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "40px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" },
  modalInput: { padding: "12px", marginBottom: "15px", border: "1px solid #ddd", borderRadius: "8px", outline: "none", width: "100%", boxSizing: "border-box", fontSize: '14px' },
  label: { fontSize: "12px", fontWeight: "bold", color: "#666", marginBottom: "5px", display: "block" },
  cancelBtn: { background: "#f5f5f5", border: "none", color: "#666", padding: "0 20px", borderRadius: "8px", height: "48px", cursor: "pointer", fontWeight: '600' },
  loadingState: { textAlign: "center", padding: "100px", color: "#aaa" },
  emptyState: { textAlign: "center", padding: "40px", color: "#666" }
};

export default PosManagement;