import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ArrowLeft, Calendar, ChevronRight, ChevronDown,
  Hash, Clock, Download, AlertTriangle, AlertOctagon, CheckCircle2, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// --- CONSTANTS ---
const PRIMARY = "#065f46";
const EXCEL_GREEN = "#107c41";
const COLORS = ["#065f46", "#0ea5e9", "#f59e0b", "#be185d", "#8b5cf6", "#10b981", "#f43f5e", "#6366f1", "#d946ef", "#047857"];

// --- UTILITY: Safe Session Storage Setter ---
// Prevents the app from crashing if browser storage limit is reached
const safeSetSessionStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    console.warn("Session storage full. Clearing old cache...");
    sessionStorage.clear(); // Clear cache to make room
    try {
      sessionStorage.setItem(key, value); // Try saving again
    } catch (err) {
      console.error("Failed to save to session storage after clearing.");
    }
  }
};

function FranchiseAnalytics() {
  const navigate = useNavigate();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("analytics_activeTab") || "store");
  const [dateRangeMode, setDateRangeMode] = useState(() => sessionStorage.getItem("analytics_dateRangeMode") || "single");
  const [startDate, setStartDate] = useState(() => sessionStorage.getItem("analytics_startDate") || new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => sessionStorage.getItem("analytics_endDate") || new Date().toISOString().split("T")[0]);

  const [graphData, setGraphData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [loading, setLoading] = useState(false);

  const [franchiseId, setFranchiseId] = useState(() => sessionStorage.getItem("analytics_franchiseId") || "");

  const [oldestRecordDate, setOldestRecordDate] = useState(null);
  const [daysUntilDeletion, setDaysUntilDeletion] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    safeSetSessionStorage("analytics_activeTab", activeTab);
    safeSetSessionStorage("analytics_dateRangeMode", dateRangeMode);
    safeSetSessionStorage("analytics_startDate", startDate);
    safeSetSessionStorage("analytics_endDate", endDate);
  }, [activeTab, dateRangeMode, startDate, endDate]);

  useEffect(() => {
    if (!franchiseId) fetchFranchiseProfile();
  }, [franchiseId]);

  useEffect(() => {
    if (franchiseId) fetchOldestRecord();
  }, [franchiseId]);

  useEffect(() => {
    if (franchiseId) fetchData();
  }, [activeTab, startDate, endDate, dateRangeMode, franchiseId]);

  // --- DATA FETCHING ---
  const fetchFranchiseProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        if (data) {
          setFranchiseId(data.franchise_id);
          safeSetSessionStorage("analytics_franchiseId", data.franchise_id);
        }
      }
    } catch (e) { console.error("Profile Fetch Error", e); }
  };

  const fetchOldestRecord = async () => {
    const cacheKey = `analytics_oldest_${franchiseId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      setOldestRecordDate(parsed.date ? new Date(parsed.date) : null);
      setDaysUntilDeletion(parsed.days);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bills_generated")
        .select("created_at")
        .eq("franchise_id", franchiseId)
        .order("created_at", { ascending: true })
        .limit(1);

      let oDate = null;
      let dUntil = 45;

      if (data && data.length > 0) {
        oDate = new Date(data[0].created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oldestDay = new Date(oDate);
        oldestDay.setHours(0, 0, 0, 0);

        const ageInMs = today.getTime() - oldestDay.getTime();
        const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
        dUntil = 45 - ageInDays;
      }

      setOldestRecordDate(oDate);
      setDaysUntilDeletion(dUntil);
      safeSetSessionStorage(cacheKey, JSON.stringify({ date: oDate, days: dUntil }));

    } catch (err) { console.error("Error fetching oldest record:", err); }
  };

  const fetchData = async (forceRefresh = false) => {
    const cacheKey = `analytics_data_${franchiseId}_${activeTab}_${dateRangeMode}_${startDate}_${endDate}`;

    // Check cache only if we are NOT forcing a refresh
    if (!forceRefresh) {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setBills(parsed.bills);
        setGraphData(parsed.graphData);
        setTopItems(parsed.topItems);
        return;
      }
    }

    setLoading(true);
    try {
      const isStore = activeTab === "store";
      const table = isStore ? "bills_generated" : "invoices";

      let query = isStore
        ? supabase.from(table).select("*").eq("franchise_id", franchiseId)
        : supabase.from(table).select("*, profiles:created_by(franchise_id)");

      if (dateRangeMode === "single") {
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${startDate}T23:59:59`);
      } else {
        const finalEndDate = endDate || startDate;
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${finalEndDate}T23:59:59`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      const fetchedBills = data || [];
      const generatedGraph = processChartData(fetchedBills);

      const ids = fetchedBills.map(d => d.id);
      const generatedTopItems = ids.length > 0 ? await fetchTopItems(ids) : [];

      setBills(fetchedBills);
      setGraphData(generatedGraph);
      setTopItems(generatedTopItems);

      safeSetSessionStorage(cacheKey, JSON.stringify({
        bills: fetchedBills,
        graphData: generatedGraph,
        topItems: generatedTopItems
      }));

    } catch (err) {
      console.error("Fetch Error:", err.message);
      alert("Failed to load data. Please check your connection."); // Basic fallback for UI
    }
    finally { setLoading(false); }
  };

  // --- NEW: FORCE REFRESH FUNCTION ---
  const handleRefresh = () => {
    fetchData(true); // Passes true to bypass the cache
  };

  const processChartData = (data) => {
    const map = {};
    data.forEach(r => {
      const amt = Number(r.total ?? r.total_amount ?? 0);
      const dateKey = new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      map[dateKey] = (map[dateKey] || 0) + amt;
    });
    return Object.entries(map).map(([date, sales]) => ({ date, sales })).reverse();
  };

  const fetchTopItems = async (ids) => {
    const table = activeTab === "store" ? "bills_items_generated" : "invoice_items";
    const key = activeTab === "store" ? "bill_id" : "invoice_id";
    const { data } = await supabase.from(table).select("*").in(key, ids);

    const agg = {};
    (data || []).forEach(i => {
      const q = Number(i.qty ?? i.quantity ?? 0);
      const name = i.item_name || "Unknown Item";
      agg[name] = (agg[name] || 0) + q;
    });

    return Object.entries(agg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const handleExportExcel = () => {
    if (bills.length === 0) {
      alert("No data available to export for the selected dates.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No,Transaction ID,Date,Time,Total Amount (INR)\n";

    bills.forEach((bill, index) => {
      const dateObj = new Date(bill.created_at);
      const dateStr = dateObj.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
      const amount = Number(bill.total ?? bill.total_amount ?? 0).toFixed(2);
      const transactionId = bill.profiles?.franchise_id || bill.franchise_id || bill.id;
      // Added replacing of quotes in transaction ID to prevent CSV injection just in case
      const safeId = String(transactionId).replace(/"/g, '""');
      csvContent += `${index + 1},"${safeId}",${dateStr},${timeStr},${amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateLabel = dateRangeMode === "single" ? startDate : `${startDate}_to_${endDate}`;
    link.setAttribute("download", `Franchise_Sales_${dateLabel}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBanner = () => {
    if (activeTab !== "store") return null;

    if (!oldestRecordDate && !loading) {
      return (
        <div className="warning-banner banner-success">
          <div className="warning-icon"><CheckCircle2 size={20} /></div>
          <div className="warning-text">
            <strong>🎉 Day 1!</strong> You don't have any bills yet. Your system is perfectly clean. You have <strong>45 days to go</strong> before any old data is deleted!
          </div>
        </div>
      );
    }

    if (oldestRecordDate && daysUntilDeletion !== null) {
      const formattedDate = oldestRecordDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });

      if (daysUntilDeletion <= 0) {
        return (
          <div className="warning-banner banner-urgent">
            <div className="warning-icon"><AlertOctagon size={20} /></div>
            <div className="warning-text">
              <strong>🚨 ACTION NEEDED:</strong> Your bills from <span>{formattedDate}</span> are 45 days old. They will be deleted <strong>TONIGHT</strong>. Click 'Export' to save them right now!
            </div>
          </div>
        );
      }

      if (daysUntilDeletion <= 5) {
        return (
          <div className="warning-banner banner-warning">
            <div className="warning-icon"><AlertTriangle size={20} /></div>
            <div className="warning-text">
              <strong>⚠️ Heads Up:</strong> Your oldest bill is from <span>{formattedDate}</span>. It will be deleted in exactly <strong>{daysUntilDeletion} days</strong>. Click 'Export' to save a copy.
            </div>
          </div>
        );
      }

      return (
        <div className="warning-banner banner-success">
          <div className="warning-icon"><CheckCircle2 size={20} /></div>
          <div className="warning-text">
            <strong>✅ Safe Zone:</strong> Your oldest bill is from <span>{formattedDate}</span>. You still have <strong>{daysUntilDeletion} days to go</strong> before it gets deleted.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-page">
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>
            Franchise <span style={{ color: PRIMARY }}>Analytics</span>
          </h1>
          <div style={styles.idBox}>ID : {franchiseId || "---"}</div>
        </div>
      </header>

      <div className="main-container">
        {renderBanner()}

        <div className="controls-wrapper">
          <div className="tab-group">
            <button onClick={() => setActiveTab("store")} className={`tab-btn ${activeTab === "store" ? "active" : ""}`}>Store Sales</button>
            <button onClick={() => setActiveTab("invoice")} className={`tab-btn ${activeTab === "invoice" ? "active" : ""}`}>Orders</button>
          </div>

          <div className="right-controls">
            <div className="date-group">
              <div className="range-toggle">
                <button onClick={() => setDateRangeMode("single")} className={dateRangeMode === "single" ? "active" : ""}>Day</button>
                <button onClick={() => setDateRangeMode("range")} className={dateRangeMode === "range" ? "active" : ""}>Range</button>
              </div>
              <div className="date-picker-box">
                <Calendar size={14} className="cal-icon" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                {dateRangeMode === "range" && (
                  <>
                    <span className="sep">-</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* --- NEW REFRESH BUTTON COMPONENT --- */}
            <div className="action-buttons">
              <button onClick={handleRefresh} className="icon-btn" disabled={loading} title="Refresh Live Data">
                <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
              </button>

              <button onClick={handleExportExcel} className="export-btn" disabled={loading || bills.length === 0}>
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Syncing Data...</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="card chart-card revenue-area">
              <div className="card-header">
                <h3>Revenue Trend</h3>
                <span className="badge">₹{graphData.reduce((a, b) => a + b.sales, 0).toLocaleString('en-IN')} Total</span>
              </div>
              <div className="chart-wrapper">
                {graphData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={2} fill="url(#colorSales)" animationDuration={1000} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No sales data for selected period</div>
                )}
              </div>
            </div>

            <div className="card chart-card pie-area">
              <div className="card-header">
                <h3>Top Items</h3>
              </div>
              <div className="pie-content">
                <div className="pie-wrapper">
                  {topItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={topItems} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={5}>
                          {topItems.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data small">No Items</div>
                  )}
                </div>
                <div className="legend-list">
                  {topItems.map((item, index) => (
                    <div key={index} className="legend-item">
                      <div className="dot" style={{ background: COLORS[index % COLORS.length] }}></div>
                      <span className="l-name">{item.name}</span>
                      <span className="l-val">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card list-area">
              <div className="card-header">
                <h3>{activeTab === "store" ? "Transactions" : "Invoices"}</h3>
                <span className="count-badge">{bills.length} Records</span>
              </div>

              <div className="table-header-row">
                <span className="th-sno">#</span>
                <span className="th-id">ID</span>
                <span className="th-date">Date & Time</span>
                <span className="th-amt">Amount</span>
                <span className="th-icon"></span>
              </div>

              <div className="list-scroll">
                {bills.length === 0 && <div className="no-data">No records found.</div>}
                {bills.map((bill, index) => (
                  <div key={bill.id} className={`list-item ${expandedBill === bill.id ? 'expanded' : ''}`}>
                    <div className="item-summary" onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                      <div className="col sno-col">{index + 1}</div>
                      <div className="col id-col">
                        <div className="icon-box"><Hash size={12} /></div>
                        <span className="id-text">{bill.profiles?.franchise_id || bill.franchise_id || "..."}</span>
                      </div>
                      <div className="col date-col">
                        <span className="d-date">{new Date(bill.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</span>
                        <span className="d-time"><Clock size={10} /> {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      <div className="col amt-col">₹{Number(bill.total ?? bill.total_amount ?? 0).toLocaleString('en-IN')}</div>
                      <div className="col arrow-col">{expandedBill === bill.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                    </div>

                    {expandedBill === bill.id && (
                      <div className="item-details">
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

      <style>{`
        :root { --primary: ${PRIMARY}; --excel: ${EXCEL_GREEN}; --bg: #f8fafc; --card-bg: #ffffff; --text-main: #0f172a; --text-sub: #64748b; --border: #e2e8f0; }
        .analytics-page { background: var(--bg); min-height: 100vh; font-family: 'Inter', sans-serif; color: var(--text-main); padding-bottom: 40px; }
        .main-container { max-width: 1200px; margin: 0 auto; padding: 16px; }
        .warning-banner { padding: 12px 16px; border-radius: 8px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid; border-left: 4px solid; transition: all 0.3s ease; }
        .warning-text { font-size: 13px; line-height: 1.5; }
        .warning-text span { font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .banner-success { background: #ecfdf5; border-color: #a7f3d0; border-left-color: #10b981; }
        .banner-success .warning-icon { color: #059669; margin-top: 2px; }
        .banner-success .warning-text { color: #065f46; }
        .banner-success .warning-text strong { color: #064e3b; }
        .banner-success .warning-text span { background: #d1fae5; }
        .banner-warning { background: #fffbeb; border-color: #fde68a; border-left-color: #f59e0b; }
        .banner-warning .warning-icon { color: #d97706; margin-top: 2px; }
        .banner-warning .warning-text { color: #92400e; }
        .banner-warning .warning-text strong { color: #b45309; }
        .banner-warning .warning-text span { background: #fef3c7; }
        .banner-urgent { background: #fef2f2; border-color: #fecaca; border-left-color: #ef4444; }
        .banner-urgent .warning-icon { color: #dc2626; margin-top: 2px; }
        .banner-urgent .warning-text { color: #991b1b; }
        .banner-urgent .warning-text strong { color: #7f1d1d; }
        .banner-urgent .warning-text span { background: #fee2e2; }
        .controls-wrapper { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .right-controls { display: flex; flex-direction: column; gap: 12px; }
        .tab-group { background: #e2e8f0; padding: 2px; border-radius: 8px; display: inline-flex; width: fit-content; }
        .tab-btn { border: none; background: none; padding: 6px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--text-sub); cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
        .tab-btn.active { background: #fff; color: var(--text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 800; }
        .date-group { display: flex; gap: 10px; align-items: center; }
        .range-toggle { display: flex; background: #e2e8f0; padding: 2px; border-radius: 8px; }
        .range-toggle button { border: none; background: none; padding: 6px 12px; font-size: 11px; font-weight: 600; color: var(--text-sub); border-radius: 6px; cursor: pointer; text-transform: uppercase; }
        .range-toggle button.active { background: #fff; color: var(--text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 800; }
        .date-picker-box { flex: 1; display: flex; align-items: center; background: #fff; border: 1px solid var(--border); padding: 0 10px; border-radius: 8px; height: 32px; }
        .date-picker-box input { border: none; background: transparent; font-size: 12px; font-weight: 600; outline: none; width: 100%; color: var(--text-main); }
        .cal-icon { margin-right: 8px; color: var(--text-sub); }
        .sep { margin: 0 8px; font-weight: 700; color: var(--border); }
        
        /* NEW STYLES FOR REFRESH BUTTON */
        .action-buttons { display: flex; gap: 8px; align-items: center; }
        .icon-btn { display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid var(--border); color: var(--text-sub); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .icon-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
        .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin-icon { animation: spin 1s linear infinite; }
        
        .export-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--excel); color: white; border: none; padding: 0 16px; height: 32px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s, opacity 0.2s; box-shadow: 0 2px 4px rgba(16, 124, 65, 0.2); text-transform: uppercase; letter-spacing: 0.5px; }
        .export-btn:hover { background: #0c5e31; }
        .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .card { background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card-header { padding: 16px; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; }
        .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-main); }
        .badge { font-size: 12px; font-weight: 700; color: var(--primary); background: #ecfdf5; padding: 4px 8px; border-radius: 20px; }
        .count-badge { font-size: 10px; font-weight: 600; color: var(--text-sub); background: #f1f5f9; padding: 3px 8px; border-radius: 4px; }
        .chart-wrapper { height: 250px; padding: 10px; }
        .pie-content { display: flex; flex-direction: column; padding: 16px; }
        .pie-wrapper { height: 180px; width: 100%; }
        .legend-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
        .legend-item { display: flex; align-items: center; font-size: 12px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .l-name { flex: 1; color: var(--text-sub); font-weight: 500; }
        .l-val { font-weight: 700; color: var(--text-main); }
        .list-area { display: flex; flex-direction: column; height: 100%; min-height: 400px; }
        .table-header-row { display: flex; padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid var(--border); }
        .table-header-row span { font-size: 10px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; }
        .th-sno { width: 30px; text-align: center; }
        .th-id { width: 60px; }
        .th-date { flex: 1; text-align: center; }
        .th-amt { width: 80px; text-align: right; }
        .th-icon { width: 24px; }
        .list-scroll { overflow-y: auto; max-height: 600px; }
        .list-item { border-bottom: 1px solid var(--border); transition: background 0.2s; }
        .list-item:active { background: #f8fafc; }
        .item-summary { display: flex; padding: 14px 16px; align-items: center; cursor: pointer; }
        .col { display: flex; align-items: center; }
        .sno-col { width: 30px; justify-content: center; font-size: 11px; font-weight: 700; color: #94a3b8; }
        .id-col { width: 60px; gap: 6px; }
        .icon-box { display: none; }
        .id-text { font-size: 12px; font-weight: 700; color: var(--text-main); }
        .date-col { flex: 1; flex-direction: column; align-items: center; justify-content: center; }
        .d-date { font-size: 12px; font-weight: 600; color: var(--text-main); }
        .d-time { font-size: 10px; color: var(--text-sub); display: flex; align-items: center; gap: 3px; }
        .amt-col { width: 80px; justify-content: flex-end; font-size: 13px; font-weight: 700; color: var(--primary); }
        .arrow-col { width: 24px; justify-content: flex-end; color: #cbd5e1; }
        .item-details { background: #f8fafc; padding: 12px 16px; border-top: 1px solid var(--border); }
        .no-data { text-align: center; padding: 20px; font-size: 12px; color: var(--text-sub); font-style: italic; }
        .loader-container { padding: 40px; text-align: center; color: var(--text-sub); font-weight: 500; font-size: 14px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 10px; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .controls-wrapper { flex-direction: row; justify-content: space-between; align-items: center; }
          .right-controls { flex-direction: row; align-items: center; }
          .tab-group, .date-group { width: auto; }
          .dashboard-grid { grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; }
          .revenue-area { grid-column: 1 / 2; }
          .pie-area { grid-column: 2 / 3; }
          .list-area { grid-column: 1 / -1; }
          .icon-box { display: flex; align-items: center; justify-content: center; background: #e0f2fe; color: #0284c7; width: 24px; height: 24px; border-radius: 6px; }
          .th-sno, .sno-col { width: 50px; font-size: 12px; }
          .id-col { width: 120px; }
          .date-col { flex-direction: row; gap: 10px; }
        }
        @media (min-width: 1024px) {
           .main-container { padding: 24px; }
           .dashboard-grid { grid-template-columns: 3fr 1.5fr; gap: 24px; }
           .chart-wrapper { height: 300px; }
           .pie-wrapper { height: 200px; }
        }
      `}</style>
    </div>
  );
}

function BillItems({ billId, type }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const cacheKey = `bill_items_${billId}`;
      const cachedItems = sessionStorage.getItem(cacheKey);

      if (cachedItems) {
        if (mounted) setItems(JSON.parse(cachedItems));
        return;
      }

      const table = type === "store" ? "bills_items_generated" : "invoice_items";
      const key = type === "store" ? "bill_id" : "invoice_id";

      const { data } = await supabase.from(table).select("*").eq(key, billId);

      if (mounted) {
        const fetchedData = data || [];
        setItems(fetchedData);
        safeSetSessionStorage(cacheKey, JSON.stringify(fetchedData));
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [billId, type]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
      <div style={{ display: 'flex', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>
        <span style={{ flex: 2 }}>Item Name</span>
        <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Subtotal</span>
      </div>
      {items.map((i, idx) => {
        const qty = Number(i.qty ?? i.quantity ?? 0);
        const price = Number(i.price ?? 0);
        const lineTotal = i.total ? Number(i.total) : (qty * price);

        return (
          <div key={idx} style={{ display: 'flex', fontSize: '12px', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ flex: 2, fontWeight: 600, color: '#334155' }}>{i.item_name}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#64748b' }}>{qty}</span>
            <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{lineTotal.toLocaleString('en-IN')}</span>
          </div>
        )
      })}
    </div>
  );
}

const styles = {
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }
};

export default FranchiseAnalytics;