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
  const [franchiseId, setFranchiseId] = useState("...");

  useEffect(() => {
    fetchFranchiseProfile();
    fetchData();
  }, [activeTab, startDate, endDate, dateRangeMode]);

  const fetchFranchiseProfile = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
            if (data) setFranchiseId(data.franchise_id);
        }
    } catch (e) { console.error(e); }
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
    <div className="analytics-page">
      {/* HEADER */}
      <nav className="nav-bar">
        {/* Left: Back Button */}
        <div className="nav-left">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
        </div>

        {/* Center: Title (Absolutely Centered) */}
        <div className="nav-center">
          <h1 className="header-title">Analysis</h1>
        </div>

        {/* Right: ID Box */}
        <div className="nav-right">
          <div className="id-container">
            <span className="id-label">ID:</span>
            <span className="id-box">{franchiseId}</span>
          </div>
        </div>
      </nav>

      <div className="main-container">
        
        {/* TABS */}
        <div className="tab-container">
          <div className="toggle-bar">
            <button onClick={() => setActiveTab("store")} className={`tab-btn ${activeTab === "store" ? "active" : ""}`}>Store Sales</button>
            <button onClick={() => setActiveTab("invoice")} className={`tab-btn ${activeTab === "invoice" ? "active" : ""}`}>Orders</button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="filter-row">
          <div className="date-controls">
            <div className="mini-toggle">
              <button onClick={() => setDateRangeMode("single")} className={`mini-btn ${dateRangeMode === "single" ? "active" : ""}`}>Single</button>
              <button onClick={() => setDateRangeMode("range")} className={`mini-btn ${dateRangeMode === "range" ? "active" : ""}`}>Range</button>
            </div>
            <div className="date-inputs">
              <Calendar size={14} color="#6b7280" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
              {dateRangeMode === "range" && (
                <>
                  <span className="date-separator">—</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        {loading ? (
          <div className="loader">Synchronizing Data...</div>
        ) : (
          <div className="dashboard-grid">
            
            {/* Chart 1: Revenue */}
            <div className="chart-card">
              <h3 className="chart-title">Revenue Trend</h3>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={3} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Items */}
            <div className="chart-card">
              <h3 className="chart-title">Top 10 Items</h3>
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
              <div className="top-items-list">
                {topItems.map((item, index) => (
                  <div key={index} className="top-item-row">
                    <span className="rank-num" style={{ color: COLORS[index % COLORS.length] }}>{index + 1}</span>
                    <span className="item-name">{item.name}</span>
                    <span className="item-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List: Bills/Invoices */}
            <div className="chart-card full-width">
              <h3 className="chart-title">{activeTab === "store" ? "Generated Bills" : "Stock Invoices"}</h3>
              <div className="list-container">
                <div className="table-head">
                  <span className="col-id">ID</span>
                  <span className="col-time">Time</span>
                  <span className="col-amt">Amt</span>
                  <span style={{ width: 18 }} />
                </div>
                
                {bills.map(bill => (
                  <div key={bill.id} className="bill-row" onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                    <div className="bill-main">
                      <span className="col-id cell-id">
                        <Hash size={12} color={PRIMARY} /> 
                        {bill.profiles?.franchise_id || bill.franchise_id || "N/A"}
                      </span>

                      <div className="col-time cell-time">
                        <span className="date-txt">
                          {new Date(bill.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="time-txt">
                          <Clock size={10} style={{marginRight: 4}} />
                          {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>

                      <div className="col-amt cell-amt">
                        <span className="amt-txt">₹{Number(bill.total ?? bill.total_amount ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                      {expandedBill === bill.id ? <ChevronDown size={18} color={PRIMARY} /> : <ChevronRight size={18} color="#d1d5db" />}
                    </div>

                    {expandedBill === bill.id && (
                      <div className="popup-inner">
                        <div className="popup-header">Breakdown</div>
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
        /* --- GLOBAL & RESET --- */
        .analytics-page {
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }

        /* --- NAVIGATION --- */
        .nav-bar {
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
          height: 64px;
        }
        
        .nav-left { flex: 1; display: flex; justify-content: flex-start; }
        .nav-right { flex: 1; display: flex; justify-content: flex-end; }
        
        /* Absolute Centering for Title */
        .nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
        }

        .back-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: ${PRIMARY};
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 0;
        }

        .header-title {
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 16px;
          margin: 0;
          white-space: nowrap;
        }

        /* --- ID BOX STYLING --- */
        .id-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .id-label {
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: none; /* Hide label on very small screens if needed, usually fine to keep */
        }
        @media (min-width: 350px) { .id-label { display: block; } }

        .id-box {
          font-size: 11px;
          font-weight: 800;
          color: #000;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        /* --- CONTAINER --- */
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        /* --- TABS --- */
        .tab-container { display: flex; justify-content: center; margin-bottom: 24px; }
        .toggle-bar { background: #f1f5f9; padding: 4px; border-radius: 12px; display: flex; width: 100%; max-width: 400px; }
        .tab-btn {
          flex: 1;
          padding: 10px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
          transition: 0.2s;
        }
        .tab-btn.active { background: #fff; color: ${PRIMARY}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); font-weight: 800; }

        /* --- FILTERS --- */
        .filter-row { margin-bottom: 24px; }
        .date-controls { display: flex; flex-direction: column; gap: 12px; }
        .mini-toggle { display: flex; background: #f1f5f9; border-radius: 8px; padding: 2px; align-self: flex-start; }
        .mini-btn { border: none; background: none; fontSize: 11px; fontWeight: 600; color: #64748b; padding: 6px 16px; cursor: pointer; }
        .mini-btn.active { background: #fff; color: ${PRIMARY}; font-weight: 800; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        
        .date-inputs {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 10px;
          width: 100%;
          gap: 10px;
        }
        .date-input { border: none; outline: none; font-size: 12px; font-weight: 600; color: #1e293b; background: transparent; flex: 1; }
        .date-separator { color: #d1d5db; font-weight: 700; }

        /* --- GRID LAYOUT --- */
        .dashboard-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr; /* Default Mobile: 1 Column */
        }

        .chart-card {
          background: #fff;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .chart-title { font-weight: 800; margin-bottom: 16px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }

        /* --- TOP ITEMS LIST --- */
        .top-items-list { display: flex; flex-direction: column; gap: 10px; }
        .top-item-row { display: flex; align-items: center; font-size: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
        .rank-num { width: 24px; font-weight: 900; }
        .item-name { flex: 1; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-value { font-weight: 800; }

        /* --- LIST TABLE --- */
        .list-container { display: flex; flex-direction: column; gap: 10px; }
        .table-head { display: flex; padding: 0 16px 8px 16px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .bill-row { border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; cursor: pointer; background: #fff; transition: 0.2s; }
        .bill-main { padding: 14px 16px; display: flex; align-items: center; }
        
        .col-id { flex: 1.2; }
        .col-time { flex: 1.5; text-align: center; }
        .col-amt { flex: 1; text-align: right; padding-right: 10px; }

        .cell-id { font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 4px; color: #334155; }
        .cell-time { display: flex; flex-direction: column; gap: 2px; }
        .date-txt { font-size: 11px; font-weight: 600; color: #1e293b; }
        .time-txt { font-size: 10px; font-weight: 500; color: #94a3b8; display: flex; align-items: center; justify-content: center; }
        .cell-amt .amt-txt { font-weight: 800; color: ${PRIMARY}; font-size: 14px; }

        .popup-inner { padding: 16px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
        .popup-header { font-weight: 800; margin-bottom: 10px; color: #64748b; font-size: 10px; text-transform: uppercase; }
        .items-table { display: flex; flex-direction: column; gap: 6px; }
        .item-line-header { display: flex; padding: 0 8px 6px 8px; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; }
        .item-line { display: flex; align-items: center; font-size: 11px; background: #fff; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; }

        .loader { text-align: center; padding: 100px 0; font-weight: 700; color: ${PRIMARY}; }

        /* --- MEDIA QUERIES --- */
        @media (min-width: 768px) {
          .nav-bar { padding: 0 40px; }
          .date-controls { flex-direction: row; }
          .date-inputs { width: auto; }
          .dashboard-grid { grid-template-columns: 1fr 1fr; } /* Tablet 2 col */
          .full-width { grid-column: span 2; }
        }

        @media (min-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1.6fr 1fr; } /* Laptop Ratio */
          .full-width { grid-column: span 2; }
          .bill-main { padding: 14px 24px; }
          .table-head { padding: 0 24px 12px 24px; }
        }
      `}</style>
    </div>
  );
}

// Sub-component for bill items
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
    <div className="items-table">
       <div className="item-line-header">
          <span style={{ flex: 2 }}>Item</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
          <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
       </div>
      {items.map((i, idx) => {
        const qty = Number(i.qty ?? i.quantity ?? 0);
        const price = Number(i.price ?? 0);
        return (
          <div key={idx} className="item-line">
            <span style={{ fontWeight: 600, flex: 2, color: '#1e293b' }}>{i.item_name}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#64748b' }}>{qty}</span>
            <span style={{ fontWeight: 700, flex: 1, textAlign: 'right', color: '#0f172a' }}>₹{(qty * price).toLocaleString('en-IN')}</span>
          </div>
        );
      })}
    </div>
  );
}

export default FranchiseAnalytics;