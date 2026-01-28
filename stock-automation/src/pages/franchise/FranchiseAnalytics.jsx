import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ArrowLeft, Calendar, ChevronRight, ChevronDown,
  Hash, Clock, Store
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const PRIMARY = "#065f46";
const COLORS = ["#065f46", "#0ea5e9", "#f59e0b", "#be185d", "#8b5cf6", "#10b981", "#f43f5e", "#6366f1", "#d946ef", "#047857"];

function FranchiseAnalytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("store");
  const [dateRangeMode, setDateRangeMode] = useState("single");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(startDate);
  const [graphData, setGraphData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [franchiseId, setFranchiseId] = useState("...");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchFranchiseProfile();
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, startDate, endDate, dateRangeMode]);

  const fetchFranchiseProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setFranchiseId(data.franchise_id);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const isStore = activeTab === "store";
      const table = isStore ? "bills_generated" : "invoices";
      let query = isStore
        ? supabase.from(table).select("*")
        : supabase.from(table).select("*, profiles:created_by(franchise_id)");

      query = query.order("created_at", { ascending: false });
      if (dateRangeMode === "single") {
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${startDate}T23:59:59`);
      } else {
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBills(data || []);

      const map = {};
      (data || []).forEach(r => {
        const dateKey = new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        map[dateKey] = (map[dateKey] || 0) + Number(r.total ?? r.total_amount ?? 0);
      });
      setGraphData(Object.entries(map).map(([date, sales]) => ({ date, sales })).reverse());
      fetchTopItems((data || []).map(d => d.id));
    } catch (err) { console.error(err.message); } finally { setLoading(false); }
  };

  const fetchTopItems = async (ids) => {
    if (!ids.length) { setTopItems([]); return; }
    const table = activeTab === "store" ? "bills_items_generated" : "invoice_items";
    const key = activeTab === "store" ? "bill_id" : "invoice_id";
    const { data } = await supabase.from(table).select("*").in(key, ids);
    const agg = {};
    (data || []).forEach(i => {
      const q = Number(i.qty ?? i.quantity ?? 0);
      agg[i.item_name] = (agg[i.item_name] || 0) + q;
    });
    setTopItems(Object.entries(agg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10));
  };

  return (
    <div style={styles.page}>
      <nav style={{ ...styles.navBar, padding: isMobile ? "0 15px" : "0 40px" }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={18} /> {isMobile ? "" : "Back"}</button>
        <h1 style={{ ...styles.headerTitle, fontSize: isMobile ? '14px' : '16px' }}>Analytics</h1>
        <div style={styles.franchiseBadge}>
          <Store size={14} color={PRIMARY} />
          {!isMobile && <span style={styles.franchiseLabel}>Franchise: </span>}
          <span style={styles.franchiseValue}>{franchiseId}</span>
        </div>
      </nav>

      <div style={{ ...styles.container, padding: isMobile ? '15px' : '30px 20px' }}>
        <div style={styles.centerWrapper}>
          <div style={styles.toggleBar}>
            <button onClick={() => setActiveTab("store")} style={{ ...styles.tab, ...(activeTab === "store" ? styles.activeTab : {}) }}>Store</button>
            <button onClick={() => setActiveTab("invoice")} style={{ ...styles.tab, ...(activeTab === "invoice" ? styles.activeTab : {}) }}>Orders</button>
          </div>
        </div>

        <div style={{ ...styles.filterRow, flexDirection: isMobile ? 'column' : 'row', gap: '15px' }}>
          <div style={styles.miniToggle}>
            <button onClick={() => setDateRangeMode("single")} style={dateRangeMode === "single" ? styles.miniTabActive : styles.miniTab}>Single</button>
            <button onClick={() => setDateRangeMode("range")} style={dateRangeMode === "range" ? styles.miniTabActive : styles.miniTab}>Range</button>
          </div>
          <div style={styles.dateInputs}>
            <Calendar size={14} color="#6b7280" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
            {dateRangeMode === "range" && <><span style={{ color: '#d1d5db' }}>—</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} /></>}
          </div>
        </div>

        {loading ? <div style={styles.loader}>Synchronizing...</div> : (
          <div style={{ ...styles.dashboardGrid, gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr" }}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Revenue Trend</h3>
              <div style={{ height: isMobile ? "200px" : "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData}>
                    <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} /><stop offset="95%" stopColor={PRIMARY} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={3} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Top Items</h3>
              <div style={{ height: "150px", width: "100%", marginBottom: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topItems} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                      {topItems.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.topItemsList}>
                {topItems.slice(0, 5).map((item, index) => (
                  <div key={index} style={styles.topItemRow}>
                    <span style={{ flex: 1, fontSize: '11px', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontWeight: 800 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...styles.chartCard, gridColumn: isMobile ? "auto" : "span 2" }}>
              <h3 style={styles.chartTitle}>Transaction Logs</h3>
              <div style={styles.listContainer}>
                {bills.map(bill => (
                  <div key={bill.id} style={styles.billRow} onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                    <div style={{ ...styles.billMain, padding: isMobile ? '12px' : '14px 24px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.idTxt}><Hash size={12} color={PRIMARY} /> {bill.profiles?.franchise_id || bill.franchise_id || "N/A"}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: '10px' }}>
                        <div style={styles.amtTxt}>₹{Number(bill.total ?? bill.total_amount ?? 0).toLocaleString()}</div>
                      </div>
                      {expandedBill === bill.id ? <ChevronDown size={18} color={PRIMARY} /> : <ChevronRight size={18} color="#d1d5db" />}
                    </div>
                    {expandedBill === bill.id && (
                      <div style={{ ...styles.popupInner, padding: isMobile ? '15px' : '20px 24px' }}>
                        <BillItems billId={bill.id} type={activeTab} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BillItems({ billId, type }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const fetch = async () => {
      const table = type === "store" ? "bills_items_generated" : "invoice_items";
      const key = type === "store" ? "bill_id" : "invoice_id";
      const { data } = await supabase.from(table).select("*").eq(key, billId);
      setItems(data || []);
    };
    fetch();
  }, [billId, type]);

  return (
    <div style={styles.itemsTable}>
      {items.map((i, idx) => (
        <div key={idx} style={styles.itemLine}>
          <span style={{ fontWeight: 600, flex: 2 }}>{i.item_name}</span>
          <span style={{ flex: 1, textAlign: 'center' }}>x{i.qty ?? i.quantity}</span>
          <span style={{ fontWeight: 700, flex: 1, textAlign: 'right' }}>₹{(Number(i.qty ?? i.quantity) * Number(i.price)).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: '"Inter", sans-serif' },
  navBar: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderBottom: "1px solid #e2e8f0", position: 'sticky', top: 0, zIndex: 10, height: "70px" },
  backBtn: { border: "none", background: "none", cursor: "pointer", color: PRIMARY, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e293b', margin: 0 },
  franchiseBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '6px 12px', borderRadius: '10px' },
  franchiseLabel: { fontSize: '11px', fontWeight: 700, color: '#166534' },
  franchiseValue: { color: PRIMARY, fontWeight: 900, fontSize: '12px' },
  container: { maxWidth: 1100, margin: "auto" },
  centerWrapper: { display: "flex", justifyContent: "center", marginBottom: 20 },
  toggleBar: { background: "#f1f5f9", padding: 4, borderRadius: 12, display: "flex" },
  tab: { padding: "8px 16px", border: "none", background: "none", cursor: "pointer", borderRadius: 8, fontWeight: 600, color: '#64748b', fontSize: '13px' },
  activeTab: { background: "#fff", color: PRIMARY, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  filterRow: { marginBottom: 20, display: 'flex' },
  miniToggle: { display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2 },
  miniTab: { border: "none", background: "none", fontSize: '11px', fontWeight: 600, color: '#64748b', padding: '6px 10px' },
  miniTabActive: { background: "#fff", color: PRIMARY, fontSize: '11px', fontWeight: 700, borderRadius: 6, padding: '6px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  dateInputs: { display: "flex", gap: 8, alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px' },
  input: { border: "none", outline: 'none', fontSize: '11px', fontWeight: 600 },
  dashboardGrid: { display: "grid", gap: 15 },
  chartCard: { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" },
  chartTitle: { fontWeight: 800, marginBottom: 15, fontSize: '10px', textTransform: 'uppercase', color: '#64748b' },
  listContainer: { display: "flex", flexDirection: "column", gap: 8 },
  billRow: { border: "1px solid #f1f5f9", borderRadius: 10, background: '#fff' },
  billMain: { display: "flex", alignItems: "center" },
  idTxt: { fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 },
  amtTxt: { fontWeight: 800, color: PRIMARY, fontSize: '14px' },
  popupInner: { borderTop: "1px solid #f1f5f9", background: '#f8fafc' },
  itemsTable: { display: "flex", flexDirection: "column", gap: 4 },
  itemLine: { display: "flex", alignItems: "center", fontSize: 11, background: '#fff', padding: '8px', borderRadius: '6px' },
  topItemsList: { display: 'flex', flexDirection: 'column', gap: 5 },
  topItemRow: { display: 'flex', alignItems: 'center', paddingBottom: '5px', borderBottom: '1px solid #f1f5f9' },
  loader: { textAlign: "center", padding: 50, fontWeight: 700, color: PRIMARY }
};

export default FranchiseAnalytics;