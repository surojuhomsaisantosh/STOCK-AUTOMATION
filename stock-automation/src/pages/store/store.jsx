import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";

// Color Palette
const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

/* ==========================================================
   PRINTER LOGIC HOOK
   ========================================================== */
function useBluetoothPrinter() {
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectPrinter = async () => {
    setIsConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'TM-' }, { namePrefix: 'EPSON' }, { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt?.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      setConnectedPrinter({ device, characteristic });
      alert(`✅ Connected to ${device.name}`);
    } catch (error) {
      alert("Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const printReceipt = async (billData) => {
    if (!connectedPrinter?.characteristic) return;
    try {
      const encoder = new TextEncoder();
      let text = `\x1B\x40\x1B\x61\x01T-VANAMM\n----------------\n`;
      billData.items.forEach(i => { text += `${i.name.padEnd(12)} x${i.qty} ${i.total}\n`; });
      text += `----------------\nTOTAL: Rs ${billData.total}\n\n\n\x1D\x56\x00`;
      await connectedPrinter.characteristic.writeValue(encoder.encode(text));
    } catch (err) { console.error(err); }
  };

  return { connectPrinter, printReceipt, isConnected: !!connectedPrinter, isConnecting };
}

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [history, setHistory] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [hoveredItem, setHoveredItem] = useState(null);

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const franchiseId = user?.franchise_id ? String(user.franchise_id) : null;

  const fetchMenu = async () => {
    if (!franchiseId) return;
    const { data } = await supabase.from("menus").select("*").eq("franchise_id", franchiseId.trim()).eq("is_active", true);
    if (data) {
      setMenuItems(data);
      setCategories(["All", ...new Set(data.map(item => item.category).filter(Boolean))]);
    }
  };

  const fetchHistory = async () => {
    if (!franchiseId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("bills_generated")
      .select("*, bills_items_generated(*)")
      .eq("franchise_id", franchiseId)
      .gte("created_at", today.toISOString())
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  useEffect(() => { if (franchiseId) { fetchMenu(); fetchHistory(); } }, [franchiseId]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const historyStats = useMemo(() => {
    const totalSales = history.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const totalItems = history.reduce((sum, bill) => {
      const itemsCount = bill.bills_items_generated?.reduce((iSum, item) => iSum + (item.qty || 0), 0) || 0;
      return sum + itemsCount;
    }, 0);
    return { totalSales, totalItems };
  }, [history]);

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

  const directQtyInput = (id, val) => {
    const numericVal = parseInt(val) || 0;
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(0, numericVal) } : item).filter((i) => i.qty > 0));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
    const calculatedDiscount = discountType === "percent" ? (subtotal * (discountValue / 100)) : discountValue;
    return { subtotal, discountAmt: calculatedDiscount, total: Math.max(0, subtotal - calculatedDiscount), itemCount };
  }, [cart, discountValue, discountType]);

  const filteredItems = menuItems.filter(item => {
    const itemName = (item.item_name || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query.trim() !== "") {
      return itemName.includes(query);
    }
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesCategory;
  });

  const handleCompleteTransaction = async (method) => {
    if (!cart.length) return;
    try {
      const { data: bill, error: billError } = await supabase.from("bills_generated").insert([{
        franchise_id: franchiseId,
        subtotal: totals.subtotal,
        tax: 0,
        discount: totals.discountAmt,
        total: totals.total,
        payment_mode: method,
      }]).select().single();
      if (billError) throw billError;
      const billItems = cart.map((item) => ({ bill_id: bill.id, item_id: item.id, item_name: item.item_name, qty: item.qty, price: item.price, total: item.price * item.qty }));
      await supabase.from("bills_items_generated").insert(billItems);
      await printReceipt({
        total: totals.total.toFixed(2), paymentMode: method,
        items: cart.map(i => ({ name: i.item_name, qty: i.qty, total: (i.price * i.qty).toFixed(2) }))
      });
      alert(`✅ ${method} Order Completed!`);
      setCart([]); setDiscountValue(0); setShowPaymentModal(false); fetchHistory();
    } catch (err) { alert("Checkout failed."); }
  };

  const SortArrow = ({ column }) => {
    if (sortConfig.key !== column) return <span style={{ opacity: 0.3, marginLeft: '5px' }}>↕</span>;
    return sortConfig.direction === 'asc' ? <span style={{ marginLeft: '5px' }}>↑</span> : <span style={{ marginLeft: '5px' }}>↓</span>;
  };

  if (authLoading) return <div style={styles.loader}>Loading POS...</div>;

  return (
    <div style={{ ...styles.page, overflow: isMobile ? "visible" : "hidden", height: isMobile ? "auto" : "100vh", paddingBottom: isMobile ? "80px" : "0" }}>
      <div style={styles.topBar}>
        {!isMobile && <div style={{ width: "120px" }}></div>}
        <h1 style={styles.centerTitle}>STORE DASHBOARD</h1>
        <div style={styles.franchiseLabel}>Franchise ID: {franchiseId}</div>
      </div>

      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...(activeTab === "billing" ? styles.activeToggle : styles.inactiveToggle) }} onClick={() => setActiveTab("billing")}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...(activeTab === "history" ? styles.activeToggle : styles.inactiveToggle) }} onClick={() => { setActiveTab("history"); setExpandedBill(null); }}>HISTORY</button>
      </div>

      {activeTab === "billing" ? (
        <React.Fragment>
          <div style={{ ...styles.splitLayout, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 'calc(100vh - 140px)' }}>
            <div style={{ ...styles.menuContainer, padding: isMobile ? "0 15px 15px 15px" : "0 25px 25px 25px" }}>
              <div style={styles.stickyActionHeader}>
                <div style={styles.actionRow}>
                  <input style={styles.searchInput} placeholder="Search any item globally..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <button style={{ ...styles.greenCardBtn, background: isConnected ? PRIMARY : '#6b7280', padding: isMobile ? "0 15px" : "0 25px" }} onClick={connectPrinter} disabled={isConnecting}>
                    {isConnecting ? "⌛" : isConnected ? (isMobile ? "✅" : "✅ PRINTER ON") : (isMobile ? "🔌" : "🔌 CONNECT PRINTER")}
                  </button>
                </div>

                <div style={styles.categoryContainer}>
                  <div style={styles.categoryRow}>
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ ...styles.catBtn, ...(selectedCategory === cat ? styles.catBtnActive : {}) }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(140px, 1fr))" : "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {filteredItems.map((item) => {
                  const isInCart = cart.some(i => i.id === item.id);
                  return (
                    <div key={item.id}
                      style={{ ...styles.itemCard, ...(hoveredItem === item.id ? styles.itemCardHover : styles.itemCardDefault), ...(isInCart ? styles.itemCardSelected : {}) }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => addToCart(item)}>
                      <div style={styles.cardInfo}>
                        <span style={styles.itemName}>{item.item_name}</span>
                        <span style={styles.itemPrice}>₹{item.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(!isMobile || isCartOpen) && (
              <div style={isMobile ? styles.mobileCartOverlay : { ...styles.cartContainer, flex: 0.35 }}>
                {isMobile && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>Current Order</h2>
                    <button onClick={() => setIsCartOpen(false)} style={styles.closeBtn}>✕</button>
                  </div>
                )}
                <h3 style={styles.sectionLabelBlack}><center><b>Current Order</b></center></h3>
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
                          <input
                            type="number"
                            style={styles.qtyInputBox}
                            value={item.qty}
                            onChange={(e) => directQtyInput(item.id, e.target.value)}
                          />
                          <button style={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                        <button style={styles.deleteBtn} onClick={() => removeFromCart(item.id)}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <div style={styles.summaryLineBlack}><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                  <div style={styles.summaryLineBlack}><span>Discount</span><span>- ₹{totals.discountAmt.toFixed(2)}</span></div>
                  <div style={styles.totalLine}><span>Total Payable</span><span style={styles.grandTotal}>₹{totals.total.toFixed(2)}</span></div>
                  <button style={{ ...styles.payBtn, opacity: cart.length ? 1 : 0.5 }} disabled={!cart.length} onClick={() => setShowPaymentModal(true)}>COMPLETE ORDER</button>
                </div>
              </div>
            )}
          </div>
          {isMobile && !isCartOpen && (
            <button onClick={() => setIsCartOpen(true)} style={styles.floatingCartBtn}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🛒</span>
                <span style={{ fontWeight: '900', fontSize: '16px' }}>{cart.length} ITEMS</span>
              </div>
              <span style={{ fontWeight: '900', fontSize: '18px' }}>₹{totals.total.toFixed(2)}</span>
            </button>
          )}
        </React.Fragment>
      ) : (
        <div style={styles.historyContainer}>
          <div style={styles.historyHeader}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                <h2 style={styles.historyHeading}>Today's Billing History</h2>
                <span style={styles.dateBadge}>{todayDisplay}</span>
              </div>

              <div style={styles.statsTillNowRow}>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Total Sales till now</span>
                  <span style={styles.statValue}>₹{historyStats.totalSales.toFixed(2)}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Total items sold till now</span>
                  <span style={styles.statValue}>{historyStats.totalItems} Items</span>
                </div>
              </div>
            </div>
            <button onClick={logout} style={styles.redLogout}>SIGN OUT</button>
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '80px' }}>
              {sortedHistory.length > 0 ? sortedHistory.map((bill) => (
                <div key={bill.id} style={styles.mobileHistoryCard} onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '900', fontSize: '17px', color: '#111827' }}>#{bill.id.toString().slice(-6).toUpperCase()}</span>
                      <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
                        {new Date(bill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <strong style={{ color: PRIMARY, fontSize: '19px' }}>₹{bill.total.toFixed(2)}</strong>
                      <span style={{ ...styles.modeBadge, fontSize: '11px', padding: '4px 8px' }}>{bill.payment_mode}</span>
                    </div>
                  </div>
                  {expandedBill === bill.id && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #e5e7eb' }}>
                      <div style={styles.detailHeaderLine}>Order Details</div>
                      {bill.bills_items_generated?.map((bi, i) => (
                        <div key={i} style={{ ...styles.detailItem, padding: '8px 0', fontSize: '14px' }}>
                          <span>{bi.item_name} <span style={styles.detailQty}>x{bi.qty}</span></span>
                          <span style={{ fontWeight: '700' }}>₹{bi.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                <div style={styles.emptyTable}>No bills found today.</div>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.colSno}>S.No</th>
                    <th style={styles.th} onClick={() => requestSort('id')}>Bill ID <SortArrow column="id" /></th>
                    <th style={styles.th} onClick={() => requestSort('payment_mode')}>Mode <SortArrow column="payment_mode" /></th>
                    <th style={styles.th} onClick={() => requestSort('subtotal')}>Amount <SortArrow column="subtotal" /></th>
                    <th style={styles.th} onClick={() => requestSort('total')}>Total <SortArrow column="total" /></th>
                    <th style={styles.colTime} onClick={() => requestSort('created_at')}>Time <SortArrow column="created_at" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.length > 0 ? sortedHistory.map((bill, index) => (
                    <React.Fragment key={bill.id}>
                      <tr
                        style={{ ...styles.tr, background: expandedBill === bill.id ? '#f0fdf4' : 'transparent' }}
                        onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
                      >
                        <td style={styles.tdSno}>{index + 1}</td>
                        <td style={styles.td}>#{bill.id.toString().slice(-6).toUpperCase()}</td>
                        <td style={styles.td}><span style={styles.modeBadge}>{bill.payment_mode}</span></td>
                        <td style={styles.td}>₹{bill.subtotal.toFixed(2)}</td>
                        <td style={styles.td}><strong style={{ color: PRIMARY }}>₹{bill.total.toFixed(2)}</strong></td>
                        <td style={styles.tdTime}>
                          {new Date(bill.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                      </tr>
                      {expandedBill === bill.id && (
                        <tr>
                          <td colSpan="6" style={styles.expandedRowContainer}>
                            <div style={styles.itemDetailList}>
                              <div style={styles.detailHeaderLine}>Order Content Breakdown</div>
                              {bill.bills_items_generated?.map((bi, i) => (
                                <div key={i} style={styles.detailItem}>
                                  <span style={styles.detailItemName}>{bi.item_name} <span style={styles.detailQty}>x{bi.qty}</span></span>
                                  <span style={styles.detailItemTotal}>₹{bi.total.toFixed(2)}</span>
                                </div>
                              ))}
                              <div style={styles.detailFinalRow}>
                                <span>Final Paid Amount:</span>
                                <strong>₹{bill.total.toFixed(2)}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr><td colSpan="6" style={styles.emptyTable}>No bills found today.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
      }

      {
        showPaymentModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalHorizontal}>
              {/* CENTERED HEADER */}
              <div style={styles.modalHeaderCentered}>
                <div style={{ width: '32px' }}></div> {/* Spacer to keep title centered */}
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#000' }}>Checkout Summary</h2>
                <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>✕</button>
              </div>

              <div style={{ ...styles.modalFlexBody, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.modalLeftCol}>
                  <div style={styles.receiptContainerSmall}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '900', color: PRIMARY }}>ITEMS IN CART</span>
                    </div>
                    <div style={styles.receiptListSmall}>
                      {cart.map(i => (
                        <div key={i.id} style={styles.receiptRowSmall}>
                          <span style={styles.receiptItemNameSmall}>{i.item_name} <span style={{ color: '#6b7280', fontWeight: '500' }}>x {i.qty}</span></span>
                          <span style={styles.receiptItemPriceSmall}>₹{(i.price * i.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.dashedDividerSmall}></div>
                    <div style={styles.receiptTotalLineSmall}>
                      {/* TOTAL ITEMS AND SUBTOTAL IN SUMMARY */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280', fontSize: '15px', fontWeight: '600' }}>Total Items:</span>
                        <span style={{ color: '#000', fontSize: '16px', fontWeight: '800' }}>{totals.itemCount} Items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280', fontSize: '15px', fontWeight: '600' }}>Subtotal:</span>
                        <span style={{ color: '#000', fontSize: '16px', fontWeight: '800' }}>₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.modalRightCol}>
                  <div style={styles.discountVibeBoxSmall}>
                    <label style={styles.vibeLabelSmall}>EXTRA DISCOUNT</label>
                    <div style={styles.horizFlexSmall}>
                      <div style={styles.vibeToggleRowSmall}>
                        <button onClick={() => setDiscountType("fixed")} style={{ ...styles.vibeToggleBtnSmall, ...(discountType === "fixed" ? styles.vibeToggleActive : {}) }}>₹ Fixed</button>
                        <button onClick={() => setDiscountType("percent")} style={{ ...styles.vibeToggleBtnSmall, ...(discountType === "percent" ? styles.vibeToggleActive : {}) }}>% Off</button>
                      </div>
                      <div style={styles.vibeInputWrapperSmall}>
                        <input type="number" placeholder="0.00" style={styles.vibeInputSmall} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>

                  <div style={styles.grandVibeTotalSmall}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#6b7280', letterSpacing: '1px' }}>NET PAYABLE</span>
                    <span style={{ fontSize: '44px', fontWeight: '1000', color: '#000', lineHeight: '1' }}>₹{totals.total.toFixed(2)}</span>
                  </div>

                  <div style={styles.payOptionsCompactSmall}>
                    <button style={{ ...styles.methodBtnModernSmall, background: '#111827' }} onClick={() => handleCompleteTransaction('CASH')}>PAY CASH</button>
                    <button style={styles.methodBtnModernSmall} onClick={() => handleCompleteTransaction('UPI')}>PAY UPI</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: #cbd5e1; 
          border-radius: 20px; 
          border: 3px solid rgba(0,0,0,0); 
          background-clip: padding-box; 
        }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; background-clip: padding-box; }
      `}</style>
    </div >
  );
}

const styles = {
  page: { background: "#f9fafb", height: "100vh", overflow: "hidden", fontFamily: '"Inter", sans-serif' },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 30px", borderBottom: `1px solid ${BORDER}`, background: "#fff" },
  centerTitle: { fontSize: "28px", fontWeight: "900", margin: 0, letterSpacing: '0.5px', color: "#000" },
  franchiseLabel: { fontSize: "18px", fontWeight: "800", color: PRIMARY },
  fullToggleBar: { display: "flex", width: "100%", padding: "8px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}` },
  toggleBtn: { flex: 1, padding: "18px", background: "#fff", cursor: "pointer", fontWeight: "800", fontSize: "15px", borderWidth: "0px 0px 4px 0px", borderStyle: "solid" },
  inactiveToggle: { borderColor: "transparent", color: "#6b7280" },
  activeToggle: { color: PRIMARY, borderColor: PRIMARY, background: "#f9fafb" },
  splitLayout: { display: "flex", height: "calc(100vh - 140px)" },

  menuContainer: { flex: 0.65, padding: "0 25px 25px 25px", overflowY: "auto", display: "flex", flexDirection: "column", position: 'relative' },
  stickyActionHeader: { position: 'sticky', top: 0, background: '#f9fafb', paddingTop: '25px', zIndex: 10, marginBottom: '5px' },
  cartContainer: { padding: "25px", background: "#fff", display: "flex", flexDirection: "column", borderLeft: `1px solid ${BORDER}`, boxShadow: "-4px 0 15px rgba(0,0,0,0.02)" },
  actionRow: { display: "flex", gap: "10px", marginBottom: "15px" },

  categoryContainer: { width: '100%', marginBottom: '15px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '12px' },
  categoryRow: { display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "10px", marginTop: "5px" },

  greenCardBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "0 25px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", cursor: "pointer" },
  catBtn: { padding: "10px 25px", borderRadius: "12px", border: `1px solid ${BORDER}`, background: "#fff", color: "#6b7280", cursor: "pointer", fontSize: "14px", fontWeight: "700", whiteSpace: "nowrap" },
  catBtnActive: { background: PRIMARY, color: "#fff", borderColor: PRIMARY },
  searchInput: { flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${BORDER}`, outline: "none", fontSize: "16px" },
  grid: { display: "grid", gap: "15px" },

  itemCard: { padding: "22px", border: `2px solid ${BORDER}`, borderRadius: "18px", cursor: "pointer", background: "#fff", transition: '0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' },
  itemCardHover: { borderColor: PRIMARY, transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  itemCardSelected: { borderColor: PRIMARY, background: 'rgba(6, 95, 70, 0.04)', borderWidth: '2.5px' },

  cardInfo: { display: "flex", flexDirection: "column", gap: '6px' },
  itemName: { fontSize: "18px", fontWeight: "800", color: "#111827", lineHeight: '1.2' },
  itemPrice: { fontSize: "17px", fontWeight: "900", color: PRIMARY },

  sectionLabelBlack: { fontSize: "16px", fontWeight: "900", textTransform: "uppercase", color: "#000", marginBottom: "20px" },
  cartList: { flex: 1, overflowY: "auto", paddingRight: "15px" },
  cartRow: { display: "flex", justifyContent: "space-between", padding: "15px 0", borderBottom: "1px solid #f3f4f6" },
  cartMeta: { display: "flex", flexDirection: "column" },
  cartItemName: { fontSize: "16px", fontWeight: "700", color: "#000" },
  cartItemPrice: { fontSize: "14px", color: "#6b7280" },
  cartActions: { display: "flex", alignItems: "center", gap: "12px" },
  qtyControls: { display: "flex", background: "#f3f4f6", borderRadius: "10px", padding: "6px 10px", alignItems: "center" },
  qtyBtn: { border: "none", background: "none", cursor: "pointer", fontSize: "20px", fontWeight: "bold", color: PRIMARY, padding: "0 10px" },
  qtyInputBox: { width: "40px", textAlign: "center", border: "none", background: "transparent", fontSize: "16px", fontWeight: "800" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer" },
  billingFooter: { borderTop: "2px solid #000", paddingTop: "20px" },
  summaryLineBlack: { display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: '18px', fontWeight: '800' },
  totalLine: { display: "flex", justifyContent: "space-between", marginTop: "15px", marginBottom: "20px" },
  grandTotal: { fontSize: "32px", fontWeight: "900" },
  payBtn: { width: "100%", padding: "20px", background: PRIMARY, color: "#fff", border: "none", borderRadius: "14px", fontWeight: "900", fontSize: "18px", cursor: "pointer" },

  historyContainer: { padding: "40px", paddingRight: "50px", overflowY: "auto", height: "calc(100vh - 150px)" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "35px" },
  historyHeading: { fontSize: "32px", fontWeight: "900" },
  dateBadge: { background: "#f1f5f9", padding: "4px 12px", borderRadius: "8px", fontWeight: "700" },

  statsTillNowRow: { display: 'flex', gap: '20px' },
  statBox: { background: '#fff', border: `1px solid ${BORDER}`, padding: '12px 20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '200px' },
  statLabel: { fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: '20px', fontWeight: '900', color: PRIMARY },

  redLogout: { background: "#fee2e2", color: "#ef4444", border: "none", padding: "12px 25px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" },
  tableWrapper: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "24px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  thRow: { background: "#fff", borderBottom: `2px solid #000` },
  th: { padding: "20px", fontSize: "13px", fontWeight: "900", textTransform: "uppercase", cursor: 'pointer', color: '#4b5563', textAlign: 'left' },
  colSno: { padding: "20px", fontSize: "13px", fontWeight: "900", textTransform: "uppercase", color: '#4b5563', width: "80px", textAlign: 'center' },
  colTime: { padding: "20px", fontSize: "13px", fontWeight: "900", textTransform: "uppercase", color: '#4b5563', width: "120px", textAlign: 'right', cursor: 'pointer' },
  tr: { borderBottom: `1px solid #f1f5f9`, cursor: 'pointer' },
  td: { padding: "20px", fontSize: "15px", fontWeight: "600", color: '#111827', textAlign: 'left' },
  tdSno: { padding: "20px", fontSize: "15px", fontWeight: "600", color: '#111827', textAlign: 'center' },
  tdTime: { padding: "20px", fontSize: "15px", fontWeight: "600", color: '#111827', textAlign: 'right' },
  modeBadge: { background: '#f1f5f9', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', color: '#374151' },

  expandedRowContainer: { padding: '0 20px 20px 20px', background: '#f8fafc' },
  itemDetailList: { background: '#fff', borderRadius: '16px', padding: '25px', border: `1.5px solid ${BORDER}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  detailHeaderLine: { fontSize: '14px', fontWeight: '900', color: PRIMARY, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  detailItemName: { fontSize: '16px', fontWeight: '700', color: '#111827' },
  detailQty: { color: '#6b7280', fontSize: '14px', marginLeft: '8px', fontWeight: '500' },
  detailItemTotal: { fontSize: '16px', fontWeight: '800', color: '#000' },
  detailFinalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #f1f5f9', fontSize: '18px' },
  emptyTable: { textAlign: "center", padding: "40px", color: "#9ca3af" },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: 'blur(10px)', padding: '20px' },
  modalHorizontal: { background: "#fff", borderRadius: "32px", padding: "35px", width: "100%", maxWidth: "920px", height: 'auto', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: "0 40px 80px rgba(0,0,0,0.3)" },
  modalHeaderCentered: { display: "flex", justifyContent: "space-between", marginBottom: "25px", alignItems: 'center' },
  modalFlexBody: { display: 'flex', gap: '30px', alignItems: 'flex-start' },

  modalLeftCol: { flex: 1.1, display: 'flex', flexDirection: 'column' },
  modalRightCol: { flex: 1, display: 'flex', flexDirection: 'column', background: '#fcfcfc', borderRadius: '24px', padding: '30px', border: `1px solid ${BORDER}` },

  receiptContainerSmall: { background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', border: `1.5px solid ${BORDER}`, borderRadius: '16px', padding: '20px' },
  receiptListSmall: { maxHeight: '250px', overflowY: 'auto', paddingRight: '15px' },
  receiptRowSmall: { display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f3f4f6' },
  receiptItemNameSmall: { fontSize: '16px', fontWeight: '700', color: '#111827' },
  receiptItemPriceSmall: { fontSize: '16px', fontWeight: '800', color: '#000' },
  dashedDividerSmall: { height: '1px', borderTop: '1px dashed #e5e7eb', margin: '15px 0' },

  receiptTotalLineSmall: { textAlign: 'right', padding: '10px 0' },

  discountVibeBoxSmall: { width: '100%', marginBottom: '20px' },
  vibeLabelSmall: { fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '12px', display: 'block', letterSpacing: '1px' },
  horizFlexSmall: { display: 'flex', flexDirection: 'column', gap: '15px' },
  vibeToggleRowSmall: { display: 'flex', gap: '8px' },
  vibeToggleBtnSmall: { flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${BORDER}`, background: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' },
  vibeToggleActive: { background: PRIMARY, color: '#fff', borderColor: PRIMARY },
  vibeInputWrapperSmall: { width: '100%' },
  vibeInputSmall: { width: '100%', padding: '18px', borderRadius: '15px', border: `2px solid ${BORDER}`, outline: 'none', fontWeight: '900', fontSize: '22px', textAlign: 'center' },

  grandVibeTotalSmall: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px', marginTop: '10px' },
  payOptionsCompactSmall: { display: "flex", gap: '15px', width: '100%' },
  methodBtnModernSmall: { flex: 1, padding: '22px', borderRadius: '18px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: '900', fontSize: '18px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },

  closeBtn: { border: "none", background: "none", fontSize: "32px", cursor: "pointer", color: '#9ca3af' },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900", color: PRIMARY },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: "20px" },

  mobileCartOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 200, display: "flex", flexDirection: "column", padding: "20px" },
  floatingCartBtn: { position: "fixed", bottom: "20px", left: "20px", right: "20px", background: "#000", color: "#fff", padding: "18px 25px", borderRadius: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: 90, border: "none", cursor: 'pointer' },

  mobileHistoryCard: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
};

export default Store;