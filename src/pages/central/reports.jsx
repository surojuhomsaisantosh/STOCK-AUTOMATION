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
    X, TrendingUp, MapPin, ShoppingBag, ChevronRight, ChevronDown,
    ListFilter
} from "lucide-react";

// --- CONFIGURATION ---
const PRIMARY = "rgb(0, 100, 55)";
const PRIMARY_LIGHT = "rgba(0, 100, 55, 0.1)";
const CACHE_KEY = "reports_data_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes

const COLORS = [
    PRIMARY, "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"
];

function Reports() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("store");
    const [profile, setProfile] = useState(null);

    const [rawData, setRawData] = useState({ store: [], billItems: [], invoices: [], invoiceItems: [] });
    const [selectedBill, setSelectedBill] = useState(null);
    const [currentBillItems, setCurrentBillItems] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    // --- DB CASCADING FILTERS ---
    const [dbCompanyList, setDbCompanyList] = useState([]);
    const [dbFranchiseList, setDbFranchiseList] = useState([]);

    const [search, setSearch] = useState("");
    const [selectedCompany, setSelectedCompany] = useState(() => sessionStorage.getItem("reports_selectedCompany") || "all");
    const [selectedFranchise, setSelectedFranchise] = useState(() => sessionStorage.getItem("reports_selectedFranchise") || "all");

    // --- DATE FILTERS ---
    const [dateMode, setDateMode] = useState("single"); // 'single' | 'range'
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- DB DROPDOWN FETCHING ---
    useEffect(() => {
        const fetchCompanies = async () => {
            const { data } = await supabase.from('companies').select('company_name');
            if (data) {
                const unique = [...new Set(data.map(c => c.company_name).filter(Boolean))].sort();
                setDbCompanyList(unique);
            }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        const fetchFranchisesForCompany = async () => {
            if (!selectedCompany || selectedCompany === "all") {
                setDbFranchiseList([]);
                return;
            }
            const { data } = await supabase
                .from('profiles')
                .select('franchise_id')
                .eq('company', selectedCompany)
                .neq('franchise_id', null);

            if (data) {
                const unique = [...new Set(data.map(p => p.franchise_id).filter(Boolean))].sort();
                setDbFranchiseList(unique);
            }
        };
        fetchFranchisesForCompany();
    }, [selectedCompany]);

    // Save dropdown selections to session storage
    useEffect(() => {
        sessionStorage.setItem("reports_selectedCompany", selectedCompany);
        sessionStorage.setItem("reports_selectedFranchise", selectedFranchise);
    }, [selectedCompany, selectedFranchise]);

    // --- REPORT DATA FETCHING ---
    const fetchData = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (!forceRefresh) {
                const cachedData = sessionStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                        console.log("⚡ Loading Reports from Cache");
                        setRawData(parsed.data);
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
                            setProfile(data);
                        }
                        setLoading(false);
                        return;
                    }
                }
            }

            console.log("🔄 Fetching from Supabase...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
                setProfile(data);
            }

            // Fetch Data in Parallel (Added 'company' to profiles query)
            const [billsReq, bItemsReq, invReq, iItemsReq, profilesReq] = await Promise.all([
                supabase.from("bills_generated").select("*").order("created_at", { ascending: false }),
                supabase.from("bills_items_generated").select("bill_id, item_name, qty, price"),
                supabase.from("invoices").select("*").order("created_at", { ascending: false }),
                supabase.from("invoice_items").select("invoice_id, item_name, quantity, price"),
                supabase.from("profiles").select("franchise_id, branch_location, address, company")
            ]);

            // Create Profile Map
            const profileMap = {};
            if (profilesReq.data) {
                profilesReq.data.forEach(p => {
                    if (p.franchise_id) profileMap[p.franchise_id] = p;
                });
            }

            // Merge Data & Attach Company Name
            const enrichedBills = (billsReq.data || []).map(bill => ({
                ...bill,
                company: profileMap[bill.franchise_id]?.company || "Unknown Company",
                mapped_location: profileMap[bill.franchise_id]?.branch_location || "",
                mapped_address: profileMap[bill.franchise_id]?.address || "Location not updated"
            }));

            const enrichedInvoices = (invReq.data || []).map(inv => {
                const fid = inv.franchise_id;
                return {
                    ...inv,
                    company: profileMap[fid]?.company || "Unknown Company",
                    mapped_location: profileMap[fid]?.branch_location || "",
                    mapped_address: profileMap[fid]?.address || "Location not updated"
                };
            });

            const finalData = {
                store: enrichedBills,
                billItems: bItemsReq.data || [],
                invoices: enrichedInvoices,
                invoiceItems: iItemsReq.data || []
            };

            setRawData(finalData);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalData, timestamp: Date.now() }));

        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRefresh = () => {
        setSearch(""); setStartDate(""); setEndDate(""); setSelectedCompany("all"); setSelectedFranchise("all"); setDateMode("single");
        fetchData(true);
    };

    const handleDateModeChange = (mode) => {
        setDateMode(mode); setStartDate(""); setEndDate("");
    };

    const handleDownload = () => {
        if (!filteredData.length) return alert("No data to export!");
        const headers = ["S.No", "Company", "Bill/Invoice ID", "Franchise ID", "Branch Name", "Date", "Time", "Total Amount (INR)"];
        const rows = filteredData.map((item, index) => {
            const id = item.id;
            const fid = item.franchise_id || "Head Office";
            const company = item.company || "Unknown";
            const name = (item.mapped_location || item.customer_name || "Standard Sale").replace(/,/g, " ");
            const dateObj = new Date(item.created_at);
            const amount = item.total || item.total_amount || 0;
            return [index + 1, company, id, fid, name, dateObj.toLocaleDateString('en-IN'), dateObj.toLocaleTimeString('en-IN'), amount].join(",");
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Sales_Report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    // --- DATA FILTERING LOGIC ---
    const filteredData = useMemo(() => {
        const dataSet = activeTab === "store" ? rawData.store : rawData.invoices;
        if (!dataSet.length) return [];
        return dataSet.filter(item => {
            const franchiseId = (item.franchise_id || "").toString().toLowerCase();
            const customer = (item.customer_name || item.mapped_location || "").toLowerCase();
            const itemId = (item.id || "").toString().toLowerCase();
            const s = search.toLowerCase();

            // Search Match
            const matchesSearch = !search || franchiseId.includes(s) || customer.includes(s) || itemId.includes(s);

            // Company & Franchise Match
            const matchesCompany = selectedCompany === "all" || item.company === selectedCompany;
            const matchesFranchise = selectedFranchise === "all" || franchiseId === selectedFranchise.toLowerCase();

            // Date Match
            const itemDate = item.created_at?.split('T')[0];
            let matchesDate = true;
            if (startDate) {
                if (dateMode === "range" && endDate) {
                    matchesDate = itemDate >= startDate && itemDate <= endDate;
                } else {
                    matchesDate = itemDate === startDate;
                }
            }

            return matchesSearch && matchesCompany && matchesFranchise && matchesDate;
        });
    }, [activeTab, rawData, search, selectedCompany, selectedFranchise, startDate, endDate, dateMode]);

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
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
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

    const totalMoney = filteredData.reduce((acc, curr) => acc + Number(curr.total || curr.total_amount || 0), 0);

    if (loading) return <div className="flex h-screen items-center justify-center font-black text-xl uppercase tracking-widest text-black">Loading Reports...</div>;

    return (
        <div className="min-h-screen bg-white pb-24 md:pb-10 font-sans text-black relative overflow-x-hidden">

            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:text-black/70 transition-colors">
                        <ArrowLeft size={18} /> <span>Back</span>
                    </button>
                    <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden text-black">Reports</h1>
                    <div className="flex items-center gap-2 md:hidden">
                        <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">ID:</span>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">{profile?.franchise_id || "CENTRAL"}</span>
                        </div>
                    </div>
                </div>
                <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Sales Reports</h1>
                <div className="hidden md:flex items-center gap-3">
                    <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{profile?.franchise_id || "CENTRAL"}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6 md:mt-8">

                {/* Tabs & Download (CENTERED TABS FIX) */}
                <div className="flex flex-col md:flex-row items-center w-full mb-6 gap-4">
                    {/* Left Spacer to force center alignment */}
                    <div className="hidden md:block md:flex-1"></div>

                    {/* Centered Tabs Container */}
                    <div className="flex justify-center w-full md:w-auto shrink-0">
                        <div className="flex gap-2 p-1 bg-white border border-black/10 rounded-2xl shadow-sm overflow-x-auto w-full max-w-[400px]">
                            <button
                                onClick={() => { setActiveTab("store"); setSelectedCompany("all"); setSelectedFranchise("all"); }}
                                className={`flex-1 px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab !== "store" ? "text-black/40 hover:text-black/70" : "text-white shadow-md"}`}
                                style={activeTab === "store" ? { backgroundColor: PRIMARY } : {}}
                            >
                                Daily Shop Sales
                            </button>
                            <button
                                onClick={() => { setActiveTab("invoice"); setSelectedCompany("all"); setSelectedFranchise("all"); }}
                                className={`flex-1 px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab !== "invoice" ? "text-black/40 hover:text-black/70" : "text-white shadow-md"}`}
                                style={activeTab === "invoice" ? { backgroundColor: PRIMARY } : {}}
                            >
                                Supply Invoices
                            </button>
                        </div>
                    </div>

                    {/* Right Aligned Download */}
                    <div className="w-full md:flex-1 flex justify-end">
                        <button
                            className="flex items-center justify-center gap-2 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-colors shadow-sm w-full md:w-auto"
                            style={{ backgroundColor: PRIMARY }}
                            onClick={handleDownload}
                        >
                            <Download size={16} /> Download CSV
                        </button>
                    </div>
                </div>

                {/* --- RESPONSIVE FILTERS --- */}
                <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-black/10 shadow-sm mb-8 flex flex-col gap-4">
                    {/* Search - Full Width */}
                    <div className="flex items-center gap-3 bg-white rounded-2xl px-4 h-12 md:h-14 border border-black/10 hover:border-black/30 transition-colors w-full">
                        <Search size={18} className="text-black" />
                        <input
                            className="bg-transparent border-none outline-none text-xs font-bold w-full placeholder:text-black/30 text-black uppercase"
                            placeholder="Search ID, Name or Invoice..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Controls Grid */}
                    <div className="flex flex-col lg:flex-row gap-3 w-full">

                        {/* DB-DRIVEN Company & Franchise Dropdowns */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-5/12 shrink-0">
                            {/* Company Select */}
                            <div className="relative h-12 md:h-14 border border-black/10 rounded-2xl px-4 flex items-center gap-3 w-full hover:border-black/30 transition-colors bg-white">
                                <Building2 size={18} className="text-black shrink-0" />
                                <select
                                    className="bg-transparent border-none outline-none text-[10px] sm:text-xs font-bold w-full appearance-none uppercase z-10 text-black cursor-pointer truncate pr-6"
                                    value={selectedCompany}
                                    onChange={(e) => {
                                        setSelectedCompany(e.target.value);
                                        setSelectedFranchise("all"); // Reset branch when company changes
                                    }}
                                >
                                    <option value="all">All Companies</option>
                                    {dbCompanyList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 text-black z-0 pointer-events-none" />
                            </div>

                            {/* Franchise Select (FIXED CUTOFF) */}
                            <div className="relative h-12 md:h-14 border border-black/10 rounded-2xl px-4 flex items-center gap-3 w-full hover:border-black/30 transition-colors bg-white">
                                <MapPin size={18} className="text-black shrink-0" />
                                <select
                                    className={`bg-transparent border-none outline-none text-[10px] sm:text-xs font-bold w-full appearance-none uppercase z-10 text-black truncate pr-6 ${selectedCompany === 'all' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    value={selectedFranchise}
                                    onChange={(e) => setSelectedFranchise(e.target.value)}
                                    disabled={selectedCompany === "all"}
                                >
                                    <option value="all">{selectedCompany === "all" ? "Select Company" : "All Branches"}</option>
                                    {dbFranchiseList.map(f => <option key={f} value={f}>ID: {f}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 text-black z-0 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date Controls & Reset (FIXED BUTTON SIZING) */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:flex-1">
                            {/* Date Mode Toggle */}
                            <div className="bg-slate-100 p-1 rounded-2xl flex shrink-0 h-12 md:h-14 items-center w-full sm:w-auto">
                                <button
                                    onClick={() => handleDateModeChange("single")}
                                    className={`flex-1 px-4 h-full rounded-xl text-[10px] font-bold uppercase transition-all ${dateMode === "single" ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"}`}
                                >
                                    Single
                                </button>
                                <button
                                    onClick={() => handleDateModeChange("range")}
                                    className={`flex-1 px-4 h-full rounded-xl text-[10px] font-bold uppercase transition-all ${dateMode === "range" ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"}`}
                                >
                                    Range
                                </button>
                            </div>

                            {/* Date Inputs & Rest Container */}
                            <div className="flex gap-2 w-full">
                                <div className="flex items-center gap-2 h-12 md:h-14 border border-black/10 rounded-2xl px-3 w-full hover:border-black/30 transition-colors bg-white flex-1 min-w-0">
                                    <Calendar size={18} className="text-black shrink-0" />
                                    <input
                                        type="date"
                                        className="bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full text-center text-black"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    {dateMode === "range" && (
                                        <>
                                            <span className="text-black/30 font-bold">-</span>
                                            <input
                                                type="date"
                                                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full text-center text-black"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Reset Button - Fixed Square Shape */}
                                <button
                                    onClick={handleRefresh}
                                    className="h-12 w-12 md:h-14 md:w-14 shrink-0 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-colors"
                                    title="Reset & Refresh"
                                >
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Charts - Stacked on Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-black/10 shadow-sm lg:col-span-2 min-w-0">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 rounded-xl text-black" style={{ backgroundColor: PRIMARY_LIGHT }}><TrendingUp size={18} /></div>
                            <span className="text-xs font-black uppercase text-black/40 tracking-widest">Earnings Trend</span>
                        </div>
                        <div style={{ width: '100%', height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#000000' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#000000' }} tickFormatter={(v) => `₹${v}`} width={50} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={3} fill={PRIMARY} fillOpacity={0.05} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-black/10 shadow-sm min-w-0">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-xl text-black" style={{ backgroundColor: PRIMARY_LIGHT }}><ShoppingBag size={18} /></div>
                            <span className="text-xs font-black uppercase text-black/40 tracking-widest">Top 10 Selling</span>
                        </div>
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
                                <div key={i} className="flex justify-between items-center text-xs border-b border-black/5 pb-2 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="font-bold text-black truncate max-w-[140px]">{item.name}</span>
                                    </div>
                                    <span className="font-black text-black">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white p-6 md:p-8 rounded-[2.5rem] shadow-lg mb-8" style={{ backgroundColor: PRIMARY }}>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white tracking-widest mb-1">Total Earnings (Filtered)</p>
                        <h2 className="text-3xl font-black">₹ {totalMoney.toLocaleString('en-IN')}</h2>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[10px] font-black uppercase text-white tracking-widest mb-1">Total Transactions</p>
                        <h2 className="text-3xl font-black">{filteredData.length}</h2>
                    </div>
                </div>

                {/* Data Table / Cards */}
                <div className="bg-white rounded-[2.5rem] border border-black/10 shadow-sm overflow-hidden mb-10 flex flex-col max-h-[600px]">
                    <div className="p-6 border-b border-black/10 bg-white flex items-center gap-2 shrink-0 sticky top-0 z-20">
                        <Layers size={18} className="text-black" />
                        <span className="text-xs font-black uppercase text-black/50 tracking-widest">Sales History</span>
                    </div>

                    <div className="hidden lg:block overflow-y-auto custom-scrollbar flex-1 relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white text-[10px] font-black uppercase text-black/40 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-5 tracking-widest bg-white w-20">S.No.</th>
                                    <th className="p-5 tracking-widest bg-white">ID (Ref)</th>
                                    <th className="p-5 tracking-widest bg-white">Company</th>
                                    <th className="p-5 tracking-widest bg-white">Branch / Customer</th>
                                    <th className="p-5 tracking-widest bg-white">Date</th>
                                    <th className="p-5 tracking-widest text-right bg-white">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 text-sm font-bold text-black">
                                {filteredData.length === 0 ? (
                                    <tr><td colSpan="6" className="p-10 text-center text-black/40">No records found.</td></tr>
                                ) : filteredData.map((item, index) => (
                                    <tr key={item.id} onClick={() => openDetails(item)} className="hover:bg-black/5 cursor-pointer transition-colors">
                                        <td className="p-5 text-black/40">{index + 1}</td>
                                        <td className="p-5">
                                            <span className="bg-black/5 text-black px-2 py-1 rounded-md text-[10px]">#{item.id.toString().slice(-8)}</span>
                                            <div className="text-[10px] text-black/40 mt-1">{item.franchise_id}</div>
                                        </td>
                                        <td className="p-5 text-xs text-black/60 uppercase">{item.company || "Unknown"}</td>
                                        <td className="p-5 text-xs uppercase">{item.mapped_location || item.customer_name || "Standard Sale"}</td>
                                        <td className="p-5 text-black/60 text-[11px] font-bold uppercase">{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="p-5 text-right font-black" style={{ color: PRIMARY }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="lg:hidden flex flex-col gap-4 p-4 bg-white overflow-y-auto custom-scrollbar flex-1">
                        {filteredData.length === 0 ? (
                            <div className="p-10 text-center text-black/40 text-xs font-bold uppercase">No records found.</div>
                        ) : filteredData.map((item, index) => (
                            <div key={item.id} onClick={() => openDetails(item)} className="bg-white p-5 rounded-3xl border border-black/10 shadow-sm active:scale-95 transition-transform shrink-0">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-black/30">#{index + 1}</span>
                                            <span className="bg-black/5 text-black/60 px-2 py-1 rounded-md text-[10px] font-black uppercase inline-block">#{item.id.toString().slice(-8)}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-black uppercase">{item.mapped_location || item.customer_name || "Standard Sale"}</h3>
                                        <p className="text-[10px] text-black/50 uppercase mt-1 flex items-center gap-1"><Building2 size={10} /> {item.company || "Unknown"} • {item.franchise_id}</p>
                                    </div>
                                    <p className="text-lg font-black" style={{ color: PRIMARY }}>₹{(item.total || item.total_amount || 0).toFixed(2)}</p>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-black/40 uppercase border-t border-black/5 pt-3">
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                    <span>Tap for details &rarr;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {selectedBill && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
                    <div className="relative w-full md:w-[500px] bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-black/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black uppercase text-black">Bill Details</h3>
                                <p className="text-[10px] font-bold text-black/40 uppercase">Ref: {selectedBill.id.toString().slice(-8)}</p>
                            </div>
                            <button onClick={() => setSelectedBill(null)} className="p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
                                <X size={20} className="text-black" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-2xl border border-black/10">
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1">Customer / Branch</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.customer_name || selectedBill.mapped_location || "Standard Sale"}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-black/10">
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1">Company / ID</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.company || "Unknown"}</p>
                                    <p className="text-[10px] font-bold text-black/50 mt-1">{selectedBill.franchise_id || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-black/10 mb-6">
                                <MapPin size={16} className="text-black shrink-0 mt-0.5" />
                                <p className="text-xs text-black font-medium">{selectedBill.customer_address || selectedBill.mapped_address || "Location not provided"}</p>
                            </div>

                            <div className="border border-black/10 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-white text-[10px] font-black uppercase text-black/40">
                                        <tr>
                                            <th className="p-3">Item</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 text-xs font-bold text-black">
                                        {modalLoading ? (
                                            <tr><td colSpan="3" className="p-6 text-center text-black/40">Loading...</td></tr>
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

                        <div className="p-6 border-t border-black/10 bg-white md:rounded-b-[2.5rem]">
                            <div className="flex justify-between items-center text-white p-5 rounded-2xl shadow-lg" style={{ backgroundColor: PRIMARY }}>
                                <span className="text-xs font-black uppercase tracking-widest text-white/60">Grand Total</span>
                                <span className="text-xl font-black">₹{Number(selectedBill.total || selectedBill.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
      `}</style>
        </div>
    );
}

export default Reports;