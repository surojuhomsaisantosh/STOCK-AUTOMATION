import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  Loader2, 
  Search, 
  Trash2, 
  X
} from "lucide-react";

// --- BLUETOOTH PRINTER HOOK ---
import { useBluetoothPrinter } from "../printer/BluetoothPrinter";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";
const BLACK = "#000000";

function Store() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  
  const { connectPrinter, printReceipt, isConnected } = useBluetoothPrinter();
  
  // DATA STATES
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null); // Stores Company/Address info

  // UI STATES
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // CHECKOUT STATES
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");

  const franchiseId = user?.franchise_id ? String(user.franchise_id) : null;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ==========================================================
     1. FETCH STORE PROFILE (Company Name & Address)
  ========================================================== */
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('company, address, city, state, pincode, phone')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setStoreProfile(data);
      } catch (err) {
        console.error("❌ Profile Load Error:", err.message);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  /* ==========================================================
     2. FETCH MENU ITEMS
  ========================================================== */
  useEffect(() => { 
    const fetchMenu = async () => {
      if (!franchiseId) return;
      try {
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .eq("franchise_id", franchiseId.trim())
          .eq("is_active", true);
        if (error) throw error;
        if (data) {
          setMenuItems(data);
          setCategories(["All", ...new Set(data.map(item => item.category).filter(Boolean))]);
        }
      } catch (err) {
        console.error("❌ Menu Load Error:", err.message);
      }
    };

    if (franchiseId) fetchMenu(); 
  }, [franchiseId]);

  /* ==========================================================
     CART LOGIC
  ========================================================== */
  const addToCart = (item) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === item.id);
      return ex ? prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((i) => i.qty > 0));
  };

  const handleManualQty = (id, val) => {
    const num = parseInt(val) || 0;
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: num } : item).filter((i) => i.qty > 0));
  };

  const removeItem = (id) => setCart((prev) => prev.filter(item => item.id !== id));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const calculatedDiscount = discountType === "percent" ? (subtotal * (discountValue / 100)) : discountValue;
    return { 
      subtotal, 
      discountAmt: calculatedDiscount, 
      total: Math.max(0, subtotal - calculatedDiscount), 
      itemCount: cart.reduce((sum, i) => sum + i.qty, 0) 
    };
  }, [cart, discountValue, discountType]);

  const filteredItems = menuItems.filter(item => {
    const query = searchQuery.toLowerCase();
    if (query.trim() !== "") return item.item_name.toLowerCase().includes(query);
    return selectedCategory === "All" || item.category === selectedCategory;
  });

  /* ==========================================================
     TRANSACTION LOGIC
  ========================================================== */
  const handleCompleteTransaction = async (method) => {
    try {
      if (!franchiseId) throw new Error("Franchise identification failed.");
      
      // 1. Save to Database (Bills)
      // FIX: Changed .single() to .maybeSingle() if fetching logic ever changes, 
      // but for insert, .single() returns the inserted row correctly.
      const { data: bill, error: billError } = await supabase.from("bills_generated").insert([{
        franchise_id: franchiseId, 
        subtotal: totals.subtotal, 
        tax: 0, 
        discount: totals.discountAmt, 
        total: totals.total, 
        payment_mode: method,
        created_by: user.id
      }]).select().single();

      if (billError) throw new Error(`Bill Error: ${billError.message}`);

      const billItems = cart.map((item) => ({ 
        bill_id: bill.id, 
        item_id: item.id, 
        item_name: item.item_name, 
        qty: item.qty, 
        price: item.price, 
        total: item.price * item.qty 
      }));

      const { error: itemsError } = await supabase.from("bills_items_generated").insert(billItems);
      if (itemsError) throw new Error(`Items Error: ${itemsError.message}`);

      // 2. Print Receipt
      if (isConnected) {
        try {
          // CONSTRUCT ADDRESS STRING DYNAMICALLY
          const addressLine = storeProfile 
            ? `${storeProfile.address || ''}, ${storeProfile.city || ''}\n${storeProfile.state || ''} - ${storeProfile.pincode || ''}`
            : "Address Not Found";

          await printReceipt({ 
            company: storeProfile?.company || "T VANAMM", // Dynamic Company Name
            address: addressLine,                          // Dynamic Address
            total: totals.total.toFixed(2), 
            items: cart.map(i => ({ 
                name: i.item_name, 
                qty: i.qty, 
                subtotal: (i.price * i.qty).toFixed(2) 
            }))
          });
        } catch (printErr) {
          console.error("Printing failed:", printErr);
          alert("Bill saved, but printing failed. Check printer connection.");
        }
      } else {
        alert("Bill saved! (Printer was not connected)");
      }

      setCart([]); 
      setDiscountValue(0); 
      setShowPaymentModal(false);
    } catch (err) { 
      console.error(err);
      alert(`Checkout failed: ${err.message}`); 
    }
  };

  if (authLoading) return (
    <div style={styles.loader}>
      <Loader2 className="animate-spin" size={30} color={PRIMARY} />
      <span style={{ fontWeight: '900', color: BLACK }}>Securing Connection...</span>
    </div>
  );

  return (
    <div style={{ ...styles.page, overflow: isMobile ? "visible" : "hidden", height: isMobile ? "auto" : "100vh" }}>
      {/* HEADER */}
      <div style={styles.topBar}>
        {!isMobile && <div style={{ width: '100px' }}></div>}
        <h1 style={styles.centerTitle}>STORE DASHBOARD</h1>
        <div style={styles.franchiseLabel}>{franchiseId}</div>
      </div>

      {/* NAVIGATION */}
      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...styles.activeToggle }}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...styles.inactiveToggle }} onClick={() => navigate("/history")}>HISTORY</button>
      </div>

      <div style={{ ...styles.splitLayout, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* LEFT: MENU */}
        <div style={styles.menuContainer}>
          <div style={styles.stickyActionHeader}>
            <div style={styles.actionRow}>
              <div style={styles.searchBox}>
                <Search size={18} color={BLACK} style={styles.searchIcon} />
                <input style={styles.searchInput} placeholder="Search product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button 
                style={{ 
                    ...styles.greenCardBtn, 
                    background: isConnected ? "#10b981" : PRIMARY,
                    cursor: isConnected ? "default" : "pointer" 
                }} 
                onClick={!isConnected ? connectPrinter : undefined}
              >
                {isConnected ? "✅ PRINTER CONNECTED" : "🔌 CONNECT PRINTER"}
              </button>
            </div>
            <div style={styles.categoryRow}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ ...styles.catBtn, ...(selectedCategory === cat ? styles.catBtnActive : {}) }}>{cat}</button>
              ))}
            </div>
          </div>

          <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {filteredItems.map((item) => {
              const inCart = cart.some(i => i.id === item.id);
              return (
                <div 
                  key={item.id} 
                  style={{ ...styles.itemCard, borderColor: inCart ? PRIMARY : BORDER, background: inCart ? "#ecfdf5" : "#fff", borderWidth: inCart ? '3px' : '2px' }} 
                  onClick={() => addToCart(item)}
                >
                  <span style={styles.itemName}>{item.item_name}</span>
                  <span style={styles.itemPrice}>₹{item.price}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: BILLING */}
        <div style={styles.cartContainer}>
          <h2 style={styles.cartHeading}>CURRENT ORDER</h2>
          <div style={styles.cartList}>
            {cart.map((item) => (
              <div key={item.id} style={styles.cartRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cartItemName}>{item.item_name}</div>
                  <div style={styles.cartItemPrice}>₹{item.price}</div>
                </div>
                <div style={styles.qtyContainer}>
                  <div style={styles.qtyControls}>
                    <button onClick={() => updateQty(item.id, -1)} style={styles.qtyBtn}>-</button>
                    <input type="number" value={item.qty} onChange={(e) => handleManualQty(item.id, e.target.value)} style={styles.qtyInput} />
                    <button onClick={() => updateQty(item.id, 1)} style={styles.qtyBtn}>+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} style={styles.deleteBtn}>
                    <Trash2 size={20} color={DANGER} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.billingFooter}>
            <div style={styles.summaryLine}>
                <span style={{ fontWeight: '900', fontSize: '18px', color: BLACK }}>Subtotal</span>
                <span style={styles.grandTotal}>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <button style={styles.payBtn} disabled={!cart.length} onClick={() => setShowPaymentModal(true)}>PROCEED TO PAY</button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showPaymentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.closeModalBtn} onClick={() => setShowPaymentModal(false)}><X size={24} color={BLACK} /></button>
            <div style={styles.modalBody}>
              <div style={styles.modalLeft}>
                <h3 style={styles.modalSectionTitle}>BILL SUMMARY</h3>
                <div style={styles.receiptScrollArea}>
                  <table style={styles.receiptTable}>
                    <thead>
                      <tr>
                        <th style={styles.receiptTh}>Item</th>
                        <th style={styles.receiptTh}>Qty</th>
                        <th style={{ ...styles.receiptTh, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={styles.receiptTd}>{i.item_name}</td>
                          <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{i.qty}</td>
                          <td style={{ ...styles.receiptTd, textAlign: 'right' }}>₹{(i.price * i.qty).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.modalSubtotalRow}>
                   <span>Gross Total:</span>
                   <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div style={styles.modalRight}>
                <h3 style={styles.modalSectionTitle}>CHECKOUT</h3>
                <div style={styles.discountBox}>
                  <label style={styles.discountLabel}>Apply Discount</label>
                  <div style={styles.discountToggleRow}>
                    <button 
                      style={{ ...styles.toggleSmall, background: discountType === 'fixed' ? PRIMARY : '#fff', color: discountType === 'fixed' ? '#fff' : BLACK }}
                      onClick={() => setDiscountType('fixed')}
                    >₹ Amount</button>
                    <button 
                      style={{ ...styles.toggleSmall, background: discountType === 'percent' ? PRIMARY : '#fff', color: discountType === 'percent' ? '#fff' : BLACK }}
                      onClick={() => setDiscountType('percent')}
                    >% Percent</button>
                  </div>
                  <input 
                    type="number" 
                    placeholder="Value..." 
                    value={discountValue || ""} 
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} 
                    style={styles.modalDiscountInput}
                  />
                </div>

                <div style={styles.finalAmountDisplay}>
                  <span style={{ fontSize: '11px', color: BLACK, fontWeight: '900', textTransform: 'uppercase' }}>Net Payable</span>
                  <div style={{ fontSize: '42px', fontWeight: '900', color: PRIMARY }}>₹{totals.total.toFixed(2)}</div>
                </div>

                <div style={styles.paymentButtonRow}>
                  <button style={styles.payMethodBtn} onClick={() => handleCompleteTransaction("CASH")}>CASH</button>
                  <button style={styles.payMethodBtn} onClick={() => handleCompleteTransaction("UPI")}>UPI / ONLINE</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f9fafb", height: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 30px", borderBottom: `1px solid ${BORDER}`, background: "#fff" },
  centerTitle: { fontSize: "22px", fontWeight: "900", margin: 0, color: BLACK, letterSpacing: '-0.5px' },
  franchiseLabel: { fontSize: "16px", fontWeight: "900", color: PRIMARY, background: '#ecfdf5', padding: '6px 15px', borderRadius: '10px' },
  fullToggleBar: { display: "flex", width: "100%", padding: "6px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}` },
  toggleBtn: { flex: 1, padding: "15px", cursor: "pointer", fontWeight: "900", fontSize: "13px", border: "none", background: "#fff" },
  activeToggle: { color: PRIMARY, borderBottom: `4px solid ${PRIMARY}` },
  inactiveToggle: { color: "#6b7280" },
  splitLayout: { display: "flex", height: "calc(100vh - 130px)" },
  menuContainer: { flex: 0.65, overflowY: "auto" },
  stickyActionHeader: { position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, padding: "20px" },
  actionRow: { display: "flex", gap: "10px", marginBottom: "15px" },
  searchBox: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '15px' },
  searchInput: { width: '100%', padding: "14px 14px 14px 45px", borderRadius: "12px", border: `1px solid ${BORDER}`, outline: 'none', color: BLACK, fontWeight: '700' },
  greenCardBtn: { color: "#fff", border: "none", padding: "0 20px", borderRadius: "12px", fontWeight: "900", fontSize: '12px', transition: '0.3s' },
  categoryRow: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "5px" },
  catBtn: { padding: "10px 18px", borderRadius: "10px", border: `1px solid ${BORDER}`, background: "#fff", whiteSpace: "nowrap", fontWeight: '800', color: BLACK, cursor: 'pointer', fontSize: '12px' },
  catBtnActive: { background: PRIMARY, color: "#fff", borderColor: PRIMARY },
  grid: { display: "grid", gap: "12px", padding: "0 20px 20px 20px" },
  itemCard: { padding: "20px", border: `2px solid ${BORDER}`, borderRadius: "18px", background: "#fff", cursor: "pointer", transition: '0.2s all' },
  itemName: { display: "block", fontSize: "15px", fontWeight: "900", color: BLACK, marginBottom: '5px' },
  itemPrice: { color: PRIMARY, fontWeight: "900", fontSize: '18px' },
  cartContainer: { flex: 0.35, background: "#fff", borderLeft: `1px solid ${BORDER}`, padding: "20px", display: "flex", flexDirection: "column" },
  cartHeading: { textAlign: 'center', fontWeight: '900', fontSize: '16px', marginBottom: '15px', borderBottom: '2px solid #000', paddingBottom: '10px', color: BLACK },
  cartList: { flex: 1, overflowY: "auto" },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: 'center', padding: "12px 0", borderBottom: "1px solid #f3f4f6" },
  cartItemName: { fontWeight: "900", color: BLACK, fontSize: '14px' },
  cartItemPrice: { color: BLACK, opacity: 0.5, fontSize: '12px', fontWeight: '800' },
  qtyContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
  qtyControls: { display: "flex", alignItems: "center", background: '#f3f4f6', borderRadius: '10px', padding: '2px' },
  qtyBtn: { border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', fontWeight: '900', color: BLACK },
  qtyInput: { width: '30px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: '900', fontSize: '14px', color: BLACK },
  deleteBtn: { border: 'none', background: 'none', cursor: 'pointer', padding: '5px' },
  billingFooter: { borderTop: "2px solid #000", paddingTop: "15px" },
  summaryLine: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' },
  grandTotal: { fontSize: "32px", fontWeight: "900", color: BLACK },
  payBtn: { width: "100%", padding: "18px", background: PRIMARY, color: "#fff", borderRadius: "15px", fontWeight: "900", border: "none", marginTop: "10px", fontSize: '15px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', width: '90%', maxWidth: '800px', borderRadius: '24px', position: 'relative', overflow: 'hidden' },
  closeModalBtn: { position: 'absolute', top: '15px', right: '15px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { display: 'flex', minHeight: '500px' },
  modalLeft: { flex: 1.2, padding: '30px', background: '#f8f9fa', borderRight: `1px solid ${BORDER}` },
  modalRight: { flex: 0.8, padding: '30px', display: 'flex', flexDirection: 'column' },
  modalSectionTitle: { fontSize: '16px', fontWeight: '900', marginBottom: '20px', color: BLACK },
  receiptScrollArea: { height: '300px', overflowY: 'auto', marginBottom: '15px' },
  receiptTable: { width: '100%', borderCollapse: 'collapse' },
  receiptTh: { textAlign: 'left', paddingBottom: '10px', fontSize: '11px', fontWeight: '900', color: BLACK },
  receiptTd: { padding: '8px 0', fontSize: '13px', fontWeight: '700', color: BLACK },
  modalSubtotalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '15px', fontWeight: '900', fontSize: '18px', color: BLACK },
  discountBox: { background: '#f3f4f6', padding: '15px', borderRadius: '15px', marginBottom: '20px' },
  discountLabel: { display: 'block', fontWeight: '900', marginBottom: '8px', fontSize: '12px', color: BLACK },
  discountToggleRow: { display: 'flex', gap: '6px', marginBottom: '10px' },
  toggleSmall: { flex: 1, padding: '8px', border: `1px solid ${BORDER}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '11px' },
  modalDiscountInput: { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${BORDER}`, fontSize: '15px', fontWeight: '800', color: BLACK },
  finalAmountDisplay: { textAlign: 'center', marginBottom: '25px', padding: '15px', background: '#ecfdf5', borderRadius: '16px', border: `1px solid ${PRIMARY}` },
  paymentButtonRow: { display: 'flex', gap: '10px' },
  payMethodBtn: { flex: 1, padding: '16px', border: 'none', color: '#fff', background: PRIMARY, borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer' },
  loader: { height: "100vh", display: "flex", flexDirection: 'column', gap: '15px', alignItems: "center", justifyContent: "center", background: '#fff' }
};

export default Store;
