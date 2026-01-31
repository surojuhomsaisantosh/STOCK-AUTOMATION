import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, Search, Calendar, Download, 
  RotateCcw, Building2, Layers,
  X, TrendingUp, MapPin, ShoppingBag, ChevronRight
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const COLORS = [PRIMARY, "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0ea5e9", "#f472b6", "#64748b", "#fbbf24", "#4ade80"];

function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("store"); 
  const [profile, setProfile] = useState(null);
  
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
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
            setProfile(data);
        }

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
    } catch (e) {
        console.error("Error fetching data", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setSelectedFranchise("all");
  };

  // --- NEW: EXCEL/CSV DOWNLOAD LOGIC ---
  const handleDownload = () => {
    if (!filteredData.length) return alert("No data to export!");

    // 1. Define Headers
    const headers = ["Bill/Invoice ID", "Franchise ID", "Customer/Branch", "Date", "Time", "Total Amount (INR)"];
    
    // 2. Map Data Rows
    const rows = filteredData.map(item => {
        const id = item.id;
        const fid = item.franchise_id || item.profiles?.franchise_id || "Head Office";
        const name = (item.customer_name || item.profiles?.branch_location || "Walk-in").replace(/,/g, " "); // Remove commas to prevent CSV breakage
        const dateObj = new Date(item.created_at);
        const date = dateObj.toLocaleDateString('en-IN');
        const time = dateObj.toLocaleTimeString('en-IN');
        const amount = item.total || item.total_amount || 0;

        return [id, fid, name, date, time, amount].join(",");
    });

    // 3. Combine and Download
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // -------------------------------------

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

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-xl text-slate-400 uppercase tracking-widest">Loading Reports...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 md:pb-10 font-sans text-slate-900 relative">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">
                <ArrowLeft size={18} /> <span>Back</span>
            </button>
            <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden">Reports</h1>
            
            {/* Mobile ID Box & Download */}
            <div className="flex items-center gap-2 md:hidden">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">ID :</span>
                    <span className="text-[10px] font-black text-black bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                        {profile?.franchise_id || "CENTRAL"}
                    </span>
                </div>
                <button 
                    className="flex items-center justify-center text-white p-2 rounded-lg hover:opacity-90 transition-colors" 
                    style={{ backgroundColor: PRIMARY }}
                    onClick={handleDownload}
                >
                    <Download size={14} />
                </button>
            </div>
        </div>
        
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2">Sales Reports</h1>
        
        {/* Desktop ID Box & Download */}
        <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID :</span>
                <span className="text-xs font-black text-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                    {profile?.franchise_id || "CENTRAL"}
                </span>
            </div>
            <button 
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-colors shadow-sm" 
                style={{ backgroundColor: PRIMARY }}
                onClick={handleDownload}
            >
                <Download size={16} /> Download Report
            </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6 md:mt-8">
        
        {/* Toggle Tabs */}
        <div className="flex justify-center mb-8">
            <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <button 
                    onClick={() => setActiveTab("store")} 
                    className={`px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab !== "store" ? "text-slate-400 hover:text-slate-600" : "text-white shadow-md"}`}
                    style={activeTab === "store" ? { backgroundColor: PRIMARY } : {}}
                >
                    Daily Shop Sales
                </button>
                <button 
                    onClick={() => setActiveTab("invoice")} 
                    className={`px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab !== "invoice" ? "text-slate-400 hover:text-slate-600" : "text-white shadow-md"}`}
                    style={activeTab === "invoice" ? { backgroundColor: PRIMARY } : {}}
                >
                    Supply Invoices
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-8">
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 h-14 border border-slate-100">
                <Search size={18} className="text-slate-400" />
                <input 
                    className="bg-transparent border-none outline-none text-xs font-bold w-full placeholder:text-slate-400 uppercase" 
                    placeholder="Search ID or Name..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                />
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 h-14 border border-slate-100 relative">
                <Building2 size={18} className="text-slate-400" />
                <select 
                    className="bg-transparent border-none outline-none text-xs font-bold w-full appearance-none uppercase z-10" 
                    value={selectedFranchise} 
                    onChange={(e) => setSelectedFranchise(e.target.value)}
                >
                    <option value="all">All Shops</option>
                    {franchiseList.map(f => <option key={f} value={f}>ID: {f}</option>)}
                </select>
                <ChevronRight size={14} className="absolute right-4 text-slate-400 rotate-90 z-0" />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3 h-14 border border-slate-100 lg:col-span-2">
                <Calendar size={18} className="text-slate-400 shrink-0" />
                <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full text-center" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                />
                <span className="text-slate-300 font-bold">-</span>
                <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full text-center" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                />
                <button onClick={resetFilters} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shrink-0">
                    <RotateCcw size={16}/>
                </button>
            </div>
        </div>

        {/* Charts Row - FIXED HEIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
            
            {/* Area Chart */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2 h-full">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp size={18} /></div>
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Earnings Trend</span>
                </div>
                {/* FIXED: Strict Height Wrapper */}
                <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={3} fill={PRIMARY} fillOpacity={0.05} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pie Chart & Top 10 List - EXPANDED */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full min-w-0">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ShoppingBag size={18} /></div>
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Top 10 Selling</span>
                </div>
                
                {/* FIXED: Strict Height Wrapper for Pie */}
                <div style={{ width: '100%', height: '200px', marginBottom: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={itemPieData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                {itemPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-3 pr-2">
                    {itemPieData.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                <span className="font-bold text-slate-700 truncate max-w-[140px]">{item.name}</span>
                            </div>
                            <span className="font-black text-slate-900">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Summary Stats - BELOW CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-lg mb-8">
            <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Earnings (Period)</p>
                <h2 className="text-3xl font-black">₹ {totalMoney.toLocaleString('en-IN')}</h2>
            </div>
            <div className="md:text-right">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Transactions</p>
                <h2 className="text-3xl font-black">{filteredData.length}</h2>
            </div>
        </div>

        {/* Data Table / Cards */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-10 flex flex-col max-h-[600px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 shrink-0 sticky top-0 z-20">
                <Layers size={18} className="text-slate-400" />
                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Sales History</span>
            </div>

            {/* Desktop Table - Scrollable Container */}
            <div className="hidden lg:block overflow-y-auto custom-scrollbar flex-1 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-5 tracking-widest bg-slate-50">Bill No.</th>
                            <th className="p-5 tracking-widest bg-slate-50">From Shop / Customer</th>
                            <th className="p-5 tracking-widest bg-slate-50">Date</th>
                            <th className="p-5 tracking-widest text-right bg-slate-50">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan="4" className="p-10 text-center text-slate-400">No records found.</td></tr>
                        ) : filteredData.map(item => (
                            <tr key={item.id} onClick={() => openDetails(item)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                <td className="p-5"><span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px]">#{item.id.toString().slice(-8)}</span></td>
                                <td className="p-5">{item.franchise_id || item.profiles?.franchise_id || "Head Office"}</td>
                                <td className="p-5 text-slate-500 text-xs font-bold uppercase">{new Date(item.created_at).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'2-digit'})}</td>
                                <td className="p-5 text-right font-black" style={{ color: PRIMARY }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards - Scrollable Container */}
            <div className="lg:hidden flex flex-col gap-4 p-4 bg-slate-50/30 overflow-y-auto custom-scrollbar flex-1">
                {filteredData.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase">No records found.</div>
                ) : filteredData.map(item => (
                    <div key={item.id} onClick={() => openDetails(item)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-95 transition-transform shrink-0">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase mb-1 inline-block">#{item.id.toString().slice(-8)}</span>
                                <h3 className="text-sm font-black text-slate-800">{item.franchise_id || item.profiles?.franchise_id || "Head Office"}</h3>
                            </div>
                            <p className="text-lg font-black" style={{ color: PRIMARY }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase border-t border-slate-50 pt-3">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            <span>Tap for details &rarr;</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* --- RESPONSIVE MODAL --- */}
      {selectedBill && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
          
          <div className="relative w-full md:w-[500px] bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900">Bill Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Ref: {selectedBill.id.toString().slice(-8)}</p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Customer / Branch</label>
                        <p className="text-xs font-bold text-slate-800">{selectedBill.customer_name || selectedBill.profiles?.branch_location || "Walk-in"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Shop ID</label>
                        <p className="text-xs font-bold text-slate-800">{selectedBill.franchise_id || selectedBill.profiles?.franchise_id || "N/A"}</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium">{selectedBill.customer_address || selectedBill.profiles?.address || "Location not provided"}</p>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                            {modalLoading ? (
                                <tr><td colSpan="3" className="p-6 text-center text-slate-400">Loading...</td></tr>
                            ) : currentBillItems.map((i, idx) => (
                                <tr key={idx}>
                                    <td className="p-3">{i.item_name}</td>
                                    <td className="p-3 text-center">{i.qty || i.quantity}</td>
                                    <td className="p-3 text-right">₹{((i.qty || i.quantity) * i.price).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white md:rounded-b-[2.5rem]">
                <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Grand Total</span>
                    <span className="text-xl font-black">₹{Number(selectedBill.total || selectedBill.total_amount).toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default Reports;