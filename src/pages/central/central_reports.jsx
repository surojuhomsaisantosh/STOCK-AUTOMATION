import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ArrowLeft, Search, Calendar, Download,
    RotateCcw, Building2, Layers,
    X, TrendingUp, MapPin, ShoppingBag, ChevronDown, ChevronUp,
    AlertTriangle, AlertOctagon, CheckCircle2
} from "lucide-react";

// --- CONFIGURATION ---
const PRIMARY = "rgb(0, 100, 55)";
const PRIMARY_LIGHT = "rgba(0, 100, 55, 0.1)";
const CACHE_KEY = "reports_data_cache";
const CACHE_COMPANIES_KEY = "reports_companies_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes

// --- SAFE SESSIONSTORAGE HELPERS ---
const safeGetCache = (key) => {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const safeSetCache = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Quota exceeded or storage unavailable — silently ignore
    }
};

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

    // --- BILL ITEMS CACHE (in-memory + sessionStorage) ---
    const billItemsCache = useRef({});

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

    // --- DATA DELETION COUNTDOWN ---
    const [oldestRecordDate, setOldestRecordDate] = useState(null);
    const [daysUntilDeletion, setDaysUntilDeletion] = useState(null);

    // --- SORT STATE ---
    const [sortKey, setSortKey] = useState(null); // null | 'company' | 'owner' | 'date' | 'mode' | 'amount'
    const [sortDir, setSortDir] = useState("asc"); // 'asc' | 'desc'

    // --- DB DROPDOWN FETCHING (with sessionStorage cache) ---
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                // Try cache first
                const cached = safeGetCache(CACHE_COMPANIES_KEY);
                if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                    setDbCompanyList(cached.data);
                    return;
                }

                const { data, error } = await supabase.from('companies').select('company_name');
                if (error) throw error;
                if (data) {
                    const unique = [...new Set(data.map(c => c.company_name).filter(Boolean))].sort();
                    setDbCompanyList(unique);
                    safeSetCache(CACHE_COMPANIES_KEY, { data: unique, timestamp: Date.now() });
                }
            } catch (e) {
                console.error("Error fetching companies:", e);
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
            try {
                // Try cache first
                const cacheKey = `reports_franchises_${selectedCompany}`;
                const cached = safeGetCache(cacheKey);
                if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                    setDbFranchiseList(cached.data);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('franchise_id')
                    .eq('company', selectedCompany)
                    .neq('franchise_id', null);

                if (error) throw error;
                if (data) {
                    const unique = [...new Set(data.map(p => p.franchise_id).filter(Boolean))].sort();
                    setDbFranchiseList(unique);
                    safeSetCache(cacheKey, { data: unique, timestamp: Date.now() });
                }
            } catch (e) {
                console.error("Error fetching franchises:", e);
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
                const cached = safeGetCache(CACHE_KEY);
                if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                    setRawData(cached.data);
                    if (cached.profile) setProfile(cached.profile);
                    setLoading(false);
                    return;
                }
            }

            // Fetch user profile once
            let userProfile = null;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
                userProfile = data;
                setProfile(data);
            }

            // Fetch Data in Parallel
            const [billsReq, bItemsReq, invReq, iItemsReq, profilesReq] = await Promise.all([
                supabase.from("bills_generated").select("*").order("created_at", { ascending: false }),
                supabase.from("bills_items_generated").select("bill_id, item_name, qty, price"),
                supabase.from("invoices").select("*").order("created_at", { ascending: false }),
                supabase.from("invoice_items").select("invoice_id, item_name, quantity, price"),
                supabase.from("profiles").select("franchise_id, branch_location, address, company, name")
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
                owner_name: profileMap[bill.franchise_id]?.name || "",
                mapped_location: profileMap[bill.franchise_id]?.branch_location || "",
                mapped_address: profileMap[bill.franchise_id]?.address || "Location not updated"
            }));

            const enrichedInvoices = (invReq.data || []).map(inv => {
                const fid = inv.franchise_id;
                return {
                    ...inv,
                    company: profileMap[fid]?.company || "Unknown Company",
                    owner_name: profileMap[fid]?.name || "",
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
            safeSetCache(CACHE_KEY, { data: finalData, profile: userProfile, timestamp: Date.now() });

        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Fetch oldest record for selected franchise (deletion countdown) ---
    useEffect(() => {
        if (!selectedFranchise || selectedFranchise === "all") {
            setOldestRecordDate(null);
            setDaysUntilDeletion(null);
            return;
        }

        const fetchOldestForFranchise = async () => {
            const cacheKey = `reports_oldest_${selectedFranchise}`;
            const cached = safeGetCache(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                setOldestRecordDate(cached.date ? new Date(cached.date) : null);
                setDaysUntilDeletion(cached.days);
                return;
            }

            try {
                const { data: oldestData } = await supabase
                    .from("bills_generated")
                    .select("created_at")
                    .eq("franchise_id", selectedFranchise)
                    .order("created_at", { ascending: true })
                    .limit(1);

                let oDate = null;
                let dUntil = 45;

                if (oldestData && oldestData.length > 0) {
                    oDate = new Date(oldestData[0].created_at);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const oldestDay = new Date(oDate);
                    oldestDay.setHours(0, 0, 0, 0);
                    const ageInDays = Math.floor((today.getTime() - oldestDay.getTime()) / (1000 * 60 * 60 * 24));
                    dUntil = 45 - ageInDays;
                }

                setOldestRecordDate(oDate);
                setDaysUntilDeletion(dUntil);
                safeSetCache(cacheKey, { date: oDate, days: dUntil, timestamp: Date.now() });
            } catch (err) {
                console.error("Error fetching oldest record:", err);
            }
        };

        fetchOldestForFranchise();
    }, [selectedFranchise]);

    const handleRefresh = () => {
        setSearch(""); setStartDate(""); setEndDate(""); setSelectedCompany("all"); setSelectedFranchise("all"); setDateMode("single");
        setSortKey(null); setSortDir("asc");
        fetchData(true);
    };

    const handleSort = (key) => {
        if (sortKey === key) {
            if (sortDir === "asc") setSortDir("desc");
            else { setSortKey(null); setSortDir("asc"); } // third click resets
        } else {
            setSortKey(key); setSortDir("asc");
        }
    };

    const SortIcon = ({ columnKey }) => {
        if (sortKey !== columnKey) return <ChevronDown size={12} className="opacity-20 ml-1 inline" />;
        return sortDir === "asc"
            ? <ChevronUp size={12} className="ml-1 inline" style={{ color: PRIMARY }} />
            : <ChevronDown size={12} className="ml-1 inline" style={{ color: PRIMARY }} />;
    };

    const handleDateModeChange = (mode) => {
        setDateMode(mode); setStartDate(""); setEndDate("");
    };

    const handleDownload = () => {
        if (!filteredData.length) return alert("No data to export!");
        const isStore = activeTab === "store";
        
        // Calculate stats for export summary
        const eTotalSales = filteredData.reduce((sum, b) => sum + Number(b.total ?? b.total_amount ?? 0), 0);
        const eUpiSales = filteredData.reduce((sum, b) => ((b.payment_mode || "").toUpperCase() === "UPI" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
        const eCashSales = filteredData.reduce((sum, b) => ((b.payment_mode || "").toUpperCase() === "CASH" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
        const eTotalDiscount = filteredData.reduce((sum, b) => sum + Number(b.discount ?? 0), 0);
        const eTotalOrders = filteredData.length;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `${isStore ? "Store Sales" : "Supply Invoices"} Report\n\n`;

        csvContent += "=== SUMMARY ===\n";
        csvContent += `Total ${isStore ? "Bills" : "Invoices"},${eTotalOrders}\n`;
        csvContent += `Total Amount (INR),${eTotalSales.toFixed(2)}\n`;
        if (isStore) {
            csvContent += `UPI Amount (INR),${eUpiSales.toFixed(2)}\n`;
            csvContent += `Cash Amount (INR),${eCashSales.toFixed(2)}\n`;
            csvContent += `Total Discount (INR),${eTotalDiscount.toFixed(2)}\n`;
        }
        csvContent += "\n";

        csvContent += `=== DETAILED TRANSACTIONS ===\n`;
        let headers = [];
        if (isStore) {
            headers = ["S.No", "Company", "Bill/Invoice ID", "Franchise ID", "Branch Name", "Date", "Time", "Payment Mode", "Discount (INR)", "Total Amount (INR)"];
        } else {
            headers = ["S.No", "Company", "Bill/Invoice ID", "Franchise ID", "Branch Name", "Date", "Time", "Total Amount (INR)"];
        }

        const rows = filteredData.map((item, index) => {
            const id = item.id;
            const fid = item.franchise_id || "Head Office";
            const company = item.company || "Unknown";
            const name = (item.mapped_location || item.customer_name || "Standard Sale").replace(/,/g, " ");
            const dateObj = new Date(item.created_at);
            const amount = item.total || item.total_amount || 0;
            
            if (isStore) {
                const mode = item.payment_mode || "N/A";
                const discount = item.discount || 0;
                return [index + 1, company, id, fid, name, dateObj.toLocaleDateString('en-IN'), dateObj.toLocaleTimeString('en-US'), mode, discount, amount].join(",");
            } else {
                return [index + 1, company, id, fid, name, dateObj.toLocaleDateString('en-IN'), dateObj.toLocaleTimeString('en-US'), amount].join(",");
            }
        });

        csvContent += headers.join(",") + "\n" + rows.join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Sales_Report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openDetails = async (bill) => {
        setSelectedBill(bill);
        const isStore = activeTab === "store";
        const cacheKey = `${isStore ? "bill" : "inv"}_${bill.id}`;

        // Check in-memory cache first
        if (billItemsCache.current[cacheKey]) {
            setCurrentBillItems(billItemsCache.current[cacheKey]);
            return;
        }

        // Check sessionStorage cache
        const sessionCached = safeGetCache(`reports_items_${cacheKey}`);
        if (sessionCached) {
            billItemsCache.current[cacheKey] = sessionCached;
            setCurrentBillItems(sessionCached);
            return;
        }

        // Network fetch as last resort
        setModalLoading(true);
        try {
            const { data, error } = await supabase
                .from(isStore ? "bills_items_generated" : "invoice_items")
                .select("*")
                .eq(isStore ? "bill_id" : "invoice_id", bill.id);
            if (error) throw error;
            const items = data || [];
            billItemsCache.current[cacheKey] = items;
            safeSetCache(`reports_items_${cacheKey}`, items);
            setCurrentBillItems(items);
        } catch (e) {
            console.error("Error fetching bill items:", e);
            setCurrentBillItems([]);
        } finally {
            setModalLoading(false);
        }
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

    // --- SORTED DATA ---
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;
        const sorted = [...filteredData].sort((a, b) => {
            let valA, valB;
            switch (sortKey) {
                case 'company':
                    valA = (a.company || '').toLowerCase();
                    valB = (b.company || '').toLowerCase();
                    return valA.localeCompare(valB);
                case 'owner':
                    valA = (a.owner_name || a.mapped_location || '').toLowerCase();
                    valB = (b.owner_name || b.mapped_location || '').toLowerCase();
                    return valA.localeCompare(valB);
                case 'date':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'mode':
                    valA = (a.payment_mode || '').toLowerCase();
                    valB = (b.payment_mode || '').toLowerCase();
                    return valA.localeCompare(valB);
                case 'amount':
                    return (Number(a.total ?? a.total_amount ?? 0)) - (Number(b.total ?? b.total_amount ?? 0));
                default:
                    return 0;
            }
        });
        return sortDir === 'desc' ? sorted.reverse() : sorted;
    }, [filteredData, sortKey, sortDir]);

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

    const chartYDomain = useMemo(() => {
        if (!chartData.length) return [0, 1000];
        const maxVal = Math.max(...chartData.map(d => d.revenue));
        return [0, Math.ceil(maxVal * 1.1)]; // 10% headroom
    }, [chartData]);

    const stats = useMemo(() => {
        const totalSales = filteredData.reduce((sum, b) => sum + Number(b.total ?? b.total_amount ?? 0), 0);
        const upiSales = filteredData.reduce((sum, b) => ((b.payment_mode || "").toUpperCase() === "UPI" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
        const cashSales = filteredData.reduce((sum, b) => ((b.payment_mode || "").toUpperCase() === "CASH" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
        const totalDiscount = filteredData.reduce((sum, b) => sum + Number(b.discount ?? 0), 0);
        const totalOrders = filteredData.length;
        return { totalSales, upiSales, cashSales, totalDiscount, totalOrders };
    }, [filteredData]);

    // --- DATA DELETION COUNTDOWN BANNER ---
    const renderDeletionBanner = () => {
        if (activeTab !== "store") return null;
        if (!selectedFranchise || selectedFranchise === "all") return null;

        if (!oldestRecordDate && !loading) {
            return (
                <div className="deletion-banner deletion-banner-success">
                    <div className="deletion-banner-icon"><CheckCircle2 size={20} /></div>
                    <div className="deletion-banner-text">
                        <strong>🎉 Day 1!</strong> Franchise <strong>{selectedFranchise}</strong> has no bills yet. The system is perfectly clean. You have <strong>45 days to go</strong> before any old data is deleted!
                    </div>
                </div>
            );
        }

        if (oldestRecordDate && daysUntilDeletion !== null) {
            const formattedDate = oldestRecordDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });

            if (daysUntilDeletion <= 0) {
                return (
                    <div className="deletion-banner deletion-banner-urgent">
                        <div className="deletion-banner-icon"><AlertOctagon size={20} /></div>
                        <div className="deletion-banner-text">
                            <strong>🚨 ACTION NEEDED:</strong> Franchise <strong>{selectedFranchise}</strong> — oldest bills from <span className="deletion-date-highlight">{formattedDate}</span> are 45 days old. They will be deleted <strong>TONIGHT</strong>. Click 'Download CSV' to save them right now!
                        </div>
                    </div>
                );
            }

            if (daysUntilDeletion <= 5) {
                return (
                    <div className="deletion-banner deletion-banner-warning">
                        <div className="deletion-banner-icon"><AlertTriangle size={20} /></div>
                        <div className="deletion-banner-text">
                            <strong>⚠️ Heads Up:</strong> Franchise <strong>{selectedFranchise}</strong> — oldest bill is from <span className="deletion-date-highlight">{formattedDate}</span>. It will be deleted in exactly <strong>{daysUntilDeletion} days</strong>. Click 'Download CSV' to save a copy.
                        </div>
                    </div>
                );
            }

            return (
                <div className="deletion-banner deletion-banner-success">
                    <div className="deletion-banner-icon"><CheckCircle2 size={20} /></div>
                    <div className="deletion-banner-text">
                        <strong>✅ Safe Zone:</strong> Franchise <strong>{selectedFranchise}</strong> — oldest bill is from <span className="deletion-date-highlight">{formattedDate}</span>. You still have <strong>{daysUntilDeletion} days to go</strong> before it gets deleted.
                    </div>
                </div>
            );
        }
        return null;
    };

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

                {/* Data Deletion Countdown Banner */}
                {renderDeletionBanner()}

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-stretch">
                    <div className="flex flex-col gap-3 lg:col-span-2 min-w-0 h-full">
                        <div className="bg-white p-5 md:p-6 rounded-[2.5rem] border border-black/10 shadow-sm flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl text-black" style={{ backgroundColor: PRIMARY_LIGHT }}><TrendingUp size={18} /></div>
                                <span className="text-xs font-black uppercase text-black/40 tracking-widest">Earnings Trend</span>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar" style={{ width: '100%' }}>
                                <div style={{ minWidth: Math.max(500, chartData.length * 55) + 'px', height: '210px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#000000' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#000000' }} tickFormatter={(v) => `₹${v}`} width={50} domain={chartYDomain} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={3} fill={PRIMARY} fillOpacity={0.05} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards Row */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">TOTAL {activeTab === "store" ? "SALES" : "AMOUNT"}</span>
                                <span className="text-xl md:text-2xl font-black text-black">₹{stats.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">TOTAL {activeTab === "store" ? "BILLS" : "ORDERS"}</span>
                                <span className="text-xl md:text-2xl font-black text-indigo-500">{stats.totalOrders}</span>
                            </div>

                            {activeTab === "store" && (
                                <>
                                    <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-sm flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">UPI SALES</span>
                                        <span className="text-xl md:text-2xl font-black text-blue-600">₹{stats.upiSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-sm flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">CASH SALES</span>
                                        <span className="text-xl md:text-2xl font-black text-emerald-600">₹{stats.cashSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-5 md:p-6 rounded-[2.5rem] border border-black/10 shadow-sm min-w-0 flex flex-col shrink-0" style={{ maxHeight: '520px' }}>
                        <div className="flex items-center gap-2 mb-3 shrink-0">
                            <div className="p-2 rounded-xl text-black" style={{ backgroundColor: PRIMARY_LIGHT }}><ShoppingBag size={18} /></div>
                            <span className="text-xs font-black uppercase text-black/40 tracking-widest">Top 10 Selling</span>
                        </div>
                        <div style={{ width: '100%', height: '160px', marginBottom: '10px' }} className="shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={itemPieData} innerRadius={38} outerRadius={58} paddingAngle={5} dataKey="value">
                                        {itemPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="flex text-[9px] font-black text-black/40 uppercase tracking-widest border-b border-black/10 pb-2 mb-2 shrink-0">
                            <div className="w-10 text-center">#</div>
                            <div className="flex-1 text-left pl-1">Item Name</div>
                            <div className="w-16 text-right">Qty</div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                            {itemPieData.length === 0 && <div className="text-center text-xs text-black/40 uppercase font-bold py-4">No Data Available</div>}
                            {itemPieData.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-xs border-b border-black/5 py-2.5 last:border-0 hover:bg-black/5 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                                        <div 
                                            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-black mx-1" 
                                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                        >
                                            {i + 1}
                                        </div>
                                        <span className="font-bold text-black truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center shrink-0 w-16 justify-end">
                                        <span className="font-black text-black">{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                    <th className="p-5 tracking-widest bg-white cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => handleSort('company')}>Company<SortIcon columnKey="company" /></th>
                                    <th className="p-5 tracking-widest bg-white cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => handleSort('owner')}>Owner Name<SortIcon columnKey="owner" /></th>
                                    <th className="p-5 tracking-widest bg-white cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => handleSort('date')}>Date<SortIcon columnKey="date" /></th>
                                    {activeTab === "store" && <th className="p-5 tracking-widest bg-white text-center cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => handleSort('mode')}>Mode<SortIcon columnKey="mode" /></th>}
                                    <th className="p-5 tracking-widest text-right bg-white cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => handleSort('amount')}>Amount<SortIcon columnKey="amount" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 text-sm font-bold text-black">
                                {sortedData.length === 0 ? (
                                    <tr><td colSpan="7" className="p-10 text-center text-black/40">No records found.</td></tr>
                                ) : sortedData.map((item, index) => (
                                    <tr key={item.id} onClick={() => openDetails(item)} className="hover:bg-black/5 cursor-pointer transition-colors">
                                        <td className="p-5 text-black/40">{index + 1}</td>
                                        <td className="p-5">
                                            <span className="bg-black/5 text-black px-2 py-1 rounded-md text-[10px]">#{item.id.toString().slice(-8)}</span>
                                            <div className="text-[10px] text-black/40 mt-1">{item.franchise_id}</div>
                                        </td>
                                        <td className="p-5 text-xs text-black/60 uppercase">{item.company || "Unknown"}</td>
                                        <td className="p-5 text-xs uppercase">{item.owner_name || item.mapped_location || "N/A"}</td>
                                        <td className="p-5 text-black/60 text-[11px] font-bold uppercase">{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        {activeTab === "store" && (
                                            <td className="p-5 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase inline-block ${(item.payment_mode || '').toUpperCase() === 'UPI' ? 'bg-blue-50 text-blue-600' : (item.payment_mode || '').toUpperCase() === 'CASH' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                                    {item.payment_mode || 'N/A'}
                                                </span>
                                            </td>
                                        )}
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
                                        <h3 className="text-sm font-black text-black uppercase">{item.owner_name || item.mapped_location || "N/A"}</h3>
                                        <p className="text-[10px] text-black/50 uppercase mt-1 flex items-center gap-1"><Building2 size={10} /> {item.company || "Unknown"} • {item.franchise_id}</p>
                                        {activeTab === "store" && (
                                            <div className="mt-2 text-left">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase inline-block ${(item.payment_mode || '').toUpperCase() === 'UPI' ? 'bg-blue-50 text-blue-600' : (item.payment_mode || '').toUpperCase() === 'CASH' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                                    {item.payment_mode || 'N/A'}
                                                </span>
                                            </div>
                                        )}
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
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1">Owner</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.owner_name || "N/A"}</p>
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1 mt-3">Location</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.mapped_location || "Branch not set"}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-black/10">
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1">Company</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.company || "Unknown"}</p>
                                    <label className="text-[9px] font-black text-black/40 uppercase block mb-1 mt-3">Franchise ID</label>
                                    <p className="text-xs font-bold text-black">{selectedBill.franchise_id || "N/A"}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-black/10 mb-6">
                                <label className="text-[9px] font-black text-black/40 uppercase block mb-2">Branch Location</label>
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-black shrink-0 mt-0.5" />
                                    <p className="text-xs text-black font-medium">{selectedBill.customer_address || selectedBill.mapped_address || "Location not provided"}</p>
                                </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }

        /* --- Data Deletion Countdown Banner --- */
        .deletion-banner { padding: 14px 18px; border-radius: 16px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; border: 1px solid; border-left: 4px solid; transition: all 0.3s ease; }
        .deletion-banner-text { font-size: 12px; line-height: 1.6; font-weight: 600; }
        .deletion-banner-text strong { font-weight: 900; }
        .deletion-date-highlight { font-weight: 800; padding: 2px 6px; border-radius: 4px; }

        .deletion-banner-success { background: #ecfdf5; border-color: #a7f3d0; border-left-color: #10b981; }
        .deletion-banner-success .deletion-banner-icon { color: #059669; margin-top: 2px; }
        .deletion-banner-success .deletion-banner-text { color: #065f46; }
        .deletion-banner-success .deletion-banner-text strong { color: #064e3b; }
        .deletion-banner-success .deletion-date-highlight { background: #d1fae5; }

        .deletion-banner-warning { background: #fffbeb; border-color: #fde68a; border-left-color: #f59e0b; }
        .deletion-banner-warning .deletion-banner-icon { color: #d97706; margin-top: 2px; }
        .deletion-banner-warning .deletion-banner-text { color: #92400e; }
        .deletion-banner-warning .deletion-banner-text strong { color: #b45309; }
        .deletion-banner-warning .deletion-date-highlight { background: #fef3c7; }

        .deletion-banner-urgent { background: #fef2f2; border-color: #fecaca; border-left-color: #ef4444; }
        .deletion-banner-urgent .deletion-banner-icon { color: #dc2626; margin-top: 2px; }
        .deletion-banner-urgent .deletion-banner-text { color: #991b1b; }
        .deletion-banner-urgent .deletion-banner-text strong { color: #7f1d1d; }
        .deletion-banner-urgent .deletion-date-highlight { background: #fee2e2; }
      `}</style>
        </div>
    );
}

export default Reports;