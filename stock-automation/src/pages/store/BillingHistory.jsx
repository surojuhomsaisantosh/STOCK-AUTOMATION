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
  X,
  LogOut
} from "lucide-react";

import { useBluetoothPrinter } from "../printer/BluetoothPrinter";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";
const BLACK = "#000000";

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

  if (isExpired) return (
    <div style={styles.expiredBox}>
      <span style={{ fontSize: '11px', fontWeight: '800' }}>CANCELLATION PERIOD ENDED</span>
    </div>
  );

  return (
    <button style={styles.cancelBtn} onClick={(e) => { e.stopPropagation(); onCancel(); }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle size={18} /> CANCEL ORDER
      </div>
      <div style={styles.timerBadge}>{formatTime(timeLeft)}</div>
    </button>
  );
};

function BillingHistory() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { connectPrinter, disconnectPrinter, printReceipt, isConnected, isConnecting } = useBluetoothPrinter();

  const [history, setHistory] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null);
  const [expandedBill, setExpandedBill] = useState(null);
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
  const todayDisplay = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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

        let query = supabase.from("bills_generated").select("*, bills_items_generated(*)").eq("franchise_id", franchiseId).eq("is_day_closed", false).order("created_at", { ascending: false });
        if (lastTime) query = query.gte("created_at", lastTime.toISOString());
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
        total: bill.total.toFixed(2),
        thankYouMsg: "*** DUPLICATE RECEIPT ***",
        items: bill.bills_items_generated.map(i => ({ name: i.item_name, qty: i.qty, subtotal: i.total.toFixed(2) }))
      });
    } catch (err) { alert("Reprint failed."); }
  };

  const confirmDelete = async () => {
    try {
      await supabase.from("bills_generated").delete().eq("id", billToDelete);
      setHistory(prev => prev.filter(b => b.id !== billToDelete));
      setBillToDelete(null);
      setExpandedBill(null);
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

  const sortedHistory = useMemo(() => {
    let items = [...history];
    items.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return items;
  }, [history, sortConfig]);

  const stats = useMemo(() => {
    const totalSales = history.reduce((sum, b) => sum + b.total, 0);
    const orderCount = history.length;
    return { totalSales, orderCount };
  }, [history]);

  if (loading || dataLoading) return <div style={styles.loader}><Loader2 className="animate-spin" size={40} /><span>Loading...</span></div>;

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={{ ...styles.topBar, padding: isMobile ? "10px 15px" : "15px 30px" }}>
        {!isMobile && <div style={{ flex: 1 }}></div>}
        <h1 style={{ ...styles.centerTitle, fontSize: isMobile ? "18px" : "22px" }}>BILLING HISTORY</h1>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={styles.franchiseLabel}>{franchiseId}</div>
        </div>
      </div>

      <div style={styles.fullToggleBar}>
        <button style={{ ...styles.toggleBtn, ...styles.inactiveToggle }} onClick={() => navigate("/store")}>NEW BILL</button>
        <button style={{ ...styles.toggleBtn, ...styles.activeToggle }}>HISTORY</button>
      </div>

      <div style={{ ...styles.historyContainer, padding: isMobile ? "15px" : "40px" }}>

        {/* SUMMARY SECTION */}
        <div style={styles.historyHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ ...styles.historyHeading, fontSize: isMobile ? '24px' : '32px' }}>Summary</h2>
              <p style={styles.dateText}>{todayDisplay}</p>
            </div>
            <button onClick={logout} style={{ ...styles.logoutBtn, padding: isMobile ? '8px 12px' : '10px 20px' }}>LOGOUT</button>
          </div>

          <div style={styles.statsRow}>
            <div style={{ ...styles.statBox, flex: 1 }}>
              <span style={styles.statLabel}>Revenue</span>
              <span style={{ ...styles.statValue, fontSize: isMobile ? '20px' : '26px' }}>₹{stats.totalSales.toFixed(2)}</span>
            </div>
            <div style={{ ...styles.statBox, flex: 1 }}>
              <span style={styles.statLabel}>Orders</span>
              <span style={{ ...styles.statValue, fontSize: isMobile ? '20px' : '26px' }}>{stats.orderCount}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: '10px' }}>
            <div style={styles.printerBar}>
              {isConnected ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button style={styles.connectedBadge}><Printer size={16} /> {isMobile ? "" : "CONNECTED"}</button>
                  <button onClick={disconnectPrinter} style={styles.disconnectBtn}><Unplug size={18} /></button>
                </div>
              ) : (
                <button onClick={connectPrinter} disabled={isConnecting} style={styles.connectBtn}>
                  {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                  {isMobile ? " CONNECT" : " CONNECT PRINTER"}
                </button>
              )}
            </div>
            <button onClick={() => canCheckout && setShowCheckoutModal(true)} disabled={!canCheckout}
              style={{ ...styles.checkoutTodayBtn, width: '100%', background: canCheckout ? PRIMARY : '#94a3b8', opacity: canCheckout ? 1 : 0.7 }}>
              {canCheckout ? "CHECKOUT FOR TODAY" : `SHIFT CLOSED (Next in ${timeLeft})`}
            </button>
          </div>
        </div>

        {/* LIST SECTION */}
        <div style={{ ...styles.tableWrapper, background: isMobile ? 'transparent' : '#fff' }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedHistory.map((bill) => {
                const isSelected = expandedBill === bill.id;
                return (
                  <div key={bill.id} style={styles.mobileCard}>
                    <div onClick={() => setExpandedBill(isSelected ? null : bill.id)} style={styles.mobileCardHeader}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '900', fontSize: '18px' }}>₹{bill.total.toFixed(2)}</div>
                        <div style={{ ...styles.modeBadge, background: bill.payment_mode === "CASH" ? "#f0fdf4" : "#eff6ff", color: bill.payment_mode === "CASH" ? PRIMARY : "#2563eb" }}>{bill.payment_mode}</div>
                      </div>
                      <div style={{ marginLeft: '10px' }}>
                        {isSelected ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isSelected && (
                      <div style={styles.mobileExpanded}>
                        <div style={{ padding: '15px 0', borderTop: '1px dashed #ddd' }}>
                          {bill.bills_items_generated?.map((item, idx) => (
                            <div key={idx} style={styles.mobileItemRow}>
                              <span>{item.qty} x {item.item_name}</span>
                              <span>₹{item.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button style={styles.bigPrintBtn} onClick={(e) => handleReprint(e, bill)}><Receipt size={18} /> REPRINT</button>
                          <CancelTimerButton createdAt={bill.created_at} onCancel={() => setBillToDelete(bill.id)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>S.NO</th>
                  <th style={styles.th}>BILL ID</th>
                  <th style={styles.th}>MODE</th>
                  <th style={styles.th}>AMOUNT</th>
                  <th style={styles.th}>TIME</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((bill, index) => (
                  <React.Fragment key={bill.id}>
                    <tr style={styles.tr} onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}><span style={styles.idHash}>#{bill.id.toString().slice(-6).toUpperCase()}</span></td>
                      <td style={styles.td}>{bill.payment_mode}</td>
                      <td style={{ ...styles.td, fontWeight: "900" }}>₹{bill.total.toFixed(2)}</td>
                      <td style={styles.td}>{new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                    {expandedBill === bill.id && (
                      <tr>
                        <td colSpan="5" style={{ background: '#f8fafc', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                              {bill.bills_items_generated.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <span>{item.item_name} (x{item.qty})</span>
                                  <span>₹{item.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginLeft: '40px', width: '200px' }}>
                              <button style={styles.bigPrintBtn} onClick={(e) => handleReprint(e, bill)}>PRINT</button>
                              <div style={{ marginTop: '10px' }}>
                                <CancelTimerButton createdAt={bill.created_at} onCancel={() => setBillToDelete(bill.id)} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODALS */}
      {(billToDelete || showCheckoutModal) && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, width: isMobile ? '90%' : '400px' }}>
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
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f9fafb", minHeight: "100vh", fontFamily: '"Inter", sans-serif' },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${BORDER}`, background: "#fff" },
  centerTitle: { fontWeight: "900", margin: 0, color: "#000" },
  franchiseLabel: { fontSize: "14px", fontWeight: "800", color: PRIMARY, background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px' },
  fullToggleBar: { display: "flex", width: "100%", padding: "8px", background: "#f3f4f6", borderBottom: `1px solid ${BORDER}` },
  toggleBtn: { flex: 1, padding: "16px", cursor: "pointer", fontWeight: "800", fontSize: "14px", border: "none", background: "#fff" },
  activeToggle: { color: PRIMARY, borderBottom: `4px solid ${PRIMARY}` },
  inactiveToggle: { color: "#6b7280" },
  historyContainer: { maxWidth: '1200px', margin: '0 auto' },
  historyHeader: { marginBottom: "20px", display: 'flex', flexDirection: 'column', gap: '15px' },
  historyHeading: { fontWeight: "900", color: "#000", margin: 0 },
  dateText: { margin: '5px 0 0 0', color: '#64748b', fontWeight: '700' },
  statsRow: { display: "flex", gap: "10px" },
  statBox: { background: "#fff", border: `1px solid ${BORDER}`, padding: "15px", borderRadius: "16px" },
  statLabel: { display: "block", fontSize: "11px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontWeight: "900", color: PRIMARY },
  tableWrapper: { borderRadius: "24px", overflow: "hidden" },
  mobileCard: { background: '#fff', borderRadius: '18px', border: `1px solid ${BORDER}`, overflow: 'hidden' },
  mobileCardHeader: { padding: '15px', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  mobileExpanded: { padding: '0 15px 15px 15px' },
  mobileItemRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#334155' },
  idHash: { fontFamily: 'monospace', color: PRIMARY, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', width: 'fit-content' },
  modeBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },
  table: { width: "100%", borderCollapse: "collapse", background: '#fff' },
  thRow: { background: "#f8fafc", borderBottom: `2px solid ${BORDER}` },
  th: { padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#64748b" },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: "pointer" },
  td: { padding: "15px 20px", fontSize: "14px", fontWeight: "700" },
  cancelBtn: { background: "#fee2e2", color: DANGER, border: "none", padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" },
  timerBadge: { background: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" },
  expiredBox: { padding: "12px", borderRadius: "12px", border: "1px dashed #ccc", color: "#999", textAlign: "center", fontSize: '11px' },
  bigPrintBtn: { background: "#000", color: "#fff", border: "none", padding: "12px", borderRadius: "12px", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '24px', textAlign: 'center' },
  warningIconWrapper: { background: '#fef2f2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' },
  modalTitle: { fontSize: '20px', fontWeight: '900', margin: '0 0 10px' },
  modalDesc: { fontSize: '14px', color: '#64748b', marginBottom: '25px' },
  modalActions: { display: 'flex', gap: '10px' },
  btnCancel: { flex: 1, padding: '12px', border: `1px solid ${BORDER}`, background: '#fff', borderRadius: '12px', fontWeight: '800' },
  btnConfirmDelete: { flex: 1, padding: '12px', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: '800' },
  printerBar: { display: 'flex', gap: '10px' },
  connectBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "8px 15px", borderRadius: "10px", fontWeight: "800", fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' },
  connectedBadge: { background: "#10b981", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "10px", fontWeight: "800", fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' },
  disconnectBtn: { background: "#fee2e2", color: DANGER, border: "none", padding: '8px 12px', borderRadius: "10px" },
  logoutBtn: { color: DANGER, border: `1.5px solid ${DANGER}`, background: 'none', borderRadius: "10px", fontWeight: "800", fontSize: "12px" },
  checkoutTodayBtn: { color: "#fff", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800", fontSize: "13px" },
  loader: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: PRIMARY, fontWeight: '800' }
};

export default BillingHistory;