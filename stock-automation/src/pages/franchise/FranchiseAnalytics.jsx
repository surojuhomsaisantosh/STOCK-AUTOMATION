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
  
  // New state for the Franchise Profile
  const [franchiseId, setFranchiseId] = useState("...");

  useEffect(() => {
    fetchFranchiseProfile();
    fetchData();
  }, [activeTab, startDate, endDate, dateRangeMode]);

  // Fetches the Franchise ID directly from the profiles table
  const fetchFranchiseProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("franchise_id")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setFranchiseId(data.franchise_id);
      }
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
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
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
      <nav style={styles.navBar}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={styles.headerTitle}>Analysis</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={styles.franchiseBadge}>
            <Store size={14} color={PRIMARY} />
            <span style={styles.franchiseLabel}>
              Franchise ID: <span style={styles.franchiseValue}>{franchiseId}</span>
            </span>
          </div>
        </div>
      </nav>

      <div style={styles.container}>
        <div style={styles.centerWrapper}>
          <div style={styles.toggleBar}>
            <button onClick={() => setActiveTab("store")} style={{ ...styles.tab, ...(activeTab === "store" ? styles.activeTab : {}) }}>Store Analysis</button>
            <button onClick={() => setActiveTab("invoice")} style={{ ...styles.tab, ...(activeTab === "invoice" ? styles.activeTab : {}) }}>Orders Analysis</button>
          </div>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.leftFilterGroup}>
            <div style={styles.miniToggle}>
              <button onClick={() => setDateRangeMode("single")} style={dateRangeMode === "single" ? styles.miniTabActive : styles.miniTab}>Single</button>
              <button onClick={() => setDateRangeMode("range")} style={dateRangeMode === "range" ? styles.miniTabActive : styles.miniTab}>Range</button>
            </div>
            <div style={styles.dateInputs}>
              <Calendar size={14} color="#6b7280" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
              {dateRangeMode === "range" && <><span style={{color: '#d1d5db'}}>—</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} /></>}
            </div>
          </div>
        </div>

        {loading ? <div style={styles.loader}>Synchronizing Data...</div> : (
          <div style={styles.dashboardGrid}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Revenue Trend</h3>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData}>
                    <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2}/><stop offset="95%" stopColor={PRIMARY} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={3} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Top 10 Items</h3>
              <div style={{ height: "180px", width: "100%", marginBottom: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topItems} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5}>
                      {topItems.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.topItemsList}>
                {topItems.map((item, index) => (
                  <div key={index} style={styles.topItemRow}>
                    <span style={{ width: 25, color: COLORS[index % COLORS.length], fontWeight: 900 }}>{index + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: '#334155' }}>{item.name}</span>
                    <span style={{ fontWeight: 800 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...styles.chartCard, gridColumn: "span 2" }}>
              <h3 style={styles.chartTitle}>{activeTab === "store" ? "Generated Bills" : "Stock Invoices"}</h3>
              <div style={styles.listContainer}>
                <div style={styles.tableHead}>
                  <span style={styles.col1}>Franchise ID</span>
                  <span style={styles.col2}>Timestamp</span>
                  <span style={styles.col3}>Amount</span>
                  <span style={{ width: 18 }} />
                </div>
                
                {bills.map(bill => (
                  <div key={bill.id} style={styles.billRow} onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                    <div style={styles.billMain}>
                      <span style={{ ...styles.idTxt, ...styles.col1 }}>
                        <Hash size={12} color={PRIMARY} /> 
                        {bill.profiles?.franchise_id || bill.franchise_id || "N/A"}
                      </span>

                      <div style={{ ...styles.dateTimeContainer, ...styles.col2 }}>
                        <span style={styles.dateTxt}>
                          {new Date(bill.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                        </span>
                        <span style={styles.timeHeaderTxt}>
                          <Clock size={10} style={{marginRight: 4}} />
                          {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>

                      <div style={{ ...styles.rightInfo, ...styles.col3 }}>
                        <span style={styles.amtTxt}>₹{Number(bill.total ?? bill.total_amount ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                      {expandedBill === bill.id ? <ChevronDown size={18} color={PRIMARY} /> : <ChevronRight size={18} color="#d1d5db" />}
                    </div>

                    {expandedBill === bill.id && (
                      <div style={styles.popupInner}>
                        <div style={styles.popupHeader}>Order Items Breakdown</div>
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
       <div style={styles.itemLineHeader}>
          <span style={{ flex: 2 }}>Item Name</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Quantity</span>
          <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
       </div>
      {items.map((i, idx) => {
        const qty = Number(i.qty ?? i.quantity ?? 0);
        const price = Number(i.price ?? 0);
        return (
          <div key={idx} style={styles.itemLine}>
            <span style={{ fontWeight: 600, flex: 2, color: '#1e293b' }}>{i.item_name}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#64748b' }}>{qty}</span>
            <span style={{ fontWeight: 700, flex: 1, textAlign: 'right', color: '#0f172a' }}>₹{(qty * price).toLocaleString('en-IN')}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: '"Inter", sans-serif' },
  navBar: { 
    padding: "0 40px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    background: "#fff", 
    borderBottom: "1px solid #e2e8f0", 
    position: 'sticky', 
    top: 0, 
    zIndex: 10,
    height: "70px"
  },
  backBtn: { border: "none", background: "none", cursor: "pointer", color: PRIMARY, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '16px', color: '#1e293b', margin: 0 },
  franchiseBadge: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    background: '#f0fdf4', 
    padding: '8px 16px', 
    borderRadius: '12px', 
    border: `1px solid #dcfce7` 
  },
  franchiseLabel: { fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' },
  franchiseValue: { color: PRIMARY, fontWeight: 900 },
  container: { maxWidth: 1100, margin: "auto", padding: '30px 20px' },
  centerWrapper: { display: "flex", justifyContent: "center", marginBottom: 30 },
  toggleBar: { background: "#f1f5f9", padding: 4, borderRadius: 12, display: "flex" },
  tab: { padding: "8px 20px", border: "none", background: "none", cursor: "pointer", borderRadius: 8, fontWeight: 600, color: '#64748b', transition: '0.2s' },
  activeTab: { background: "#fff", color: PRIMARY, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  filterRow: { marginBottom: 25 },
  leftFilterGroup: { display: "flex", gap: 12, alignItems: 'center' },
  miniToggle: { display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2 },
  miniTab: { border: "none", background: "none", fontSize: '11px', fontWeight: 600, color: '#64748b', padding: '6px 12px', cursor: 'pointer' },
  miniTabActive: { background: "#fff", color: PRIMARY, fontSize: '11px', fontWeight: 700, borderRadius: 6, padding: '6px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  dateInputs: { display: "flex", gap: 8, alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px' },
  input: { border: "none", outline: 'none', fontSize: '12px', fontWeight: 600, color: '#1e293b' },
  dashboardGrid: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 },
  chartCard: { background: "#fff", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  chartTitle: { fontWeight: 800, marginBottom: 20, fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' },
  col1: { flex: 1.5 },
  col2: { flex: 1.2, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right', paddingRight: 10 },
  tableHead: { display: 'flex', padding: '0 24px 12px 24px', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' },
  listContainer: { display: "flex", flexDirection: "column", gap: 10 },
  billRow: { border: "1px solid #f1f5f9", borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#fff', transition: '0.2s' },
  billMain: { padding: '14px 24px', display: "flex", alignItems: 'center' },
  idTxt: { fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, color: '#334155' },
  dateTimeContainer: { display: 'flex', flexDirection: 'column', gap: 2 },
  dateTxt: { fontSize: '12px', fontWeight: 600, color: '#1e293b' },
  timeHeaderTxt: { fontSize: '10px', fontWeight: 500, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rightInfo: { display: "flex", justifyContent: 'flex-end', alignItems: 'center' },
  amtTxt: { fontWeight: 800, color: PRIMARY, fontSize: '15px' },
  popupInner: { padding: '20px 24px', borderTop: "1px solid #f1f5f9", background: '#f8fafc' },
  popupHeader: { fontWeight: 800, marginBottom: 12, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  itemsTable: { display: "flex", flexDirection: "column", gap: 4 },
  itemLineHeader: { display: 'flex', padding: '0 12px 8px 12px', fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' },
  itemLine: { display: "flex", alignItems: "center", fontSize: 12, background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' },
  topItemsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  topItemRow: { display: 'flex', alignItems: 'center', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' },
  loader: { textAlign: "center", padding: 100, fontWeight: 700, color: PRIMARY }
};

export default FranchiseAnalytics;