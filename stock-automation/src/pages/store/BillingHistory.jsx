import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  Printer, 
  Unplug, 
  Loader2 
} from "lucide-react";

// --- IMPORT THE PRINTER HOOK ---
import { useBluetoothPrinter } from "../printer/BluetoothPrinter";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";

function BillingHistory() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  
  // Initialize Printer Logic
  const { connectPrinter, disconnectPrinter, printReceipt, isConnected, isConnecting } = useBluetoothPrinter();

  // DATA STATES
  const [history, setHistory] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null); // Store profile here
  const [expandedBill, setExpandedBill] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "descending" });

  const [lastCheckoutTime, setLastCheckoutTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [canCheckout, setCanCheckout] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const franchiseId = user?.franchise_id ? String(user.franchise_id) : null;
  const todayDisplay = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  /* ----------------------------------------------------
     1. FETCH STORE PROFILE (Fixes Print Address Issue)
  ---------------------------------------------------- */
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
        console.error("❌ Profile Load Error:", err.message);
      }
    };
    fetchProfile();
  }, [franchiseId]);

  /* ----------------------------------------------------
     2. LOAD BILLING HISTORY
  ---------------------------------------------------- */
  useEffect(() => {
    const initializeData = async () => {
      if (!franchiseId) return;
      setDataLoading(true);

      try {
        // Get Last Checkout Time
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

        // Get Bills since that time
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

  /* ----------------------------------------------------
     3. CHECKOUT TIMER LOGIC
  ---------------------------------------------------- */
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

  /* ----------------------------------------------------
     4. REPRINT HANDLER (UPDATED)
  ---------------------------------------------------- */
  const handleReprint = async (e, bill) => {
    e.stopPropagation(); 
    if (!isConnected) {
      alert("Please connect the printer first using the button at the top.");
      return;
    }

    try {
        // Construct Address (Address + City only)
        let finalAddress = "";
        if (storeProfile) {
          const parts = [storeProfile.address, storeProfile.city].filter(Boolean);
          finalAddress = parts.join(", ");
        }

        console.log("🖨️ Reprinting Bill:", bill.id);

        await printReceipt({
          company: storeProfile?.company || "STORE",
          address: finalAddress,
          total: bill.total.toFixed(2),
          thankYouMsg: "*** DUPLICATE RECEIPT ***", // Added this so you know it's a copy
          items: bill.bills_items_generated.map(i => ({
            name: i.item_name,
            qty: i.qty,
            subtotal: i.total.toFixed(2) // Uses the stored total for that item
          }))
        });
    } catch(err) { 
        console.error("Reprint Failed:", err);
        alert("Reprint failed. Check console.");
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

  // Sorting & Stats Logic
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
    return { totalSales, totalDiscount, orderCount: history.length };
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
          <div style={styles.headerTopArea}>
            <div>
              <h2 style={styles.historyHeading}>Today's Summary</h2>
              <p style={styles.dateText}>{todayDisplay}</p>
            </div>
            
            {/* PRINTER & ACTION BUTTONS */}
            <div style={styles.actionButtonGroup}>
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

              <button onClick={logout} style={styles.logoutBtn}>LOGOUT</button>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <button onClick={handleCheckout} disabled={!canCheckout} style={{ ...styles.checkoutTodayBtn, opacity: canCheckout ? 1 : 0.6, cursor: canCheckout ? "pointer" : "not-allowed" }}>
                  CHECKOUT FOR TODAY
                </button>
                {!canCheckout && <span style={styles.timerText}>Available in: {timeLeft}</span>}
              </div>
            </div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statBox}><span style={styles.statLabel}>Total Revenue</span><span style={styles.statValue}>₹{stats.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div style={styles.statBox}><span style={styles.statLabel}>Total Orders</span><span style={styles.statValue}>{stats.orderCount}</span></div>
            <div style={styles.statBox}><span style={styles.statLabel}>Total Discounts</span><span style={{ ...styles.statValue, color: DANGER }}>₹{stats.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
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
                <th style={styles.th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.length > 0 ? sortedHistory.map((bill, index) => {
                const isSelected = expandedBill === bill.id;
                return (
                  <React.Fragment key={bill.id}>
                    <tr style={{ ...styles.tr, background: isSelected ? "#ecfdf5" : "transparent", borderLeft: isSelected ? `6px solid ${PRIMARY}` : "6px solid transparent" }} onClick={() => setExpandedBill(isSelected ? null : bill.id)}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}><span style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</span></td>
                      <td style={styles.td}><span style={{ ...styles.modeBadge, background: bill.payment_mode === "CASH" ? "#f0fdf4" : "#eff6ff", color: bill.payment_mode === "CASH" ? PRIMARY : "#2563eb" }}>{bill.payment_mode}</span></td>
                      <td style={{ ...styles.td, color: DANGER }}>₹{bill.discount?.toFixed(2) || "0.00"}</td>
                      <td style={{ ...styles.td, fontWeight: "900" }}>₹{bill.total.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: "#64748b" }}>{new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</td>
                      <td style={styles.td}><button style={styles.reprintBtn} onClick={(e) => handleReprint(e, bill)}>🖨️ REPRINT</button></td>
                    </tr>
                    {isSelected && (
                      <tr style={{ background: "#f8fafc" }}>
                        <td colSpan="7" style={styles.expandedRow}>
                          <div style={styles.detailContainer}>
                            <div style={styles.detailHeaderRow}>
                                <h4 style={styles.detailTitle}>Items in this bill:</h4>
                            </div>
                            <div style={styles.itemsList}>
                                {bill.bills_items_generated?.map((item, idx) => (
                                <div key={idx} style={styles.detailItem}>
                                    <span style={styles.detailName}>{item.item_name} <small>x {item.qty}</small></span>
                                    <span style={styles.detailPrice}>₹{item.total.toFixed(2)}</span>
                                </div>
                                ))}
                            </div>
                            
                            <div style={styles.detailSummaryBox}>
                                <div style={styles.summaryLine}>
                                    <span>Subtotal</span>
                                    <span>₹{bill.subtotal?.toFixed(2) || "0.00"}</span>
                                </div>
                                <div style={styles.summaryLine}>
                                    <span style={{ color: DANGER }}>Discount</span>
                                    <span style={{ color: DANGER }}>- ₹{bill.discount?.toFixed(2) || "0.00"}</span>
                                </div>
                                <div style={{ ...styles.summaryLine, borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                                    <span style={{ fontWeight: '900', fontSize: '16px' }}>Net Total</span>
                                    <span style={{ fontWeight: '900', fontSize: '16px', color: PRIMARY }}>₹{bill.total.toFixed(2)}</span>
                                </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: "700" }}>No transactions recorded today.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  headerTopArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyHeading: { fontSize: "32px", fontWeight: "900", color: "#000", margin: 0 },
  dateText: { margin: '5px 0 0 0', color: '#64748b', fontWeight: '700' },
  actionButtonGroup: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  
  connectBtn: { 
    background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", 
    fontWeight: "900", fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' 
  },
  connectedBadge: { 
    background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", 
    fontWeight: "900", fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default'
  },
  disconnectBtn: {
    background: "#fee2e2", color: DANGER, border: "none", 
    width: '42px', height: '38px', 
    borderRadius: "12px",
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  reprintBtn: { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' },
  logoutBtn: { color: DANGER, border: `1.5px solid ${DANGER}`, background: 'none', padding: "10px 20px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", cursor: "pointer" },
  checkoutTodayBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontWeight: "800", fontSize: "13px" },
  timerText: { fontSize: '11px', color: DANGER, fontWeight: '700', marginTop: '4px' },
  statsRow: { display: "flex", gap: "15px" },
  statBox: { background: "#fff", border: `1px solid ${BORDER}`, padding: "15px 25px", borderRadius: "16px", minWidth: "180px" },
  statLabel: { display: "block", fontSize: "11px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontSize: "26px", fontWeight: "900", color: PRIMARY },
  tableWrapper: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "24px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#f8fafc", borderBottom: `2px solid ${BORDER}` },
  th: { padding: "18px 25px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#64748b" },
  thSortable: { padding: "18px 25px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#64748b", cursor: 'pointer' },
  thContent: { display: 'flex', alignItems: 'center' },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: "pointer" },
  td: { padding: "20px 25px", fontSize: "15px", fontWeight: "700", color: "#1e293b" },
  idHash: { fontFamily: 'monospace', color: PRIMARY, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' },
  modeBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' },
  expandedRow: { padding: "0px" },
  detailContainer: { padding: "25px 60px", borderLeft: `6px solid ${PRIMARY}` },
  detailHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  detailTitle: { margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' },
  changeOrderBtn: { background: '#000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' },
  itemsList: { marginBottom: '20px' },
  detailItem: { display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "15px", fontWeight: "700", borderBottom: '1px dashed #e5e7eb' },
  detailName: { color: '#334155' },
  detailPrice: { color: '#000' },
  detailSummaryBox: { maxWidth: '300px', marginLeft: 'auto', background: '#fff', padding: '15px', borderRadius: '12px', border: `1px solid ${BORDER}` },
  summaryLine: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px', fontWeight: '700' },
  loader: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "20px", color: PRIMARY, fontWeight: '800' }
};

export default BillingHistory;