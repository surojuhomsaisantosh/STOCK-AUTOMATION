import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";

// Color Palette
const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

/* ==========================================================
   PRINTER LOGIC HOOK (Based on your provided file)
   ========================================================== */
function useBluetoothPrinter() {
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectPrinter = async () => {
    setIsConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'TM-' }, { namePrefix: 'EPSON' },
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt?.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      setConnectedPrinter({ device, characteristic });
      alert(`✅ Connected to ${device.name}`);
    } catch (error) {
      console.error(error);
      alert("Connection failed. Ensure Bluetooth is ON.");
    } finally {
      setIsConnecting(false);
    }
  };

  const printReceipt = async (billData) => {
    if (!connectedPrinter?.characteristic) {
      console.warn("No printer connected, skipping physical print.");
      return;
    }
    try {
      const encoder = new TextEncoder();
      // Simple ESC/POS text-only receipt
      let text = `\x1B\x40\x1B\x61\x01T-VANAMM\n----------------\n`;
      billData.items.forEach(i => {
        text += `${i.name.padEnd(12)} x${i.qty} ${i.total}\n`;
      });
      text += `----------------\nTOTAL: Rs ${billData.total}\n\n\n\x1D\x56\x00`;
      
      const data = encoder.encode(text);
      await connectedPrinter.characteristic.writeValue(data);
    } catch (err) {
      console.error("Print Error:", err);
    }
  };

  return { connectPrinter, printReceipt, isConnected: !!connectedPrinter, isConnecting };
}

/* ==========================================================
   MAIN STORE COMPONENT
   ========================================================== */
