import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  ArrowLeft, Search, Calendar, Download,
  ArrowRight, RotateCcw, Building2, Layers,
  X, TrendingUp, MapPin, ShoppingBag, ChevronRight, FileText
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";
const COLORS = [PRIMARY, "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0ea5e9", "#f472b6", "#64748b", "#fbbf24", "#4ade80"];

function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("store");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [rawData, setRawData] = useState({ store: [], billItems: [], invoices: [], invoiceItems: [] });
  const [selectedBill, setSelectedBill] = useState(null);
  const [currentBillItems, setCurrentBillItems] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bills, bItems, invs, iItems] = await Promise.all([
      supabase.from("bills_generated").select("*").order("created_at", { ascending: false }),
      supabase.from("bills_items_generated").select("bill_id, item_name, qty, price"),
      supabase.from("invoices").select("*, profiles(franchise_id, branch_location, address)").order("created_at", { ascending: false }),
      supabase.from("invoice_items").select("invoice_id, item_name, quantity, price")
    ]);

    setRawData({
      store: bills.data || [],
      billItems: bItems.data || [],
      invoices: invs.data || [],
      invoiceItems: iItems.data || []
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  const resetFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setSelectedFranchise("all");
  };

  const openDetails = async (bill) => {
    setSelectedBill(bill);
    setModalLoading(true);
    const isStore = activeTab === "store";
    const { data } = await supabase
      .from(isStore ? "bills_items_generated" : "invoice_items")
      .select("*")
      .eq(isStore ? "bill_id" : "invoice_id", bill.id);

    setCurrentBillItems(data || []);
    setModalLoading(false);
  };

  const filteredData = useMemo(() => {
    const dataSet = activeTab === "store" ? rawData.store : rawData.invoices;
    if (!dataSet.length) return [];

    return dataSet.filter(item => {
      const franchiseId = (item.franchise_id || item.profiles?.franchise_id || "").toString().toLowerCase();
      const customer = (item.customer_name || "").toLowerCase();
      const itemId = (item.id || "").toString().toLowerCase();
      const s = search.toLowerCase();

      const matchesSearch = !search || franchiseId.includes(s) || customer.includes(s) || itemId.includes(s);
      const matchesFranchise = selectedFranchise === "all" || franchiseId === selectedFranchise.toLowerCase();

      const itemDate = item.created_at?.split('T')[0];
      let matchesDate = true;
      if (startDate && endDate) {
        matchesDate = itemDate >= startDate && itemDate <= endDate;
      } else if (startDate) {
        matchesDate = itemDate === startDate;
      }

      return matchesSearch && matchesFranchise && matchesDate;
    });
  }, [activeTab, rawData, search, selectedFranchise, startDate, endDate]);

  const itemPieData = useMemo(() => {
    const validIds = new Set(filteredData.map(b => b.id));
    const itemsToProcess = activeTab === "store" ? rawData.billItems : rawData.invoiceItems;
    const key = activeTab === "store" ? "bill_id" : "invoice_id";
    const counts = {};

    itemsToProcess.forEach(item => {
      if (!validIds.has(item[key])) return;
      const q = Number(item.qty || item.quantity || 0);
      counts[item.item_name] = (counts[item.item_name] || 0) + q;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData, activeTab, rawData]);

  const chartData = useMemo(() => {
    const daily = {};
    const sorted = [...filteredData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    sorted.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daily[date] = (daily[date] || 0) + Number(item.total || item.total_amount || 0);
    });
    return Object.entries(daily).map(([name, revenue]) => ({ name, revenue }));
  }, [filteredData]);

  const franchiseList = useMemo(() => {
    const set = new Set();
    rawData.store.forEach(i => i.franchise_id && set.add(i.franchise_id));
    rawData.invoices.forEach(i => i.profiles?.franchise_id && set.add(i.profiles.franchise_id));
    return Array.from(set);
  }, [rawData]);

  const totalMoney = filteredData.reduce((acc, curr) => acc + Number(curr.total || curr.total_amount || 0), 0);

  if (loading) return <div style={styles.loader}>Loading Reports...</div>;

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, padding: isMobile ? "20px 15px" : "40px 20px" }}>

        <header style={{ ...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0' }}>
          <div style={{ display: 'flex', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} />{!isMobile && <span>Back</span>}</button>
            {isMobile && <button style={styles.exportBtn} onClick={() => window.print()}><Download size={18} /></button>}
          </div>
          <h1 style={{ ...styles.centerTitle, position: isMobile ? 'static' : 'absolute', transform: isMobile ? 'none' : 'translateX(-50%)', fontSize: isMobile ? '20px' : '22px' }}>Sales Reports</h1>
          {!isMobile && <button style={styles.exportBtn} onClick={() => window.print()}><Download size={18} /><span>PRINT</span></button>}
        </header>

        <div style={styles.toggleContainer}>
          <div style={{ ...styles.toggleTrack, gap: isMobile ? '15px' : '30px' }}>
            <button onClick={() => setActiveTab("store")} style={{ ...styles.toggleBtn, fontSize: isMobile ? '11px' : '13px', color: activeTab === "store" ? "#000" : "#9ca3af" }}>Daily Shop Sales {activeTab === "store" && <div style={styles.activeIndicator} />}</button>
            <button onClick={() => setActiveTab("invoice")} style={{ ...styles.toggleBtn, fontSize: isMobile ? '11px' : '13px', color: activeTab === "invoice" ? "#000" : "#9ca3af" }}>Main Supply Bills {activeTab === "invoice" && <div style={styles.activeIndicator} />}</button>
          </div>
        </div>

        <div style={{ ...styles.crazyFilterBar, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', flex: 1 }}>
            <div style={styles.filterGroup}><Search size={18} color="#9ca3af" /><input style={styles.filterInput} placeholder="Search name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div style={styles.filterGroup}><Building2 size={18} color="#9ca3af" />
              <select style={styles.selectInput} value={selectedFranchise} onChange={(e) => setSelectedFranchise(e.target.value)}>
                <option value="all">All Shops</option>
                {franchiseList.map(f => <option key={f} value={f}>Shop ID: {f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ ...styles.dateGroup, width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={18} color="#9ca3af" />
              <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {!isMobile && <ArrowRight size={14} color="#9ca3af" />}
              <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button style={styles.resetBtn} onClick={resetFilters}><RotateCcw size={16} /></button>
          </div>
        </div>

        {/* CHARTS ROW */}
        <div style={{ ...styles.vizRow, gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr' }}>
          <div style={styles.chartCard}>
            <div style={styles.vizHeader}><TrendingUp size={16} color={PRIMARY} /><span>Earnings Graph</span></div>
            <div style={{ height: isMobile ? '240px' : '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={3} fill={PRIMARY} fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.pieCard}>
            <div style={styles.vizHeader}><ShoppingBag size={16} color={PRIMARY} /><span>Top Selling</span></div>
            <div style={{ height: isMobile ? '160px' : '180px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={itemPieData} innerRadius={isMobile ? 35 : 45} outerRadius={isMobile ? 55 : 65} paddingAngle={5} dataKey="value">
                    {itemPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.miniTableScroll}>
              <table style={styles.miniTable}>
                <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Sold</th></tr></thead>
                <tbody>{itemPieData.map((item, i) => (<tr key={i}><td>{item.name}</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.value}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* LIST SECTION */}
        <div style={styles.tableCard}>
          <div style={styles.vizHeader}><Layers size={16} color={PRIMARY} /><span>Sales History</span></div>

          {isMobile ? (
            /* MOBILE LIST VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No records found.</div>
              ) : filteredData.map(item => (
                <div key={item.id} style={styles.mobileRecordCard} onClick={() => openDetails(item)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <code style={styles.code}>#{item.id.toString().slice(-8)}</code>
                    <span style={{ fontWeight: '900', color: PRIMARY, fontSize: '15px' }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                      <Building2 size={12} /> {item.franchise_id || item.profiles?.franchise_id || "Head Office"}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>{new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DESKTOP TABLE VIEW */
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={{ ...styles.th, width: '25%' }}>Bill No.</th>
                    <th style={{ ...styles.th, width: '30%' }}>From Shop</th>
                    <th style={{ ...styles.th, width: '25%' }}>Date</th>
                    <th style={{ ...styles.th, width: '20%', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No records found.</td></tr>
                  ) : filteredData.map(item => (
                    <tr key={item.id} style={styles.tr} onClick={() => openDetails(item)}>
                      <td style={styles.td}><code style={styles.code}>#{item.id.toString().slice(-8)}</code></td>
                      <td style={styles.td}>{item.franchise_id || item.profiles?.franchise_id || "Head Office"}</td>
                      <td style={styles.td}>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800', color: PRIMARY }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...styles.footerSummary, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '40px', textAlign: isMobile ? 'center' : 'left' }}>
          <div>
            <p style={styles.mLabel}>Earnings Period</p>
            <h2 style={{ ...styles.mValue, fontSize: isMobile ? '20px' : '24px' }}>₹ {totalMoney.toLocaleString('en-IN')}</h2>
          </div>
          <div>
            <p style={styles.mLabel}>Bills Found</p>
            <h2 style={{ ...styles.mValue, fontSize: isMobile ? '20px' : '24px' }}>{filteredData.length}</h2>
          </div>
        </div>
      </div>

      {/* MODAL - RESPONSIVE */}
      {selectedBill && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBill(null)}>
          <div style={{ ...styles.modal, width: isMobile ? '95%' : '450px', padding: isMobile ? '20px' : '30px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div><h3 style={{ margin: 0, fontWeight: '900', color: '#000', fontSize: '18px' }}>Bill Details</h3><p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>Ref: {selectedBill.id.toString().slice(0, 12)}...</p></div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedBill(null)} />
            </div>

            <div style={styles.modalBody}>
              <div style={{ ...styles.infoStrip, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px' }}>
                <div style={styles.infoCol}><label style={styles.label}>Shop / Person</label><p style={styles.pText}>{selectedBill.customer_name || selectedBill.profiles?.branch_location || "Walk-in Shop"}</p></div>
                <div style={styles.infoCol}><label style={styles.label}>Shop ID</label><p style={styles.pText}>{selectedBill.franchise_id || selectedBill.profiles?.franchise_id || "N/A"}</p></div>
              </div>
              <div style={styles.addressBox}><MapPin size={12} /><p style={{ margin: 0, fontSize: '11px' }}>{selectedBill.customer_address || selectedBill.profiles?.address || "At Counter"}</p></div>

              <div style={styles.itemTableWrapper}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead style={{ background: '#f9fafb' }}><tr style={{ borderBottom: `1px solid ${BORDER}` }}><th style={{ ...styles.modalTh, width: '55%' }}>Item</th><th style={{ ...styles.modalThCenter, width: '15%' }}>Qty</th><th style={{ ...styles.modalThRight, width: '30%' }}>Price</th></tr></thead>
                  <tbody>
                    {modalLoading ? <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>Loading...</td></tr> : currentBillItems.map(i => (
                      <tr key={i.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={styles.modalTd}>{i.item_name}</td>
                        <td style={styles.modalTdCenter}>{i.qty || i.quantity}</td>
                        <td style={styles.modalTdRight}>₹{((i.qty || i.quantity) * i.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...styles.footerRow, fontWeight: '900', color: PRIMARY, fontSize: isMobile ? '16px' : '18px', borderTop: `2px solid ${PRIMARY}`, paddingTop: '10px' }}>
                <span>Total Amount</span><span>₹{Number(selectedBill.total || selectedBill.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", position: "relative" },
  centerTitle: { fontWeight: "900", color: "#000", letterSpacing: "-1px" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer" },
  exportBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontSize: "11px", fontWeight: "800", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '8px' },
  toggleContainer: { display: 'flex', justifyContent: 'center', marginBottom: '35px' },
  toggleTrack: { display: 'flex', borderBottom: `2px solid ${BORDER}` },
  toggleBtn: { background: 'none', border: 'none', padding: '15px 5px', fontWeight: '900', cursor: 'pointer', position: 'relative' },
  activeIndicator: { position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', background: PRIMARY, borderRadius: '10px' },
  crazyFilterBar: { display: 'flex', gap: '15px', background: '#f9fafb', padding: '15px', borderRadius: '16px', border: `1.5px solid ${BORDER}`, marginBottom: '30px' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '0 12px', flex: 1 },
  filterInput: { border: 'none', background: 'none', padding: '10px 0', outline: 'none', fontSize: '13px', width: '100%', fontWeight: '600' },
  selectInput: { border: 'none', background: 'none', padding: '10px 0', outline: 'none', fontSize: '13px', width: '100%', fontWeight: '700', cursor: 'pointer', color: PRIMARY },
  dateGroup: { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '0 12px' },
  dateInput: { border: 'none', outline: 'none', fontSize: '11px', fontWeight: '700', color: PRIMARY, padding: '10px 0' },
  resetBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' },
  vizRow: { display: 'grid', gap: '25px', marginBottom: '30px' },
  chartCard: { background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '24px', padding: '25px' },
  pieCard: { background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '24px', padding: '25px' },
  vizHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: '900', color: '#9ca3af', marginBottom: '20px', textTransform: 'uppercase' },
  miniTableScroll: { maxHeight: '160px', overflowY: 'auto', marginTop: '10px' },
  miniTable: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
  tableCard: { background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '24px', padding: '25px' },
  tableScroll: { maxHeight: '350px', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thRow: { borderBottom: `1px solid ${BORDER}` },
  th: { textAlign: 'left', fontSize: '10px', fontWeight: '900', color: '#9ca3af', padding: '15px 12px' },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' },
  td: { padding: '15px 12px', fontSize: '13px', fontWeight: '600' },
  code: { background: '#f3f4f6', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  footerSummary: { display: 'flex', background: '#f9fafb', border: `1px solid ${BORDER}`, borderRadius: '24px', padding: '30px', marginTop: '30px' },
  mLabel: { fontSize: '11px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', margin: 0 },
  mValue: { fontWeight: '900', color: PRIMARY, margin: '5px 0 0 0' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' },
  modal: { background: '#fff', borderRadius: '24px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '10px' },
  infoStrip: { display: 'flex', marginBottom: '15px' },
  label: { fontSize: '8px', fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase' },
  pText: { margin: 0, fontWeight: '800', fontSize: '13px' },
  addressBox: { display: 'flex', gap: '8px', background: '#f9fafb', padding: '10px', borderRadius: '8px', marginBottom: '15px', color: '#6b7280' },
  itemTableWrapper: { border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '15px' },
  modalTh: { fontSize: '9px', padding: '10px 12px', textAlign: 'left', color: '#9ca3af' },
  modalThCenter: { fontSize: '9px', padding: '10px 12px', textAlign: 'center', color: '#9ca3af' },
  modalThRight: { fontSize: '9px', padding: '10px 12px', textAlign: 'right', color: '#9ca3af' },
  modalTd: { fontSize: '12px', padding: '12px', fontWeight: '700' },
  modalTdCenter: { fontSize: '12px', padding: '12px', textAlign: 'center' },
  modalTdRight: { fontSize: '12px', padding: '12px', textAlign: 'right' },
  footerRow: { display: 'flex', justifyContent: 'space-between' },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", color: PRIMARY },

  // MOBILE SPECIFIC
  mobileRecordCard: { background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: '16px', padding: '15px', transition: 'all 0.2s' }
};

export default Reports;