import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  Printer, 
  Unplug, 
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  X
} from "lucide-react";

// --- IMPORT THE PRINTER HOOK ---
import { useBluetoothPrinter } from "../printer/BluetoothPrinter";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";

// --- SUB-COMPONENT: CANCEL BUTTON WITH TIMER ---
const CancelTimerButton = ({ createdAt, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const fiveMinutesLater = createdTime + (5 * 60 * 1000); // 5 Minutes in MS
      const now = new Date().getTime();
      const diff = fiveMinutesLater - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
      } else {
        setIsExpired(false);
        setTimeLeft(diff);
      }
    };

    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [createdAt]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isExpired) {
    return (
      <div style={styles.expiredBox}>
         <span style={{fontSize: '11px', fontWeight: '800'}}>CANCELLATION PERIOD ENDED</span>
      </div>
    );
  }

  return (
    <button 
      style={styles.cancelBtn} 
      onClick={(e) => {
        e.stopPropagation(); // Prevents clicking the row behind it
        onCancel();
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
         <XCircle size={18} /> CANCEL ORDER
      </div>
      <div style={styles.timerBadge}>
         {formatTime(timeLeft)}
      </div>
    </button>
  );
};

function BillingHistory() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { connectPrinter, disconnectPrinter, printReceipt, isConnected, isConnecting } = useBluetoothPrinter();

  // DATA STATES
  const [history, setHistory] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null); 
  const [expandedBill, setExpandedBill] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "descending" });

  const [lastCheckoutTime, setLastCheckoutTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [canCheckout, setCanCheckout] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  
  // --- NEW: DELETE MODAL STATE ---
  const [billToDelete, setBillToDelete] = useState(null);

  const franchiseId = user?.franchise_id ? String(user.franchise_id) : null;
  const todayDisplay = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // 1. FETCH PROFILE
  useEffect(() => {
    const fetchProfile = async () => {
      if (!franchiseId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('company, address, city') 
          .eq('franchise_id', franchiseId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) setStoreProfile(data);
      } catch (err) {
        console.error("Profile Load Error:", err.message);
      }
    };
    fetchProfile();
  }, [franchiseId]);

  // 2. LOAD HISTORY
  useEffect(() => {
    const initializeData = async () => {
      if (!franchiseId) return;
      setDataLoading(true);
      try {
        const { data: lastClose, error: lastCloseError } = await supabase
          .from("bills_generated")
          .select("created_at")
          .eq("franchise_id", franchiseId)
          .eq("is_day_closed", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(); 

        if (lastCloseError) throw lastCloseError;

        const lastTime = lastClose?.created_at
          ? new Date(lastClose.created_at)
          : new Date(new Date().setHours(0, 0, 0, 0));

        setLastCheckoutTime(lastTime);

        const { data: bills, error: billsError } = await supabase
          .from("bills_generated")
          .select("*, bills_items_generated(*)")
          .eq("franchise_id", franchiseId)
          .eq("is_day_closed", false)
          .gte("created_at", lastTime.toISOString())
          .order("created_at", { ascending: false });

        if (billsError) throw billsError;
        if (bills) setHistory(bills);

      } catch (err) {
        console.error("History Load Error:", err.message);
      } finally {
        setDataLoading(false);
      }
    };
    initializeData();
  }, [franchiseId]);

  // 3. TIMER
  useEffect(() => {
    if (!lastCheckoutTime) return;
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now - lastCheckoutTime;
      const remaining = 12 * 60 * 60 * 1000 - diff;
      if (remaining > 0) {
        setCanCheckout(false);
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining / (1000 * 60)) % 60);
        const s = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else {
        setCanCheckout(true);
        setTimeLeft("");
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastCheckoutTime]);

  // 4. REPRINT
  const handleReprint = async (e, bill) => {
    if (e) e.stopPropagation(); 
    if (!isConnected) {
      alert("Please connect the printer first using the button at the top.");
      return;
    }
    try {
        let finalAddress = "";
        if (storeProfile) {
          const parts = [storeProfile.address, storeProfile.city].filter(Boolean);
          finalAddress = parts.join(", ");
        }
        await printReceipt({
          company: storeProfile?.company || "STORE",
          address: finalAddress,
          total: bill.total.toFixed(2),
          thankYouMsg: "*** DUPLICATE RECEIPT ***",
          items: bill.bills_items_generated.map(i => ({
            name: i.item_name,
            qty: i.qty,
            subtotal: i.total.toFixed(2)
          }))
        });
    } catch(err) { 
        console.error("Reprint Failed:", err);
        alert("Reprint failed. Check console.");
    }
  };

  // --- 5. INITIATE DELETE (OPENS MODAL) ---
  const initiateDelete = (billId) => {
    setBillToDelete(billId);
  };

  // --- 6. CONFIRM DELETE (DB ACTION) ---
  const confirmDelete = async () => {
    if (!billToDelete) return;
    const billId = billToDelete;

    try {
      // DB Delete
      const { data, error } = await supabase
        .from("bills_generated")
        .delete()
        .eq("id", billId)
        .select(); 

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Database Error: ${error.message}`);
        setBillToDelete(null); // Close modal
        return;
      }

      if (!data || data.length === 0) {
        console.error("Delete failed: No rows deleted (Check permissions/RLS).");
        alert("Permission Denied: You cannot delete this bill.");
      } else {
        // Update UI
        setHistory(prev => prev.filter(b => b.id !== billId));
        setExpandedBill(null); 
        alert("Order cancelled successfully.");
      }

    } catch (err) {
      console.error("Unexpected Exception:", err);
      alert(`Unexpected Error: ${err.message}`);
    } finally {
      setBillToDelete(null); // Close modal
    }
  };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    const confirm = window.confirm("Are you sure you want to close today's shift?");
    if (!confirm) return;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    const { error } = await supabase.from("bills_generated").insert({
      franchise_id: franchiseId,
      subtotal: 0,
      tax: 0,
      total: 0,
      discount: 0,
      payment_mode: "SYSTEM",
      is_day_closed: true,
      business_date: nextDate.toISOString().split("T")[0],
    });
    if (error) { alert("Checkout failed."); return; }
    window.location.reload();
  };

  // 7. SORT & STATS
  const sortedHistory = useMemo(() => {
    let sortableItems = [...history];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [history, sortConfig]);

  const stats = useMemo(() => {
    const totalSales = history.reduce((sum, b) => sum + b.total, 0);
    const totalDiscount = history.reduce((sum, b) => sum + (b.discount || 0), 0);
    const totalCash = history.reduce((sum, b) => b.payment_mode === "CASH" ? sum + b.total : sum, 0);
    const totalUPI = history.reduce((sum, b) => b.payment_mode !== "CASH" ? sum + b.total : sum, 0);
    return { totalSales, totalDiscount, orderCount: history.length, totalCash, totalUPI };
  }, [history]);

  const requestSort = (key) => {
    let direction = sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending";
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    const isActive = sortConfig?.key === columnKey;
    const isAsc = sortConfig?.direction === "ascending";
    if (!isActive) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ marginLeft: "8px" }}><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>;
    return isAsc ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="3" style={{ marginLeft: "8px" }}><path d="M18 15l-6-6-6 6" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="3" style={{ marginLeft: "8px" }}><path d="M6 9l6 6 6-6" /></svg>;
  };

  if (loading || dataLoading) return (
    <div style={styles.loader}>
        <Loader2 className="animate-spin" size={40} />
        <span style={{marginTop: 10}}>Loading History...</span>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.topBarSection}></div>
        <h1 style={styles.centerTitle}>BILLING HISTORY</h1>
        <div style={{ ...styles.topBarSection, justifyContent: "flex-end" }}>
          <div style={styles.franchiseLabel}>Franchise ID: {franchiseId}</div>
        </div>
      </div>

      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...styles.inactiveToggle }} onClick={() => navigate("/store")}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...styles.activeToggle }}>HISTORY</button>
      </div>

      <div style={styles.historyContainer}>
        <div style={styles.historyHeader}>
          {/* PRINTER BAR */}
          <div style={styles.printerBar}>
              {isConnected ? (
                <div style={{display: 'flex', gap: '5px'}}>
                  <button style={styles.connectedBadge}>
                      <Printer size={16} /> CONNECTED
                  </button>
                  <button onClick={disconnectPrinter} style={styles.disconnectBtn} title="Disconnect">
                      <Unplug size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={connectPrinter} 
                  disabled={isConnecting}
                  style={{ ...styles.connectBtn, opacity: isConnecting ? 0.7 : 1 }}
                >
                    {isConnecting ? <Loader2 className="animate-spin" size={16}/> : <Printer size={16}/>} 
                    {isConnecting ? " CONNECTING..." : " CONNECT PRINTER"}
                </button>
              )}
          </div>

          <div style={styles.headerTopArea}>
            <div>
              <h2 style={styles.historyHeading}>Today's Summary</h2>
              <p style={styles.dateText}>{todayDisplay}</p>
            </div>
            
            <div style={styles.actionButtonGroup}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <button onClick={handleCheckout} disabled={!canCheckout} style={{ ...styles.checkoutTodayBtn, opacity: canCheckout ? 1 : 0.6, cursor: canCheckout ? "pointer" : "not-allowed" }}>
                  CHECKOUT FOR TODAY
                </button>
                {!canCheckout && <span style={styles.timerText}>Available in: {timeLeft}</span>}
              </div>
              <button onClick={logout} style={styles.logoutBtn}>LOGOUT</button>
            </div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Total Revenue</span>
              <span style={styles.statValue}>₹{stats.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Total Orders</span>
              <span style={styles.statValue}>{stats.orderCount}</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Total Discounts</span>
              <span style={{ ...styles.statValue, color: DANGER }}>₹{stats.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Total UPI</span>
              <span style={{ ...styles.statValue, color: "#2563eb" }}>₹{stats.totalUPI.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Total CASH</span>
              <span style={{ ...styles.statValue, color: "#16a34a" }}>₹{stats.totalCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>S.NO</th>
                <th style={styles.thSortable} onClick={() => requestSort("id")}><div style={styles.thContent}>BILL ID <SortIcon columnKey="id" /></div></th>
                <th style={styles.thSortable} onClick={() => requestSort("payment_mode")}><div style={styles.thContent}>MODE <SortIcon columnKey="payment_mode" /></div></th>
                <th style={styles.thSortable} onClick={() => requestSort("discount")}><div style={styles.thContent}>DISCOUNT <SortIcon columnKey="discount" /></div></th>
                <th style={styles.thSortable} onClick={() => requestSort("total")}><div style={styles.thContent}>AMOUNT <SortIcon columnKey="total" /></div></th>
                <th style={styles.thSortable} onClick={() => requestSort("created_at")}><div style={styles.thContent}>TIME <SortIcon columnKey="created_at" /></div></th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.length > 0 ? sortedHistory.map((bill, index) => {
                const isSelected = expandedBill === bill.id;
                
                // STYLE: Clean row styling
                const rowStyle = isSelected 
                  ? { background: "#fff", borderLeft: `6px solid ${PRIMARY}`, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" } 
                  : { background: "transparent", borderLeft: "6px solid transparent" };

                return (
                  <React.Fragment key={bill.id}>
                    <tr 
                      style={{ ...styles.tr, ...rowStyle }} 
                      onClick={() => setExpandedBill(isSelected ? null : bill.id)}
                    >
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}><span style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</span></td>
                      <td style={styles.td}><span style={{ ...styles.modeBadge, background: bill.payment_mode === "CASH" ? "#f0fdf4" : "#eff6ff", color: bill.payment_mode === "CASH" ? PRIMARY : "#2563eb" }}>{bill.payment_mode}</span></td>
                      <td style={{ ...styles.td, color: DANGER }}>₹{bill.discount?.toFixed(2) || "0.00"}</td>
                      <td style={{ ...styles.td, fontWeight: "900" }}>₹{bill.total.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: "#64748b" }}>
                        <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                            {isSelected ? <ChevronUp size={16} color="#94a3b8"/> : <ChevronDown size={16} color="#94a3b8"/>}
                        </div>
                      </td>
                    </tr>
                    
                    {/* --- EXPANDED DETAILS (CLEAN CARD REVEAL) --- */}
                    {isSelected && (
                      <tr style={{ background: "#f1f5f9" }}>
                        <td colSpan="6" style={styles.expandedRow}>
                          <div style={styles.detailContainer}>
                            
                            {/* LEFT COLUMN: ITEMS (FIXED HEIGHT SCROLLABLE) */}
                            <div style={styles.detailLeftCol}>
                                <div style={styles.detailHeaderRow}>
                                    <h4 style={styles.detailTitle}>Items in this bill</h4>
                                </div>
                                <div style={styles.itemsListScrollable}>
                                    {bill.bills_items_generated?.map((item, idx) => (
                                    <div key={idx} style={styles.detailItem}>
                                        <div style={{flex: 1}}>
                                          <span style={styles.detailName}>{item.item_name}</span>
                                          <div style={{fontSize: '11px', color: '#64748b', fontWeight: '600'}}>Quantity: {item.qty}</div>
                                        </div>
                                        <span style={styles.detailPrice}>₹{item.total.toFixed(2)}</span>
                                    </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* RIGHT COLUMN: SUMMARY + CANCEL + PRINT BUTTON */}
                            <div style={styles.detailRightCol}>
                                <div style={styles.detailSummaryBox}>
                                    <div style={styles.summaryLine}>
                                        <span>Subtotal</span>
                                        <span>₹{bill.subtotal?.toFixed(2) || "0.00"}</span>
                                    </div>
                                    <div style={styles.summaryLine}>
                                        <span style={{ color: DANGER }}>Discount</span>
                                        <span style={{ color: DANGER }}>- ₹{bill.discount?.toFixed(2) || "0.00"}</span>
                                    </div>
                                    <div style={{ ...styles.summaryLine, borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
                                        <span style={{ fontWeight: '900', fontSize: '18px' }}>Total</span>
                                        <span style={{ fontWeight: '900', fontSize: '18px', color: PRIMARY }}>₹{bill.total.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                {/* --- CANCEL BUTTON (WITH TIMER) --- */}
                                <CancelTimerButton 
                                    createdAt={bill.created_at} 
                                    onCancel={() => initiateDelete(bill.id)} 
                                />

                                {/* BIG PRINT BUTTON */}
                                <button style={styles.bigPrintBtn} onClick={(e) => handleReprint(e, bill)}>
                                  <Receipt size={20} /> PRINT RECEIPT
                                </button>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>No transactions recorded today.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {billToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.closeModalBtn} onClick={() => setBillToDelete(null)}>
              <X size={20} color="#000" />
            </button>
            <div style={styles.modalBody}>
              <div style={styles.warningIconWrapper}>
                <AlertTriangle size={48} color={DANGER} />
              </div>
              <h3 style={styles.modalTitle}>Cancel Order?</h3>
              <p style={styles.modalDesc}>
                Are you sure you want to permanently delete this order? 
                This action <b>cannot be undone</b>.
              </p>
              <div style={styles.modalActions}>
                <button style={styles.btnCancel} onClick={() => setBillToDelete(null)}>NO, KEEP IT</button>
                <button style={styles.btnConfirmDelete} onClick={confirmDelete}>YES, DELETE ORDER</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { background: "#f9fafb", minHeight: "100vh", fontFamily: '"Inter", sans-serif' },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 30px", borderBottom: `1px solid ${BORDER}`, background: "#fff" },
  topBarSection: { flex: 1, display: 'flex', alignItems: 'center' },
  centerTitle: { fontSize: "22px", fontWeight: "900", margin: 0, color: "#000" },
  franchiseLabel: { fontSize: "14px", fontWeight: "800", color: PRIMARY, background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px' },
  fullToggleBar: { display: "flex", width: "100%", padding: "8px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}` },
  toggleBtn: { flex: 1, padding: "16px", cursor: "pointer", fontWeight: "800", fontSize: "14px", border: "none", background: "#fff" },
  activeToggle: { color: PRIMARY, borderBottom: `4px solid ${PRIMARY}` },
  inactiveToggle: { color: "#6b7280" },
  historyContainer: { padding: "40px", maxWidth: '1200px', margin: '0 auto' },
  historyHeader: { marginBottom: "30px", display: 'flex', flexDirection: 'column', gap: '20px' },
  printerBar: { display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' },
  headerTopArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyHeading: { fontSize: "32px", fontWeight: "900", color: "#000", margin: 0 },
  dateText: { margin: '5px 0 0 0', color: '#64748b', fontWeight: '700' },
  actionButtonGroup: { display: 'flex', gap: '15px', alignItems: 'flex-start' },
  connectBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontWeight: "900", fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  connectedBadge: { background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontWeight: "900", fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' },
  disconnectBtn: { background: "#fee2e2", color: DANGER, border: "none", width: '42px', height: '38px', borderRadius: "12px", display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  logoutBtn: { color: DANGER, border: `1.5px solid ${DANGER}`, background: 'none', padding: "10px 20px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", cursor: "pointer" },
  checkoutTodayBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontWeight: "800", fontSize: "13px" },
  timerText: { fontSize: '11px', color: DANGER, fontWeight: '700', marginTop: '4px' },
  statsRow: { display: "flex", gap: "15px", flexWrap: "wrap" }, 
  statBox: { background: "#fff", border: `1px solid ${BORDER}`, padding: "15px 25px", borderRadius: "16px", minWidth: "180px" },
  statLabel: { display: "block", fontSize: "11px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontSize: "26px", fontWeight: "900", color: PRIMARY },
  tableWrapper: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "24px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#f8fafc", borderBottom: `2px solid ${BORDER}` },
  th: { padding: "18px 25px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#64748b" },
  thSortable: { padding: "18px 25px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#64748b", cursor: 'pointer' },
  thContent: { display: 'flex', alignItems: 'center' },
  
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "all 0.2s ease" },
  td: { padding: "20px 25px", fontSize: "15px", fontWeight: "700", color: "#1e293b" },
  
  idHash: { fontFamily: 'monospace', color: PRIMARY, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' },
  modeBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' },
  expandedRow: { padding: "0px" },
  
  detailContainer: { display: "flex", flexDirection: "row", gap: "40px", padding: "30px 60px", borderLeft: `6px solid ${PRIMARY}` },
  detailLeftCol: { flex: 2, display: "flex", flexDirection: "column" }, 
  detailRightCol: { flex: 1, display: "flex", flexDirection: "column", gap: "12px", minWidth: "250px" }, 
  
  detailHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  detailTitle: { margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' },
  
  itemsListScrollable: { 
    height: "250px", 
    overflowY: "auto", 
    paddingRight: "15px",
    borderRight: `1px dashed ${BORDER}`
  },
  
  detailItem: { display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "15px", fontWeight: "700", borderBottom: '1px dashed #e5e7eb', alignItems: "center" },
  detailName: { color: '#334155', display: 'block' },
  detailPrice: { color: '#000', fontSize: '15px' },
  
  detailSummaryBox: { background: '#fff', padding: '20px', borderRadius: '16px', border: `1px solid ${BORDER}`, width: "100%", marginBottom: '10px' },
  summaryLine: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', fontWeight: '700' },
  
  // --- BUTTON STYLES ---
  cancelBtn: {
    background: "#fee2e2", color: DANGER, border: "none", padding: "15px", borderRadius: "12px",
    fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "space-between",
    cursor: "pointer", width: "100%", transition: "all 0.2s"
  },
  timerBadge: {
    background: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: DANGER, fontWeight: "900"
  },
  expiredBox: {
    padding: "15px", borderRadius: "12px", border: "1px dashed #ccc", color: "#999", textAlign: "center", background: "#f9f9f9"
  },
  bigPrintBtn: {
    background: "#000", color: "#fff", border: "none", padding: "15px", borderRadius: "12px",
    fontSize: "14px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    cursor: "pointer", width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  modalContent: {
    background: '#fff', padding: '40px', borderRadius: '20px', width: '400px',
    textAlign: 'center', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  closeModalBtn: {
    position: 'absolute', top: '15px', right: '15px', background: '#f3f4f6',
    border: 'none', borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  warningIconWrapper: {
    background: '#fef2f2', width: '80px', height: '80px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
  },
  modalTitle: { fontSize: '22px', fontWeight: '900', margin: '0 0 10px', color: '#000' },
  modalDesc: { fontSize: '14px', color: '#64748b', margin: '0 0 30px', lineHeight: '1.5' },
  modalActions: { display: 'flex', gap: '12px' },
  btnCancel: {
    flex: 1, padding: '14px', border: `1px solid ${BORDER}`, background: '#fff',
    borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
  },
  btnConfirmDelete: {
    flex: 1, padding: '14px', border: 'none', background: DANGER, color: '#fff',
    borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px'
  },

  loader: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "20px", color: PRIMARY, fontWeight: '800' }
};

export default BillingHistory;