function Store() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const { connectPrinter, printReceipt, isConnected, isConnecting } = useBluetoothPrinter();

  const [activeTab, setActiveTab] = useState("billing");
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchingMenu, setFetchingMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [history, setHistory] = useState([]);
  
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const franchiseId = useMemo(() => user?.franchise_id ? String(user.franchise_id) : null, [user]);

  const fetchMenu = async () => {
    if (!franchiseId) return;
    setFetchingMenu(true);
    const { data } = await supabase.from("menus").select("*").eq("franchise_id", franchiseId.trim()).eq("is_active", true);
    if (data) {
      setMenuItems(data);
      const uniqueCats = ["All", ...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCats);
    }
    setFetchingMenu(false);
  };

  const fetchHistory = async () => {
    if (!franchiseId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase.from("bills_generated").select("*").eq("franchise_id", franchiseId).gte("created_at", today.toISOString()).order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  useEffect(() => { if (franchiseId) { fetchMenu(); fetchHistory(); } }, [franchiseId]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const sortedHistory = useMemo(() => {
    let sortableItems = [...history];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [history, sortConfig]);

  const addToCart = (item) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === item.id);
      return ex ? prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.id !== id));
  const updateQty = (id, delta) => setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((i) => i.qty > 0));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const calculatedDiscount = discountType === "percent" ? (subtotal * (discountValue / 100)) : discountValue;
    return { subtotal, discountAmt: calculatedDiscount, total: Math.max(0, subtotal - calculatedDiscount) };
  }, [cart, discountValue, discountType]);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = (item.item_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCompleteTransaction = async (method) => {
    if (!cart.length) return;
    try {
      const { data: bill, error: billError } = await supabase
        .from("bills_generated")
        .insert([{
            franchise_id: franchiseId,
            subtotal: totals.subtotal,
            tax: 0,
            discount: totals.discountAmt,
            total: totals.total,
            payment_mode: method,
        }])
        .select().single();

      if (billError) throw billError;

      const billItems = cart.map((item) => ({
        bill_id: bill.id,
        item_id: item.id,
        item_name: item.item_name,
        qty: item.qty,
        price: item.price,
        total: item.price * item.qty,
      }));

      await supabase.from("bills_items_generated").insert(billItems);

      // 🖨️ Physical Bluetooth Print Trigger
      await printReceipt({
        total: totals.total.toFixed(2),
        paymentMode: method,
        items: cart.map(i => ({ name: i.item_name, qty: i.qty, total: (i.price * i.qty).toFixed(2) }))
      });

      alert(`✅ ${method} Payment successful!`);
      setCart([]);
      setDiscountValue(0);
      setShowPaymentModal(false);
      fetchHistory();
    } catch (err) {
      alert("Checkout failed.");
    }
  };

  const SortArrow = ({ column }) => {
    if (sortConfig.key !== column) return <span style={{opacity: 0.3, marginLeft: '5px'}}>↕</span>;
    return sortConfig.direction === 'asc' ? <span style={{marginLeft: '5px'}}>↑</span> : <span style={{marginLeft: '5px'}}>↓</span>;
  };

  if (authLoading) return <div style={styles.loader}>Loading POS...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        {!isMobile && <div style={{ width: "120px" }}></div>} 
        <h1 style={styles.centerTitle}>STORE DASHBOARD</h1>
        <div style={styles.franchiseLabel}>Franchise ID: {franchiseId}</div>
      </div>

      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...(activeTab === "billing" ? styles.activeToggle : styles.inactiveToggle) }} onClick={() => setActiveTab("billing")}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...(activeTab === "history" ? styles.activeToggle : styles.inactiveToggle) }} onClick={() => setActiveTab("history")}>HISTORY</button>
      </div>

      {activeTab === "billing" ? (
        <div style={{...styles.splitLayout, flexDirection: isMobile ? 'column' : 'row'}}>
          <div style={{...styles.menuContainer, flex: isMobile ? 'none' : 0.65}}>
            <div style={styles.actionRow}>
              <input style={styles.searchInput} placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button 
                style={{...styles.greenCardBtn, background: isConnected ? PRIMARY : '#6b7280'}} 
                onClick={connectPrinter}
                disabled={isConnecting}
              >
                {isConnecting ? "⌛ ..." : isConnected ? "✅ PRINTER ON" : "🔌 CONNECT PRINTER"}
              </button>
            </div>

            <div style={styles.categoryContainer}>
                <div style={styles.categoryRow}>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} style={{...styles.catBtn, ...(selectedCategory === cat ? styles.catBtnActive : {})}}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{...styles.grid, gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(140px, 1fr))" : "repeat(auto-fill, minmax(180px, 1fr))"}}>
              {filteredItems.map((item) => (
                <div key={item.id} 
                     style={{...styles.itemCard, ...(hoveredItem === item.id ? styles.itemCardHover : styles.itemCardDefault)}} 
                     onMouseEnter={() => setHoveredItem(item.id)} 
                     onMouseLeave={() => setHoveredItem(null)} 
                     onClick={() => addToCart(item)}>
                  <div style={styles.cardInfo}>
                    <span style={styles.itemName}>{item.item_name}</span>
                    <span style={styles.itemPrice}>₹{item.price}</span>
                  </div>
                  <div style={{...styles.addIconCircle, ...(hoveredItem === item.id ? { background: PRIMARY, color: '#fff' } : {})}}>+</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{...styles.cartContainer, flex: isMobile ? 'none' : 0.35}}>
            <h3 style={styles.sectionLabel}>Current Order</h3>
            <div style={styles.cartList}>
              {cart.length === 0 && <p style={styles.emptyText}>Cart is empty</p>}
              {cart.map((item) => (
                <div key={item.id} style={styles.cartRow}>
                  <div style={styles.cartMeta}>
                    <span style={styles.cartItemName}>{item.item_name}</span>
                    <span style={styles.cartItemPrice}>₹{item.price}</span>
                  </div>
                  <div style={styles.cartActions}>
                    <div style={styles.qtyControls}>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.id, -1)}>-</button>
                        <span style={styles.qtyVal}>{item.qty}</span>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                    <button style={styles.deleteBtn} onClick={() => removeFromCart(item.id)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.billingFooter}>
              <div style={styles.totalLine}><span>Total Payable</span><span style={styles.grandTotal}>₹{totals.total.toFixed(2)}</span></div>
              <button style={{ ...styles.payBtn, opacity: cart.length ? 1 : 0.5 }} disabled={!cart.length} onClick={() => setShowPaymentModal(true)}>COMPLETE TRANSACTION</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.historyContainer}>
          <div style={styles.historyHeader}>
            <h2 style={styles.sectionLabel}>Today's Billing History</h2>
            <button onClick={logout} style={styles.redLogout}>SIGN OUT</button>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th} onClick={() => requestSort('id')}>Bill ID <SortArrow column="id"/></th>
                  <th style={styles.th} onClick={() => requestSort('payment_mode')}>Mode <SortArrow column="payment_mode"/></th>
                  <th style={styles.th} onClick={() => requestSort('subtotal')}>Amount <SortArrow column="subtotal"/></th>
                  <th style={styles.th} onClick={() => requestSort('total')}>After Disc. <SortArrow column="total"/></th>
                  <th style={styles.th} onClick={() => requestSort('created_at')}>Time <SortArrow column="created_at"/></th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.length > 0 ? sortedHistory.map((bill) => (
                  <tr key={bill.id} style={styles.tr}>
                    <td style={styles.td}>#{bill.id.toString().slice(-6).toUpperCase()}</td>
                    <td style={styles.td}><span style={styles.modeBadge}>{bill.payment_mode}</span></td>
                    <td style={styles.td}>₹{bill.subtotal}</td>
                    <td style={styles.td}><strong style={{color: PRIMARY}}>₹{bill.total}</strong></td>
                    <td style={styles.td}>
                      {new Date(bill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={styles.emptyTable}>No bills found today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '95%' : '420px'}}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, fontSize: '16px'}}>Payment Summary</h3>
              <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.itemReview}>
                {cart.map(i => (
                    <div key={i.id} style={styles.modalRow}>
                        <span>{i.item_name} (x{i.qty})</span>
                        <span>₹{(i.price * i.qty).toFixed(2)}</span>
                    </div>
                ))}
              </div>
              <div style={styles.discountSection}>
                <div style={styles.discountToggle}>
                    <button onClick={() => setDiscountType("fixed")} style={{...styles.greenCardToggle, ...(discountType === "fixed" ? styles.distBtnActive : {})}}>₹ Fixed</button>
                    <button onClick={() => setDiscountType("percent")} style={{...styles.greenCardToggle, ...(discountType === "percent" ? styles.distBtnActive : {})}}>% Percent</button>
                </div>
                <input type="number" placeholder="Enter Discount" style={styles.modalInput} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
              </div>
              <div style={styles.summaryBox}>
                <div style={styles.summaryLine}><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                <div style={styles.summaryLine}><span>Discount</span><span>- ₹{totals.discountAmt.toFixed(2)}</span></div>
                <div style={styles.summaryTotal}><span>Total Payable</span><span>₹{totals.total.toFixed(2)}</span></div>
              </div>
              <div style={styles.payOptions}>
                <button style={styles.methodBtn} onClick={() => handleCompleteTransaction('CASH')}>CASH</button>
                <button style={styles.methodBtn} onClick={() => handleCompleteTransaction('UPI')}>UPI</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", height: "100vh", overflow: "hidden", fontFamily: '"Inter", sans-serif' },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 25px", borderBottom: `1px solid ${BORDER}` },
  centerTitle: { fontSize: "16px", fontWeight: "800", margin: 0, letterSpacing: '0.5px' },
  franchiseLabel: { fontSize: "11px", fontWeight: "700", color: PRIMARY },
  
  fullToggleBar: { display: "flex", width: "100%", padding: "8px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}` },
  toggleBtn: { 
    flex: 1, padding: "16px", background: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "12px", 
    borderWidth: "0px 0px 3px 0px", borderStyle: "solid" 
  },
  inactiveToggle: { borderColor: "transparent", color: "#6b7280" },
  activeToggle: { color: PRIMARY, borderColor: PRIMARY, background: "#f9fafb" },
  
  splitLayout: { display: "flex", height: "calc(100vh - 115px)" },
  menuContainer: { padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column" },
  cartContainer: { padding: "20px", background: "#fff", display: "flex", flexDirection: "column", borderLeft: `1px solid ${BORDER}` },
  actionRow: { display: "flex", gap: "10px", marginBottom: "15px" },
  categoryContainer: { width: '100%', marginBottom: '20px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '10px' },
  categoryRow: { display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: 'none' },
  greenCardBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "0 20px", borderRadius: "10px", fontSize: "10px", fontWeight: "700", cursor: "pointer", boxShadow: '0 4px 6px rgba(6, 95, 70, 0.2)' },
  catBtn: { padding: "8px 20px", borderRadius: "12px", border: `1px solid ${BORDER}`, background: "#fff", color: "#6b7280", cursor: "pointer", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" },
  catBtnActive: { background: PRIMARY, color: "#fff", borderColor: PRIMARY, boxShadow: '0 4px 10px rgba(6, 95, 70, 0.3)' },
  searchInput: { flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${BORDER}`, outline: "none", fontSize: "14px" },
  grid: { display: "grid", gap: "12px" },
  
  itemCard: { padding: "18px", borderWidth: "1px", borderStyle: "solid", borderRadius: "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", transition: "0.2s ease" },
  itemCardDefault: { borderColor: BORDER },
  itemCardHover: { borderColor: PRIMARY, boxShadow: "0 8px 15px rgba(0,0,0,0.04)", transform: "translateY(-2px)" },
  
  cardInfo: { display: "flex", flexDirection: "column", gap: '2px' },
  itemName: { fontSize: "13px", fontWeight: "700" },
  itemPrice: { fontSize: "12px", fontWeight: "800", color: PRIMARY },
  addIconCircle: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af', fontWeight: 'bold' },
  sectionLabel: { fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#9ca3af", marginBottom: "15px" },
  cartList: { flex: 1, overflowY: "auto" },
  cartRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f9fafb" },
  cartMeta: { display: "flex", flexDirection: "column" },
  cartItemName: { fontSize: "13px", fontWeight: "600" },
  cartItemPrice: { fontSize: "11px", color: "#9ca3af" },
  cartActions: { display: "flex", alignItems: "center", gap: "10px" },
  qtyControls: { display: "flex", background: "#f3f4f6", borderRadius: "8px", padding: "4px 8px", alignItems: "center", gap: "8px" },
  qtyBtn: { border: "none", background: "none", cursor: "pointer", fontWeight: "bold", color: PRIMARY },
  qtyVal: { fontSize: "12px", fontWeight: "700", minWidth: '15px', textAlign: 'center' },
  deleteBtn: { background: "none", border: "none", cursor: "pointer" },
  billingFooter: { borderTop: "2px solid #000", paddingTop: "20px", marginTop: "10px" },
  totalLine: { display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "center" },
  grandTotal: { fontSize: "24px", fontWeight: "900" },
  payBtn: { width: "100%", padding: "18px", background: PRIMARY, color: "#fff", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer", boxShadow: '0 6px 15px rgba(6, 95, 70, 0.3)' },
  historyContainer: { padding: "30px", overflowY: "auto", height: "100%" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  redLogout: { background: "#fee2e2", color: "#ef4444", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", fontSize: "12px", cursor: "pointer" },
  tableWrapper: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "15px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#f9fafb", borderBottom: `1px solid ${BORDER}` },
  th: { padding: "15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", cursor: 'pointer', userSelect: 'none' },
  tr: { borderBottom: `1px solid #f3f4f6` },
  td: { padding: "15px", fontSize: "14px", color: "#111827" },
  modeBadge: { background: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  emptyTable: { textAlign: "center", padding: "40px", color: "#9ca3af" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: "20px", padding: "30px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", borderBottom: `1px solid ${BORDER}`, paddingBottom: "10px", alignItems: 'center' },
  itemReview: { maxHeight: "150px", overflowY: "auto", marginBottom: "15px" },
  modalRow: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" },
  discountSection: { margin: "10px 0", padding: "15px", background: "#f9fafb", borderRadius: "12px" },
  discountToggle: { display: "flex", gap: "8px", marginBottom: "12px" },
  greenCardToggle: { flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${BORDER}`, background: "#fff", color: PRIMARY, fontSize: "11px", fontWeight: "700", cursor: "pointer" },
  distBtnActive: { background: PRIMARY, color: "#fff", borderColor: PRIMARY },
  modalInput: { width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${BORDER}`, boxSizing: 'border-box', outline: 'none' },
  summaryBox: { padding: "15px 0", borderTop: `1px solid ${BORDER}` },
  summaryLine: { display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#6b7280", fontSize: '12px' },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "18px", color: "#000", marginTop: "10px" },
  payOptions: { display: "flex", gap: "10px", marginTop: "15px" },
  methodBtn: { flex: 1, padding: "15px", borderRadius: "10px", border: "none", background: PRIMARY, color: "#fff", fontWeight: "800", cursor: "pointer", fontSize: '12px', boxShadow: '0 4px 10px rgba(6, 95, 70, 0.3)' },
  closeBtn: { border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: '#9ca3af' },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: PRIMARY },
  emptyText: { textAlign: "center", color: "#d1d5db", marginTop: "40px", fontSize: "13px" }
};

export default Store;