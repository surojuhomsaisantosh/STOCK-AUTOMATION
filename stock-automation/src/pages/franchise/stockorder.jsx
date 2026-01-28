import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiCalendar, FiCreditCard, FiAlertTriangle, FiX, FiCheck, FiChevronRight } from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const getConversionFactor = (unit) => {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();
  const gramVariants = ["g", "grams", "gram", "gm", "gms"];
  const mlVariants = ["ml", "millilitre", "millilitres", "ml."];
  if (gramVariants.includes(u)) return 0.001;
  if (mlVariants.includes(u)) return 0.001;
  return 1;
};

function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isCentral, setIsCentral] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockAlert, setStockAlert] = useState({ show: false, itemName: "", maxAvailable: 0, unit: "" });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchStocks();
    fetchProfile();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileData) {
      setProfile(profileData);
      if (profileData.role === 'central' || profileData.franchise_id === 'CENTRAL') {
        setIsCentral(true);
      }
    }
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase.from("stocks").select("*").eq('online_store', true).order("item_name");
      if (error) return;
      const stockData = data || [];
      setStocks(stockData);
      const units = {}; const initialQtys = {};
      stockData.forEach(item => {
        units[item.id] = item.unit || 'pcs';
        initialQtys[item.id] = 0;
      });
      setSelectedUnit(units);
      setQtyInput(initialQtys);
    } catch (err) { console.error(err); }
  };

  const calculations = useMemo(() => {
    const details = cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      const itemGst = itemSubtotal * ((item.gst_rate || 0) / 100);
      return { ...item, preciseSubtotal: itemSubtotal, preciseGst: itemGst, preciseTotal: itemSubtotal + itemGst };
    });
    const totalSubtotal = details.reduce((acc, curr) => acc + curr.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, curr) => acc + curr.preciseGst, 0);
    const exactBill = totalSubtotal + totalGst;
    const roundedBill = Math.round(exactBill);
    const roundOff = roundedBill - exactBill;
    return { items: details, subtotal: totalSubtotal, totalGst, roundedBill, roundOff, exactBill };
  }, [cart]);

  const handleQtyInputChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
    const currentVal = qtyInput[itemId] || 0;
    let numVal;
    if (isStepButton) {
      if (isGrams) numVal = direction === 1 ? currentVal + 50 : Math.max(0, currentVal - 50);
      else numVal = direction === 1 ? currentVal + 1 : Math.max(0, currentVal - 1);
    } else {
      numVal = val === "" ? 0 : Number(val);
    }
    const factor = getConversionFactor(unit);
    if (parseFloat((numVal * factor).toFixed(3)) > parseFloat(Number(item.quantity).toFixed(3))) {
      setStockAlert({ show: true, itemName: item.item_name, maxAvailable: item.quantity, unit: item.unit });
      numVal = Math.floor((item.quantity / factor) * 1000) / 1000;
    }
    // Strict non-negative check
    numVal = Math.max(0, numVal);
    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
  };

  const handleAddToCart = (itemId) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const numVal = qtyInput[itemId];
    if (!numVal || numVal <= 0) return;
    const unit = selectedUnit[itemId] || item.unit;
    const factor = getConversionFactor(unit);
    setCart(prev => {
      const exists = prev.find(c => c.id === itemId);
      if (exists) return prev.map(c => c.id === itemId ? { ...c, qty: numVal * factor, displayQty: numVal, cartUnit: unit } : c);
      return [...prev, { ...item, qty: numVal * factor, displayQty: numVal, cartUnit: unit }];
    });
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
  };

  const updateCartItemQty = (itemId, newDisplayQty) => {
    const cartItem = cart.find(c => c.id === itemId);
    const stockItem = stocks.find(s => s.id === itemId);
    if (!cartItem || !stockItem) return;
    let numVal = Math.max(0, Number(newDisplayQty));
    const factor = getConversionFactor(cartItem.cartUnit);
    if (parseFloat((numVal * factor).toFixed(3)) > parseFloat(Number(stockItem.quantity).toFixed(3))) {
      setStockAlert({ show: true, itemName: stockItem.item_name, maxAvailable: stockItem.quantity, unit: stockItem.unit });
      numVal = Math.floor((stockItem.quantity / factor) * 1000) / 1000;
    }
    if (numVal <= 0) removeFromCart(itemId);
    else {
      setCart(prev => prev.map(c => c.id === itemId ? { ...c, qty: numVal * factor, displayQty: numVal } : c));
      setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orderItems = cart.map(item => ({ stock_id: item.id, item_name: item.item_name, quantity: item.qty, unit: item.cartUnit, price: item.price }));
      const { error } = await supabase.rpc('place_stock_order', {
        p_total_amount: calculations.roundedBill, p_created_by: user.id, p_customer_name: profile?.name || "Unknown",
        p_customer_email: profile?.email || null, p_customer_phone: profile?.phone || null, p_customer_address: profile?.address || null,
        p_branch_location: profile?.branch_location || "", p_franchise_id: profile?.franchise_id || null, p_items: orderItems
      });
      if (error) throw error;
      alert("ORDER PLACED SUCCESSFULLY!");
      setCart([]); setQtyInput({}); setIsCartOpen(false); fetchStocks();
    } catch (error) { alert("FAILED: " + error.message); } finally { setLoading(false); }
  };

  const dynamicCategories = useMemo(() => ["All", ...new Set(stocks.map(s => s.category).filter(Boolean))].sort(), [stocks]);
  const filteredStocks = useMemo(() => stocks.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) || (item.item_code && item.item_code.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.quantity > 0;
  }), [stocks, search, selectedCategory]);

  return (
    <div style={{ background: "#F9FAFB", minHeight: "100vh", paddingBottom: isMobile ? "100px" : "40px", fontFamily: '"Inter", sans-serif' }}>

      {/* Stock Alert Sheet */}
      {stockAlert.show && (
        <div style={styles.modalOverlay} onClick={() => setStockAlert({ ...stockAlert, show: false })}>
          <div style={isMobile ? styles.bottomSheet : styles.modalContent} onClick={e => e.stopPropagation()}>
            <FiAlertTriangle size={isMobile ? 32 : 48} style={{ color: '#ef4444', marginBottom: '15px' }} />
            <h3 style={{ fontWeight: 900, fontSize: isMobile ? '18px' : '24px', textTransform: 'uppercase' }}>Limit Reached</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '10px 0 25px' }}>
              Only <span style={{ color: '#000', fontWeight: 800 }}>{stockAlert.maxAvailable} {stockAlert.unit}</span> available in stock.
            </p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} style={styles.primaryBtn}>Got it</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ ...styles.nav, height: isMobile ? '70px' : '90px', padding: isMobile ? '0 15px' : '0 40px' }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <FiArrowLeft size={20} /> {!isMobile && "Back"}
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ ...styles.navTitle, fontSize: isMobile ? '16px' : '22px' }}>Order Inventory</h1>
          <div style={styles.navSub}>{profile?.franchise_id || "..."}</div>
        </div>

        <div style={styles.headerActions}>
          <button onClick={() => setIsCartOpen(true)} style={styles.cartIconBtn}>
            <FiShoppingCart size={20} />
            {cart.length > 0 && <span style={styles.cartBadge}>{cart.length}</span>}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '15px' : '30px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: isMobile ? '15px' : '30px' }}>
          <FiSearch style={styles.searchIcon} size={20} />
          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Categories slider */}
        <div style={styles.categorySlider}>
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{ ...styles.catBtn, backgroundColor: selectedCategory === cat ? BRAND_COLOR : '#fff', color: selectedCategory === cat ? '#fff' : '#000', borderColor: selectedCategory === cat ? BRAND_COLOR : '#e2e8f0' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '12px' : '25px' }}>
          {filteredStocks.map((item) => {
            const isInCart = cart.some(c => c.id === item.id);
            const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
            const currentQty = qtyInput[item.id] || 0;
            return (
              <div key={item.id} style={{ ...styles.productCard, borderColor: isInCart ? BRAND_COLOR : '#fff' }}>
                {isInCart && <div style={styles.checkBadge}><FiCheck size={12} /></div>}
                <div style={styles.cardHeader}>
                  <div style={styles.itemCode}>{item.item_code || '---'}</div>
                  <h3 style={{ ...styles.itemName, fontSize: isMobile ? '13px' : '16px' }}>{item.item_name}</h3>
                </div>

                <div style={styles.priceRow}>
                  <span style={styles.price}>₹{item.price}<small>/{item.unit}</small></span>
                  {isCentral && <div style={styles.availText}>Stock: {item.quantity}</div>}
                </div>

                <div style={styles.controlBox}>
                  <div style={styles.qtyPicker}>
                    <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, -1)} style={styles.stepBtn}><FiMinus /></button>
                    <input type="number" value={qtyInput[item.id] || ""} onChange={(e) => handleQtyInputChange(item.id, e.target.value, item.quantity)} style={styles.qtyInput} placeholder="0" />
                    <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, 1)} style={styles.stepBtn}><FiPlus /></button>
                  </div>
                  <select value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} style={styles.unitSelect}>
                    <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                    {item.alt_unit && item.alt_unit !== item.unit && (<option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option>)}
                  </select>
                  <button onClick={() => handleAddToCart(item.id)} disabled={currentQty <= 0} style={{ ...styles.addBtn, backgroundColor: isInCart ? '#059669' : BRAND_COLOR }}>
                    {isInCart ? "UPDATE" : "ADD"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button - MOBILE ONLY */}
      {isMobile && cart.length > 0 && !isCartOpen && (
        <div style={styles.fabContainer}>
          <button onClick={() => setIsCartOpen(true)} style={styles.fab}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiShoppingCart size={20} />
              <span style={{ fontWeight: 900 }}>{cart.length} ITEMS</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900 }}>₹{calculations.roundedBill}</span>
              <FiChevronRight size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsCartOpen(false)}>
          <div style={{ ...styles.cartDrawer, height: isMobile ? '100%' : '90vh', width: isMobile ? '100%' : 'min(1100px, 95vw)' }} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h2 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Review Order</h2>
              <button onClick={() => setIsCartOpen(false)} style={styles.closeCircle}><FiX size={24} /></button>
            </div>

            <div style={{ ...styles.drawerBody, flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: 2, overflowY: 'auto', paddingRight: isMobile ? '0' : '20px' }}>
                {calculations.items.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.item_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>₹{item.price}/{item.cartUnit} &bull; GST {item.gst_rate}%</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '15px' }}>
                      <div style={styles.cartItemControls}>
                        <button onClick={() => updateCartItemQty(item.id, Number(item.displayQty) - 1)} style={styles.miniBtn}><FiMinus size={14} /></button>
                        <input
                          type="number"
                          min="0"
                          value={item.displayQty}
                          onChange={(e) => updateCartItemQty(item.id, e.target.value)}
                          style={styles.miniInput}
                        />
                        <button onClick={() => updateCartItemQty(item.id, Number(item.displayQty) + 1)} style={styles.miniBtn}><FiPlus size={14} /></button>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '70px' }}>
                        <div style={{ fontWeight: 900, fontSize: '15px' }}>₹{item.preciseSubtotal.toFixed(2)}</div>
                      </div>
                    </div>

                    <button onClick={() => removeFromCart(item.id)} style={styles.removeBtn}><FiTrash2 size={18} /></button>
                  </div>
                ))}
              </div>

              <div style={{ ...styles.summaryPane, width: isMobile ? '100%' : '400px' }}>
                <div style={styles.billBox}>
                  <div style={styles.billRow}><span>Items Total</span><span>₹{calculations.subtotal.toFixed(2)}</span></div>
                  <div style={styles.billRow}><span>Total GST</span><span>₹{calculations.totalGst.toFixed(2)}</span></div>
                  <div style={styles.billRow}><span style={{ fontStyle: 'italic', fontSize: '11px' }}>Round Off</span><span>{calculations.roundOff.toFixed(2)}</span></div>
                  <div style={styles.totalRow}>
                    <div><p style={styles.totalLabel}>Total Payable</p><p style={styles.totalVal}>₹{calculations.roundedBill}</p></div>
                    <FiCreditCard size={32} opacity={0.1} />
                  </div>
                </div>
                <button onClick={handlePlaceOrder} disabled={loading || !cart.length} style={styles.checkoutBtn}>
                  {loading ? "PROCESSING..." : "CONFIRM ORDER"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  nav: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', transition: 'all 0.3s ease' },
  backBtn: { border: 'none', background: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#000', fontSize: '14px', transition: 'transform 0.2s' },
  navTitle: { margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' },
  navSub: { fontSize: '10px', fontWeight: 800, color: BRAND_COLOR, opacity: 0.6 },
  // Header Actions (Right side)
  headerActions: { display: 'flex', alignItems: 'center', gap: '15px' },
  cartIconBtn: { position: 'relative', border: 'none', background: '#f1f5f9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' },
  cartBadge: { position: 'absolute', top: '-5px', right: '-5px', background: BRAND_COLOR, color: '#fff', fontSize: '10px', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },

  searchInput: { width: '100%', padding: '16px 20px 16px 50px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', outline: 'none', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', transition: 'box-shadow 0.2s' },
  searchIcon: { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 },

  categorySlider: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px', scrollbarWidth: 'none', msOverflowStyle: 'none' },
  catBtn: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s ease' },

  productCard: { background: '#fff', borderRadius: '24px', padding: '15px', position: 'relative', border: '2px solid #fff', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  checkBadge: { position: 'absolute', top: '-8px', right: '-8px', background: BRAND_COLOR, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', zIndex: 2 },
  itemCode: { fontSize: '9px', fontWeight: 800, opacity: 0.3, marginBottom: '4px' },
  itemName: { margin: 0, fontWeight: 800, textTransform: 'uppercase', lineHeight: 1.2, height: '38px', overflow: 'hidden' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' },
  price: { fontWeight: 900, fontSize: '18px' },
  availText: { fontSize: '10px', fontWeight: 700, color: BRAND_COLOR, background: 'rgba(0,100,55,0.05)', padding: '2px 6px', borderRadius: '6px' },

  controlBox: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  qtyPicker: { display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  stepBtn: { flex: 1, height: '36px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.1s' },
  qtyInput: { width: '40px', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 900, fontSize: '14px' },
  unitSelect: { border: '1px solid #e2e8f0', padding: '6px', borderRadius: '10px', fontSize: '10px', fontWeight: 800, textAlign: 'center', outline: 'none' },
  addBtn: { border: 'none', padding: '12px', borderRadius: '12px', color: '#fff', fontWeight: 900, fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', transition: 'background 0.2s' },

  // Floating Action Button logic changed dynamically elsewhere, but default styles here:
  fabContainer: { position: 'fixed', bottom: '30px', right: '30px', zIndex: 90, display: 'flex', justifyContent: 'flex-end' },
  fab: { background: '#000', color: '#fff', border: 'none', borderRadius: '30px', padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'transform 0.2s', minWidth: '200px' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', background: '#fff', borderRadius: '32px 32px 0 0', padding: '30px', textAlign: 'center', boxSizing: 'border-box', animation: 'slideUp 0.3s ease-out' },
  modalContent: { background: '#fff', borderRadius: '24px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },

  cartDrawer: { background: '#fff', borderRadius: '32px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '100vw', maxHeight: '100vh' },
  drawerHeader: { padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  drawerBody: { flex: 1, display: 'flex', padding: '20px', gap: '20px' },
  closeCircle: { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },

  cartItem: { display: 'flex', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '20px', marginBottom: '10px', transition: 'background 0.2s' },
  removeBtn: { border: 'none', background: 'none', color: '#ef4444', padding: '10px', cursor: 'pointer', borderRadius: '50%', transition: 'background 0.2s' },

  cartItemControls: { display: 'flex', alignItems: 'center', gap: '0', background: '#e2e8f0', borderRadius: '12px', border: '1px solid #cbd5e1', height: '40px' },
  miniBtn: { width: '40px', height: '100%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1e293b' },
  miniInput: { width: '40px', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 800, fontSize: '14px', color: '#0f172a', outline: 'none' },

  summaryPane: { display: 'flex', flexDirection: 'column', gap: '15px' },
  billBox: { background: '#f8fafc', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' },
  billRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '10px' },
  totalRow: { borderTop: '2px solid #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel: { margin: 0, fontSize: '11px', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase' },
  totalVal: { margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' },
  checkoutBtn: { border: 'none', background: BRAND_COLOR, color: '#fff', padding: '20px', borderRadius: '20px', fontWeight: 900, fontSize: '16px', letterSpacing: '1px', cursor: 'pointer', boxShadow: '0 8px 15px rgba(0,100,55,0.2)', transition: 'transform 0.1s' },
  primaryBtn: { border: 'none', background: '#000', color: '#fff', padding: '15px 40px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }
};

export default StockOrder;