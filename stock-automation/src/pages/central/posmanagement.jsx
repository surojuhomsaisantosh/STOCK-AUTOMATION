import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { ArrowLeft } from "lucide-react";

const GREEN = "rgb(0,100,55)";
const LIGHT_GREEN = "rgba(0,100,55,0.05)";
const DANGER = "#e63946";
const CENTRAL_ID = "TV-1";

function PosManagement() {
  const [allCompanyRecords, setAllCompanyRecords] = useState([]);
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

  useEffect(() => {
    if (selectedCompany && viewFranchise) {
      const isValid = allCompanyRecords.some(
        p => p.company_name.toLowerCase() === selectedCompany.toLowerCase() && p.franchise_id === viewFranchise
      );
      if (!isValid) {
        setViewFranchise("");
        setMenus([]);
      }
    }
  }, [selectedCompany, allCompanyRecords, viewFranchise]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { data, error } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        if (error) throw error;
        if (data) setMyFranchiseId(data.franchise_id);
      }
    } catch (err) {
      console.error("Error fetching user:", err.message);
    }
  };

  const fetchFranchises = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("franchise_id, company_name");

      if (error) throw error;

      if (data) {
        console.log("=== DEBUG 1: Raw Data from Supabase ===", data);

        const cleanedData = data
          .filter(d => d.company_name && String(d.company_name).trim() !== "")
          .map(d => ({
            company_name: String(d.company_name).trim(),
            franchise_id: d.franchise_id ? String(d.franchise_id).trim() : null
          }));

        console.log("=== DEBUG 2: Cleaned allCompanyRecords ===", cleanedData);
        setAllCompanyRecords(cleanedData);

        const uniqueCompanies = [...new Set(cleanedData.map(d => d.company_name))].sort();
        setCompanies(uniqueCompanies);
      }
    } catch (err) {
      showToast("Failed to load companies: " + err.message, "error");
    }
  };

  // DEBUGGING ADDED TO THE MEMO FILTER
  const filteredFranchises = useMemo(() => {
    console.log("=== DEBUG 3: Re-running filteredFranchises calculation ===");
    console.log("Selected Company State:", `"${selectedCompany}"`);

    if (!selectedCompany) {
      console.log("Result: No company selected, returning empty array.");
      return [];
    }

    const filteredRecords = allCompanyRecords.filter(p => {
      const nameMatches = p.company_name.toLowerCase() === selectedCompany.toLowerCase();
      const hasValidId = p.franchise_id !== null && p.franchise_id !== "";

      // If it has an ID but the name fails to match, let's log it to see why
      if (hasValidId && p.company_name.toLowerCase().includes(selectedCompany.toLowerCase().substring(0, 3))) {
        console.log(`Checking record: DB Name="${p.company_name}", Selected="${selectedCompany}", Match=${nameMatches}`);
      }

      return nameMatches && hasValidId;
    });

    console.log("Filtered Records Matching Company:", filteredRecords);

    const matchingIds = filteredRecords.map(p => p.franchise_id);
    const finalIds = [...new Set(matchingIds)].sort();

    console.log("Final Unique IDs mapped to dropdown:", finalIds);
    return finalIds;
  }, [selectedCompany, allCompanyRecords]);

  const getMenu = async (idOverride) => {
    const id = (idOverride || viewFranchise)?.toString().trim();
    if (!id) { setMenus([]); return; }

    setLoading(true);
    setMenus([]);

    try {
      const cacheKey = `pos_menu_${id}`;
      const cachedMenu = sessionStorage.getItem(cacheKey);

      if (cachedMenu) {
        setMenus(JSON.parse(cachedMenu));
        setSelectedCategory("All");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("menus").select("*").eq("franchise_id", id).order("category");
      if (error) throw error;

      const fetchedMenu = data || [];
      setMenus(fetchedMenu);
      sessionStorage.setItem(cacheKey, JSON.stringify(fetchedMenu));

    } catch (err) {
      showToast("Failed to load menu: " + err.message, "error");
    } finally {
      setSelectedCategory("All");
      setLoading(false);
    }
  };

  const refreshMenuCache = (id) => {
    sessionStorage.removeItem(`pos_menu_${id}`);
    getMenu(id);
  };

  const cloneFromCentral = async () => {
    const finalTargetId = targetFranchise.trim();
    if (!finalTargetId) return showToast("Enter Target ID", "error");

    const exists = allCompanyRecords.some(p => p.franchise_id === finalTargetId);
    if (!exists) return showToast(`ID ${finalTargetId} not found in database`, "error");

    setLoading(true);
    try {
      const { error } = await supabase.rpc('clone_franchise_menu', {
        target_id: finalTargetId,
        central_id: CENTRAL_ID
      });

      if (error) throw error;

      showToast(`🚀 Menu Synced to ${finalTargetId}`);
      refreshMenuCache(finalTargetId);
      setTargetFranchise("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteWholeMenu = async () => {
    const finalTargetId = deleteTargetId.trim();
    if (!finalTargetId) return showToast("Enter Franchise ID", "error");
    if (finalTargetId === CENTRAL_ID) return showToast("Cannot wipe Central", "error");

    const exists = allCompanyRecords.some(p => p.franchise_id === finalTargetId);
    if (!exists) return showToast(`Franchise ID ${finalTargetId} not found in database`, "error");

    if (window.confirm(`⚠️ DANGER: Permanent wipe for ${finalTargetId}?`)) {
      setLoading(true);
      try {
        const { error } = await supabase.rpc('delete_franchise_menu_global', {
          target_id: finalTargetId
        });

        if (error) throw error;

        showToast(`🗑️ Menu Wiped for ${finalTargetId}`, "success");
        sessionStorage.removeItem(`pos_menu_${finalTargetId}`);
        if (viewFranchise === finalTargetId) setMenus([]);
        setDeleteTargetId("");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const { error } = await supabase.from("menus").delete().eq("id", id);
      if (error) throw error;

      showToast("Item removed successfully");
      refreshMenuCache(viewFranchise);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const addItem = async () => {
    const name = newItem.item_name.trim();
    const priceStr = newItem.price.toString().trim();
    const category = newItem.category.trim().toUpperCase();

    if (!name || !priceStr || !category) return showToast("Please fill all fields", "error");
    if (isNaN(Number(priceStr))) return showToast("Price must be a valid number", "error");

    setLoading(true);
    try {
      const { error } = await supabase.from("menus").insert({
        franchise_id: viewFranchise,
        item_name: name,
        price: Number(priceStr),
        category: category
      });

      if (error) throw error;

      showToast("Item added successfully");
      setIsAddModalOpen(false);
      setNewItem({ item_name: "", price: "", category: "" });
      refreshMenuCache(viewFranchise);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    const name = editingItem.item_name.toString().trim();
    const priceStr = editingItem.price.toString().trim();
    const category = editingItem.category.toString().trim().toUpperCase();

    if (!name || !priceStr || !category) return showToast("Fields cannot be empty", "error");
    if (isNaN(Number(priceStr))) return showToast("Price must be a valid number", "error");

    try {
      const { error } = await supabase.from("menus").update({
        item_name: name,
        price: Number(priceStr),
        category: category
      }).eq("id", editingItem.id);

      if (error) throw error;

      showToast("Item updated successfully");
      setIsEditModalOpen(false);
      refreshMenuCache(viewFranchise);
    } catch (err) {
      showToast(err.message, "error");
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
        
        .category-scroll::-webkit-scrollbar { height: 6px; }
        .category-scroll::-webkit-scrollbar-track { background: transparent; }
        .category-scroll::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); border-radius: 10px; }
        .category-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.4); }
      `}</style>

      {toast.show && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === "success" ? GREEN : DANGER }}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => window.history.back()} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>
            Menu <span style={{ color: GREEN }}>Management</span>
          </h1>
          <div style={styles.idBox}>
            ID : {myFranchiseId || "---"}
          </div>
        </div>
      </header>

      <main style={styles.mainContent}>

        {/* =========================================
            SECTION 1: COMPANY & FRANCHISE SELECTION 
            ========================================= */}
        <section style={styles.controlCard}>
          <div style={{ ...styles.row, flexDirection: isMobile ? 'column' : 'row', marginBottom: 0 }}>
            <div style={{ ...styles.selectWrapper, width: isMobile ? '100%' : '50%' }}>
              <label style={styles.miniLabel}>Select a Company</label>
              <select
                style={styles.premiumSelect}
                value={selectedCompany}
                onChange={e => {
                  console.log("=== DEBUG 0: Dropdown Change Triggered ===", `"${e.target.value}"`);
                  setSelectedCompany(e.target.value);
                  setViewFranchise("");
                  setMenus([]);
                }}
              >
                <option value="">-- View All Companies --</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ ...styles.selectWrapper, width: isMobile ? '100%' : '50%' }}>
              <label style={styles.miniLabel}>Select Franchise ID</label>
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
                <option value="">
                  {!selectedCompany
                    ? "Select a Company First"
                    : (filteredFranchises.length === 0 ? "No IDs assigned to this company" : "-- Choose Franchise --")}
                </option>
                {filteredFranchises.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* =========================================
            SECTION 2: ADMIN ACTIONS (SYNC & WIPE) 
            ========================================= */}
        <section style={{
          ...styles.adminCard,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: isMobile ? 'flex-start' : 'space-between'
        }}>
          {/* Sync Block */}
          <div style={{ ...styles.inputGroup, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={cloneFromCentral} style={{ ...styles.primaryBtn, width: isMobile ? '100%' : 'auto' }} disabled={loading}>
              Sync from Central
            </button>
            <input
              style={{ ...styles.premiumInput, width: isMobile ? '100%' : '160px' }}
              placeholder="Target ID"
              value={targetFranchise}
              onChange={e => setTargetFranchise(e.target.value)}
            />
          </div>

          {isMobile && <div style={{ height: '1px', background: '#eee', margin: '8px 0' }}></div>}

          {/* Wipe Block */}
          <div style={{ ...styles.inputGroup, width: isMobile ? '100%' : 'auto' }}>
            <input
              style={{ ...styles.premiumInput, borderColor: DANGER, width: isMobile ? '100%' : '160px' }}
              placeholder="Wipe ID"
              value={deleteTargetId}
              onChange={e => setDeleteTargetId(e.target.value)}
            />
            <button onClick={deleteWholeMenu} style={{ ...styles.dangerBtn, width: isMobile ? '100%' : 'auto' }} disabled={loading}>
              Wipe Menu
            </button>
          </div>
        </section>

        {/* =========================================
            SECTION 3: SEARCH & ADD ITEM
            ========================================= */}
        <section style={{ ...styles.controlCard, paddingBottom: '20px' }}>
          <div style={{ ...styles.searchRow, flexDirection: isMobile ? 'column' : 'row', margin: 0 }}>
            <div style={styles.searchBarWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                style={styles.searchField}
                placeholder="Search items by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={!viewFranchise}
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                ...styles.addBtn,
                width: isMobile ? '100%' : 'auto',
                background: !viewFranchise ? '#f5f5f5' : GREEN,
                color: !viewFranchise ? '#aaa' : '#fff',
                cursor: !viewFranchise ? 'not-allowed' : 'pointer'
              }}
              disabled={!viewFranchise}
            >
              + Add Item
            </button>
          </div>
        </section>

        {/* =========================================
            SECTION 4: MENU ITEMS TABLE & CATEGORIES
            ========================================= */}
        <section style={{ ...styles.controlCard, minHeight: '300px' }}>

          {/* Categories Tab Header */}
          {menus.length > 0 && (
            <div style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0, fontWeight: '800', color: '#334155' }}>Menu Categories</h2>
                <span style={styles.totalBadge}>Total Items: {filteredMenus.length}</span>
              </div>
              <div style={styles.scrollWrapper} className="category-scroll">
                {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)} style={selectedCategory === c ? styles.activeTab : styles.tab}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table / List Body */}
          <div style={styles.listContainer}>
            {loading ? (
              <div style={styles.loadingState}>Refreshing Menu...</div>
            ) : Object.keys(groupedMenu).length > 0 ? (
              Object.keys(groupedMenu).map(cat => (
                <div key={cat} style={styles.categoryGroup}>
                  <div style={styles.categoryHeaderContainer}>
                    <h3 style={styles.categoryHeader}>{cat}</h3>
                  </div>

                  <div style={styles.itemsWrapper}>
                    {groupedMenu[cat].map(item => (
                      <div key={item.id} style={styles.premiumItemRow}>
                        <div style={styles.itemLead}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={styles.itemNameText}>{item.item_name}</span>
                            <span style={styles.itemPriceText}>₹{item.price}</span>
                          </div>
                        </div>
                        <div style={styles.itemActions}>
                          <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} style={styles.iconBtn}>Edit</button>
                          <button onClick={() => deleteItem(item.id)} style={styles.deleteBtn} title="Delete Item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DANGER} strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                {viewFranchise
                  ? (searchQuery ? "No items match your search." : "No items found in this franchise menu. Click '+ Add Item' or Sync from Central.")
                  : "Please select a Company and Franchise to view the items table."}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* =========================================
          MODALS
          ========================================= */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '400px' }}>
            <h2 style={{ color: GREEN, marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Add New Menu Item</h2>
            <label style={styles.label}>Item Name</label>
            <input style={styles.modalInput} placeholder="e.g. Chicken Burger" onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} />
            <label style={styles.label}>Price (₹)</label>
            <input type="number" style={styles.modalInput} placeholder="e.g. 199" onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
            <label style={styles.label}>Category</label>
            <input style={styles.modalInput} placeholder="e.g. BURGERS" onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button onClick={addItem} style={{ ...styles.primaryBtn, flex: 1 }} disabled={loading}>
                {loading ? "Saving..." : "Save Item"}
              </button>
              <button onClick={() => setIsAddModalOpen(false)} style={styles.cancelBtn} disabled={loading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingItem && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '400px' }}>
            <h2 style={{ color: GREEN, marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Modify Item</h2>
            <label style={styles.label}>Item Name</label>
            <input style={styles.modalInput} value={editingItem.item_name} onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })} />
            <label style={styles.label}>Price (₹)</label>
            <input type="number" style={styles.modalInput} value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} />
            <label style={styles.label}>Category</label>
            <input style={styles.modalInput} value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button onClick={saveEdit} style={{ ...styles.primaryBtn, flex: 1 }}>Update Item</button>
              <button onClick={() => setIsEditModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f8f9fa", minHeight: "100vh", fontFamily: '"Inter", sans-serif', padding: 0, overflowX: 'hidden' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '12px', color: '#fff', fontWeight: '800', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center', minWidth: '280px', maxWidth: '90%' },

  // Header
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 },

  // Layouts
  mainContent: { width: "100%", display: "flex", flexDirection: "column", gap: "24px", padding: "0 20px 20px 20px" },
  controlCard: { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #edf2f7", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" },
  adminCard: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", justifyContent: "flex-start", gap: "20px", border: "1px solid #edf2f7", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },

  // Inputs & Buttons
  inputGroup: { display: "flex", gap: "10px", alignItems: "center" },
  premiumInput: { padding: "0 16px", height: "48px", borderRadius: "10px", border: "2px solid #edf2f7", outline: "none", fontSize: '14px' },
  primaryBtn: { background: GREEN, color: "#fff", border: "none", height: "48px", padding: "0 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap' },
  dangerBtn: { background: "#fff", color: DANGER, border: `2px solid ${DANGER}`, height: "48px", padding: "0 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap' },

  row: { display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center" },
  miniLabel: { fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '6px', display: 'block' },
  premiumSelect: { width: "100%", height: "48px", padding: "0 16px", borderRadius: "10px", border: "2px solid #edf2f7", appearance: "none", cursor: "pointer", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%234A5568%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E') no-repeat right 15px center", outline: "none", fontSize: '14px', backgroundColor: '#fff' },
  selectWrapper: { position: "relative" },

  searchRow: { display: "flex", gap: "12px", alignItems: "center" },
  searchBarWrapper: { position: "relative", flex: 1, width: '100%' },
  searchIcon: { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: '#999' },
  searchField: { width: "100%", height: "50px", padding: "0 16px 0 44px", borderRadius: "12px", border: `2px solid ${LIGHT_GREEN}`, background: "#fcfcfc", outline: "none", fontSize: '14px' },
  addBtn: { border: "none", height: "50px", padding: "0 24px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: '14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  totalBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '800', color: GREEN, background: LIGHT_GREEN, padding: '6px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  scrollWrapper: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" },
  tab: { padding: "8px 20px", borderRadius: "30px", background: "#f1f3f5", border: "none", color: "#495057", fontWeight: "600", cursor: "pointer", fontSize: '13px', whiteSpace: 'nowrap' },
  activeTab: { padding: "8px 20px", borderRadius: "30px", background: GREEN, color: "#fff", fontWeight: "700", border: "none", fontSize: '13px', whiteSpace: 'nowrap' },

  // Lists
  listContainer: { display: "flex", flexDirection: "column", gap: "16px" },
  categoryGroup: { borderBottom: "1px solid #eee", paddingBottom: "10px" },
  categoryHeaderContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' },
  categoryHeader: { fontSize: "12px", color: GREEN, fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", margin: 0, display: "inline-block", background: LIGHT_GREEN, padding: "4px 10px", borderRadius: "6px" },

  premiumItemRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "12px", background: "#fff", marginBottom: "10px", border: '1px solid #f0f0f0' },
  itemLead: { display: "flex", alignItems: "center", flex: 1, overflow: 'hidden' },
  itemNameText: { fontSize: "15px", fontWeight: "600", color: "#2d3436", display: 'block', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemPriceText: { fontSize: "14px", fontWeight: "800", color: GREEN },
  itemActions: { display: "flex", gap: "12px", alignItems: "center", paddingLeft: '10px' },
  iconBtn: { background: "none", border: `1px solid ${GREEN}`, color: GREEN, padding: "6px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: '12px' },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", padding: "5px", color: DANGER },

  // Modals
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', display: 'block' },
  modalInput: { padding: "12px", marginBottom: "15px", border: "1px solid #e2e8f0", borderRadius: "10px", width: "100%", fontSize: '14px', outline: 'none' },
  cancelBtn: { background: "#f1f5f9", border: "none", color: "#64748b", padding: "0 20px", borderRadius: "10px", height: "48px", cursor: "pointer", fontWeight: '700', fontSize: '14px' },

  loadingState: { textAlign: "center", padding: "60px", color: "#94a3b8", fontWeight: '500' },
  emptyState: { textAlign: "center", padding: "40px", color: "#94a3b8", background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }
};

export default PosManagement;