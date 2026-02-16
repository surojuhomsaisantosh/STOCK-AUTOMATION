import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  Printer,
  Unplug,
  Loader2,
  Receipt,
  XCircle,
  AlertTriangle,
  X,
  LogOut,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye
} from "lucide-react";

import { useBluetoothPrinter } from "../printer/BluetoothPrinter";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";

const CancelTimerButton = ({ createdAt, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const fiveMinutesLater = createdTime + (5 * 60 * 1000);
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

  if (isExpired) return null;

  return (
    <button style={styles.cancelBtn} onClick={(e) => { e.stopPropagation(); onCancel(); }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle size={18} /> CANCEL ORDER
      </div>
      <div style={styles.timerBadge}>{formatTime(timeLeft)}</div>
    </button>
  );
};

const BillDetailsModal = ({ bill, onClose, onReprint, onCancelRequest }) => {
  if (!bill) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modalContent, width: '95%', maxWidth: '600px', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Bill Details</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>#{bill.id.toString().slice(-6).toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} /></button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Date & Time</span>
            <span style={styles.detailValue}>
              {new Date(bill.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Payment Mode</span>
            <span style={{ ...styles.detailValue, color: bill.payment_mode === 'CASH' ? PRIMARY : '#2563eb' }}>{bill.payment_mode}</span>
          </div>

          <div style={{ margin: '20px 0', border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 15px', borderBottom: `1px solid ${BORDER}`, fontWeight: '700', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Item</span>
              <span>Total</span>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {bill.bills_items_generated?.map((item, idx) => (
                <div key={idx} style={{ padding: '10px 15px', borderBottom: idx === bill.bills_items_generated.length - 1 ? 'none' : `1px dashed ${BORDER}`, display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{item.item_name}</span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Qty: {item.qty}</div>
                  </div>
                  <span style={{ fontWeight: '700' }}>₹{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${BORDER}`, paddingTop: '15px' }}>
            <div style={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{(bill.subtotal || 0).toFixed(2)}</span>
            </div>
            <div style={{ ...styles.summaryRow, color: DANGER }}>
              <span>Discount</span>
              <span>-₹{(bill.discount || 0).toFixed(2)}</span>
            </div>
            <div style={{ ...styles.summaryRow, fontSize: '18px', color: '#000' }}>
              <span>Total Amount</span>
              <span>₹{bill.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.bigPrintBtn} onClick={(e) => onReprint(e, bill)}>
            <Receipt size={18} /> REPRINT RECEIPT
          </button>
          <CancelTimerButton createdAt={bill.created_at} onCancel={() => onCancelRequest(bill.id)} />
        </div>
      </div>
    </div>
  );
};

function BillingHistory() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { connectPrinter, disconnectPrinter, printReceipt, isConnected, isConnecting } = useBluetoothPrinter();

  const [history, setHistory] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null);
  const [staffName, setStaffName] = useState("Owner"); // Default to Owner
  const [selectedBill, setSelectedBill] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "descending" });
  const [lastCheckoutTime, setLastCheckoutTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [canCheckout, setCanCheckout] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [billToDelete, setBillToDelete] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const franchiseId = user?.franchise_id ? String(user.franchise_id) : null;
  const todayDisplay = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Fetch Staff Profile
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.from('staff_profiles').select('name').eq('id', user.id).maybeSingle();
        if (data) setStaffName(data.name);
      } catch (err) { console.error("Staff fetch error:", err); }
    };
    fetchStaff();
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!franchiseId) return;
      try {
        const { data, error } = await supabase.from('profiles').select('company, address, city').eq('franchise_id', franchiseId).limit(1).maybeSingle();
        if (error) throw error;
        if (data) setStoreProfile(data);
      } catch (err) { console.error(err.message); }
    };
    fetchProfile();
  }, [franchiseId]);



  useEffect(() => {
    const initializeData = async () => {
      if (!franchiseId) return;
      setDataLoading(true);
      try {
        const { data: lastClose } = await supabase.from("bills_generated").select("created_at").eq("franchise_id", franchiseId).eq("is_day_closed", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastTime = lastClose?.created_at ? new Date(lastClose.created_at) : null;
        setLastCheckoutTime(lastTime);

        // Strict Today Filter
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let query = supabase.from("bills_generated")
          .select("*, bills_items_generated(*)")
          .eq("franchise_id", franchiseId)
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString())
          .order("created_at", { ascending: false });

        const { data: bills } = await query;
        if (bills) setHistory(bills);
      } catch (err) { console.error(err.message); } finally { setDataLoading(false); }
    };
    initializeData();
  }, [franchiseId]);

  useEffect(() => {
    if (!lastCheckoutTime) { setCanCheckout(true); setTimeLeft(""); return; }
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
      } else { setCanCheckout(true); setTimeLeft(""); clearInterval(timer); }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastCheckoutTime]);

  const handleReprint = async (e, bill) => {
    if (e) e.stopPropagation();
    if (!isConnected) return alert("Connect printer first.");
    try {
      const parts = [storeProfile?.address, storeProfile?.city].filter(Boolean);
      await printReceipt({
        company: storeProfile?.company || "STORE",
        address: parts.join(", "),
        subtotal: (bill.subtotal || 0).toFixed(2),
        discount: (bill.discount || 0).toFixed(2),
        total: bill.total.toFixed(2),
        thankYouMsg: "*** DUPLICATE RECEIPT ***\nThank You! Visit Again",
        items: bill.bills_items_generated.map(i => ({ name: i.item_name, qty: i.qty, subtotal: i.total.toFixed(2) })),
        billId: bill.id.toString().slice(-6).toUpperCase()
      });
    } catch (err) { alert("Reprint failed."); }
  };

  const confirmDelete = async () => {
    try {
      await supabase.from("bills_generated").delete().eq("id", billToDelete);
      setHistory(prev => prev.filter(b => b.id !== billToDelete));
      setBillToDelete(null);
      setSelectedBill(null);
    } catch (err) { alert("Error deleting."); }
  };

  const confirmCheckoutAction = async () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    const { error } = await supabase.from("bills_generated").insert({
      franchise_id: franchiseId, subtotal: 0, tax: 0, total: 0, discount: 0, payment_mode: "SYSTEM", is_day_closed: true, business_date: nextDate.toISOString().split("T")[0],
    });
    if (!error) window.location.reload();
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
  };

  const sortedHistory = useMemo(() => {
    let items = [...history];
    items.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'id') { aVal = Number(aVal); bVal = Number(bVal); }
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return items;
  }, [history, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} color="#9ca3af" />;
    return sortConfig.direction === "ascending" ? <ArrowUp size={14} color={PRIMARY} /> : <ArrowDown size={14} color={PRIMARY} />;
  };

  const stats = useMemo(() => {
    const totalSales = history.reduce((sum, b) => sum + b.total, 0);
    const orderCount = history.length;
    const upiSales = history.reduce((sum, b) => (b.payment_mode === "UPI" ? sum + b.total : sum), 0);
    const cashSales = history.reduce((sum, b) => (b.payment_mode === "CASH" ? sum + b.total : sum), 0);
    const totalDiscount = history.reduce((sum, b) => sum + (b.discount || 0), 0);
    return { totalSales, orderCount, upiSales, cashSales, totalDiscount };
  }, [history]);

  if (loading || dataLoading) return <div style={styles.loader}><Loader2 className="animate-spin" size={40} /><span>Loading...</span></div>;

  return (
    <div style={styles.page}>
      {/* Top Bar - sticky for easy access */}
      <div style={{ ...styles.topBar, padding: isMobile ? "10px 15px" : "15px 30px" }}>
        {!isMobile && <div style={{ flex: 1 }}></div>}
        <h1 style={{ ...styles.centerTitle, fontSize: isMobile ? "18px" : "22px" }}>BILLING HISTORY</h1>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={styles.franchiseIdBox}>
            <span style={styles.idLabel}>ID :</span>
            <span style={styles.idValue}>{franchiseId || "..."}</span>
          </div>
        </div>
      </div>

      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...styles.inactiveToggle }} onClick={() => navigate("/store")}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...styles.activeToggle }}>HISTORY</button>
      </div>

      <div style={styles.contentContainer}>
        <div style={{ ...styles.historyHeader, padding: isMobile ? "15px" : "20px 30px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ ...styles.historyHeading, fontSize: isMobile ? '24px' : '32px' }}>Summary</h2>
              <p style={styles.dateText}>{todayDisplay} (Today)</p>
            </div>
            <button onClick={logout} style={{ ...styles.logoutBtn, padding: isMobile ? '8px 12px' : '10px 20px' }}>LOGOUT</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px' : '15px' }}>
            <div style={{ display: 'flex', gap: isMobile ? '8px' : '15px', width: '100%' }}>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>TOTAL REVENUE</span>
                <span style={styles.statValue}>₹{stats.totalSales.toFixed(0)}</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>TOTAL ORDERS</span>
                <span style={styles.statValue}>{stats.orderCount}</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>LOGGED IN AS</span>
                <span style={{ ...styles.statValue, fontSize: '16px', color: '#64748b', wordBreak: 'break-word' }}>{staffName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: isMobile ? '8px' : '15px', width: '100%' }}>
              <div style={{ ...styles.statBox, flex: 1, border: `1px solid ${BORDER}` }}>
                <span style={styles.statLabel}>UPI</span>
                <span style={{ ...styles.statValue, color: '#2563eb' }}>₹{stats.upiSales.toFixed(0)}</span>
              </div>
              <div style={{ ...styles.statBox, flex: 1, border: `1px solid ${BORDER}` }}>
                <span style={styles.statLabel}>CASH</span>
                <span style={{ ...styles.statValue, color: '#059669' }}>₹{stats.cashSales.toFixed(0)}</span>
              </div>
              <div style={{ ...styles.statBox, flex: 1, border: `1px solid ${BORDER}` }}>
                <span style={{ ...styles.statLabel, color: DANGER }}>DISCOUNT</span>
                <span style={{ ...styles.statValue, color: DANGER }}>₹{stats.totalDiscount.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            <div style={styles.flexButtonWrapper}>
              {isConnected ? (
                <div style={{ display: 'flex', gap: '8px', width: '100%', height: '100%' }}>
                  <button style={{ ...styles.connectedBadge, flex: 1 }}>
                    <Printer size={16} /> {isMobile ? "ON" : "CONNECTED"}
                  </button>
                  <button onClick={disconnectPrinter} style={styles.disconnectBtn}>
                    <Unplug size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={connectPrinter} disabled={isConnecting} style={{ ...styles.connectBtn, width: '100%' }}>
                  {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                  {isMobile ? " CONNECT" : " CONNECT PRINTER"}
                </button>
              )}
            </div>
            <div style={styles.flexButtonWrapper}>
              <button onClick={() => canCheckout && setShowCheckoutModal(true)} disabled={!canCheckout}
                style={{ ...styles.checkoutTodayBtn, width: '100%', background: canCheckout ? PRIMARY : '#94a3b8', opacity: canCheckout ? 1 : 0.7 }}>
                {canCheckout ? "CHECKOUT" : `CLOSED (${timeLeft})`}
              </button>
            </div>
          </div>
        </div>

        {/* Table/List Area - Fills remaining space */}
        <div style={{ ...styles.tableWrapper, background: isMobile ? 'transparent' : '#fff' }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 15px 15px 15px' }}>
              {sortedHistory.map((bill) => (
                <div key={bill.id} style={styles.mobileCard} onClick={() => setSelectedBill(bill)}>
                  <div style={styles.mobileCardHeader}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginTop: '6px' }}>
                        {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(bill.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '900', fontSize: '18px' }}>₹{bill.total.toFixed(2)}</div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ ...styles.modeBadge, background: bill.payment_mode === "CASH" ? "#f0fdf4" : "#eff6ff", color: bill.payment_mode === "CASH" ? PRIMARY : "#2563eb" }}>{bill.payment_mode}</span>
                      </div>
                    </div>
                    <div style={{ marginLeft: '15px', color: '#94a3b8' }}>
                      <Eye size={20} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.stickyThead}>
                <tr style={styles.thRow}>
                  <th style={styles.clickableTh} onClick={() => handleSort('created_at')}>
                    <div style={styles.thContent}>TIME <SortIcon columnKey="created_at" /></div>
                  </th>
                  <th style={styles.clickableTh} onClick={() => handleSort('id')}>
                    <div style={styles.thContent}>BILL ID <SortIcon columnKey="id" /></div>
                  </th>
                  <th style={styles.clickableTh} onClick={() => handleSort('payment_mode')}>
                    <div style={styles.thContent}>MODE <SortIcon columnKey="payment_mode" /></div>
                  </th>
                  <th style={styles.clickableTh} onClick={() => handleSort('discount')}>
                    <div style={styles.thContent}>DISCOUNT <SortIcon columnKey="discount" /></div>
                  </th>
                  <th style={styles.clickableTh} onClick={() => handleSort('total')}>
                    <div style={styles.thContent}>AMOUNT <SortIcon columnKey="total" /></div>
                  </th>
                  <th style={styles.clickableTh}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((bill) => (
                  <tr key={bill.id} style={styles.tr} onClick={() => setSelectedBill(bill)}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{new Date(bill.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(bill.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td style={styles.td}><span style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</span></td>
                    <td style={styles.td}>
                      <span style={{ ...styles.modeBadge, background: bill.payment_mode === "CASH" ? "#f0fdf4" : "#eff6ff", color: bill.payment_mode === "CASH" ? PRIMARY : "#2563eb", fontSize: '12px' }}>{bill.payment_mode}</span>
                    </td>
                    <td style={{ ...styles.td, color: bill.discount > 0 ? DANGER : '#94a3b8', fontWeight: bill.discount > 0 ? '700' : '400' }}>
                      {bill.discount > 0 ? `-₹${bill.discount.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ ...styles.td, fontWeight: "900", fontSize: '16px' }}>₹{bill.total.toFixed(2)}</td>
                    <td style={styles.td}>
                      <button style={styles.viewBtn} onClick={(e) => { e.stopPropagation(); setSelectedBill(bill); }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BillDetailsModal
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onReprint={handleReprint}
        onCancelRequest={(id) => { setBillToDelete(id); setSelectedBill(null); }}
      />

      {
        (billToDelete || showCheckoutModal) && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalContent, width: isMobile ? '85%' : '400px', padding: '25px', textAlign: 'center' }}>
              <div style={styles.warningIconWrapper}>
                {billToDelete ? <AlertTriangle size={40} color={DANGER} /> : <LogOut size={40} color={PRIMARY} />}
              </div>
              <h3 style={styles.modalTitle}>{billToDelete ? "Cancel Order?" : "Close Shift?"}</h3>
              <p style={styles.modalDesc}>{billToDelete ? "This will permanently delete the order." : "You won't be able to bill again for 12 hours."}</p>
              <div style={styles.modalActions}>
                <button style={styles.btnCancel} onClick={() => { setBillToDelete(null); setShowCheckoutModal(false); }}>NO</button>
                <button style={{ ...styles.btnConfirmDelete, background: billToDelete ? DANGER : PRIMARY }}
                  onClick={billToDelete ? confirmDelete : confirmCheckoutAction}>YES, PROCEED</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

const styles = {
  page: { background: "#f9fafb", minHeight: "100vh", display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${BORDER}`, background: "#fff", position: "sticky", top: 0, zIndex: 50 },
  centerTitle: { fontWeight: "900", margin: 0, color: "#000" },
  franchiseIdBox: { display: 'flex', alignItems: 'center', background: "white", padding: "8px 14px", borderRadius: "10px", border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  idLabel: { fontSize: '12px', fontWeight: '600', color: '#64748b', marginRight: '6px' },
  idValue: { fontSize: '14px', fontWeight: '800', color: PRIMARY },
  fullToggleBar: { display: "flex", width: "100%", padding: "8px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: "60px", zIndex: 40 }, // Approx topBar height
  toggleBtn: { flex: 1, padding: "16px", cursor: "pointer", fontWeight: "800", fontSize: "14px", border: "none", background: "#fff" },
  activeToggle: { color: PRIMARY, borderBottom: `4px solid ${PRIMARY}` },
  inactiveToggle: { color: "#6b7280" },

  contentContainer: { flex: 1, display: 'flex', flexDirection: 'column', width: '100%' },
  historyHeader: { marginBottom: "15px", display: 'flex', flexDirection: 'column', gap: '15px' },
  historyHeading: { fontWeight: "900", color: "#000", margin: 0 },
  dateText: { margin: '5px 0 0 0', color: '#64748b', fontWeight: '700' },
  statBox: { background: "#fff", border: `1px solid ${BORDER}`, padding: "15px", borderRadius: "16px", flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statLabel: { display: "block", fontSize: "11px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontWeight: "900", color: PRIMARY, fontSize: '24px', lineHeight: '1.2' },

  tableWrapper: {
    background: '#fff',
    borderTop: `1px solid ${BORDER}`,
    boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.05)",
    position: "relative"
  },

  mobileCard: { background: '#fff', borderRadius: '18px', border: `1px solid ${BORDER}`, overflow: 'hidden', cursor: 'pointer' },
  mobileCardHeader: { padding: '15px', display: 'flex', alignItems: 'center' },
  idHash: { fontFamily: 'monospace', color: PRIMARY, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', width: 'fit-content', fontWeight: '700' },
  modeBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' },

  table: { width: "100%", borderCollapse: "collapse", background: '#fff' },
  stickyThead: { position: 'sticky', top: "125px", zIndex: 30, background: '#f8fafc' }, // Adjusted for topBar + toggleBar
  thRow: { background: "#f8fafc", borderBottom: `2px solid ${BORDER}` },

  clickableTh: {
    padding: "15px 20px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "900",
    color: "#000",
    cursor: "pointer",
    userSelect: "none"
  },

  thContent: { display: "flex", alignItems: "center", gap: "6px" },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: 'background 0.2s', ':hover': { background: '#f8fafc' } },
  td: { padding: "15px 20px", fontSize: "14px", fontWeight: "600", color: '#334155' },

  cancelBtn: { background: "#fee2e2", color: DANGER, border: "none", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" },
  timerBadge: { background: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" },

  bigPrintBtn: { background: "#000", color: "#fff", border: "none", padding: "12px", borderRadius: "12px", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", marginBottom: '10px' },

  // MODAL STYLES
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
  modalHeader: { padding: '20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' },
  modalTitle: { fontSize: '18px', fontWeight: '900', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
  modalFooter: { padding: '20px', borderTop: `1px solid ${BORDER}`, background: '#fff' },

  detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' },
  detailLabel: { color: '#64748b', fontWeight: '600' },
  detailValue: { fontWeight: '800', color: '#0f172a' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#334155' },

  warningIconWrapper: { background: '#fef2f2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' },
  modalDesc: { fontSize: '14px', color: '#64748b', marginBottom: '25px' },
  modalActions: { display: 'flex', gap: '10px' },
  btnCancel: { flex: 1, padding: '12px', border: `1px solid ${BORDER}`, background: '#fff', borderRadius: '12px', fontWeight: '800' },
  btnConfirmDelete: { flex: 1, padding: '12px', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: '800' },

  actionRow: { display: 'flex', gap: '10px', width: '100%', height: '48px', marginTop: '10px' },
  flexButtonWrapper: { flex: 1, display: 'flex', height: '100%' },
  connectBtn: { background: PRIMARY, color: "#fff", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  connectedBadge: { background: "#10b981", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  checkoutTodayBtn: { color: "#fff", border: "none", borderRadius: "12px", fontWeight: "800", fontSize: "12px", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  disconnectBtn: { background: "#fee2e2", color: DANGER, border: "none", padding: '0 14px', borderRadius: "12px", height: '100%' },
  logoutBtn: { color: DANGER, border: `1.5px solid ${DANGER}`, background: 'none', borderRadius: "10px", fontWeight: "800", fontSize: "12px" },

  viewBtn: { background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', color: '#475569', cursor: 'pointer' },

  loader: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: PRIMARY, fontWeight: '800' }
};

export default BillingHistory;