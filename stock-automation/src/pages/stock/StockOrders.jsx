import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiPackage,
  FiTruck, FiRotateCcw, FiChevronRight, FiX, FiFileText, FiClock,
  FiArrowUp, FiArrowDown
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

// --- ASSET IMPORTS ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

// --- CONSTANTS & HELPERS ---
const TABS = ["all", "incoming", "packed", "dispatched"];
const BRAND_COLOR = "rgb(0, 100, 55)";

const numberToWords = (num) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.toUpperCase() + ' RUPEES ONLY';
};

// --- UPDATED DATE TIME HELPER ---
const formatDateTime = (dateString, timeText = null) => {
  if (!dateString) return "N/A";
  
  const dateObj = new Date(dateString);
  
  // Format the Date part (DD MMM YY)
  const datePart = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit'
  });

  // 1. If we have explicit time text from DB, use it (Most Accurate)
  if (timeText) {
    return `${datePart}, ${timeText}`;
  }

  // 2. Fallback: Convert timestamp to local time
  return dateObj.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

function StockOrders() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]); 
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // SESSION STORAGE: Keep user on the same tab if they refresh
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem("stock_active_tab") || "all"; } catch (e) { return "all"; }
  });
  
  // SORTING STATE
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  const [dateMode, setDateMode] = useState("date"); 
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  // --- 1. INITIAL FETCH & REALTIME SUBSCRIPTION ---
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    
    if (!authLoading && authUser) {
        fetchOrders();
        fetchCompanies();

        const subscription = supabase
          .channel('invoices_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
             fetchOrders();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [authUser, authLoading]);

  // --- 2. PERSIST TAB STATE ---
  useEffect(() => {
    try { sessionStorage.setItem("stock_active_tab", activeTab); } catch (e) {}
  }, [activeTab]);

  // --- 3. LOCK SCROLL ON MODAL ---
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedOrder]);

  // --- 4. HANDLE BROWSER BACK BUTTON ---
  useEffect(() => {
    const handlePopState = () => {
      if (selectedOrder) setSelectedOrder(null);
    };

    if (selectedOrder) {
      window.history.pushState('modal-open', '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedOrder]);

  const handleCloseModal = () => {
    setSelectedOrder(null);
    if (window.history.state === 'modal-open') window.history.back();
  };

  const fetchOrders = async () => {
    if(orders.length === 0) setLoading(true); 
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, invoice_items (*, stocks ( hsn_code ))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
        const cachedCompanies = sessionStorage.getItem("cached_companies");
        if(cachedCompanies) {
            setCompanies(JSON.parse(cachedCompanies));
            return;
        }
    } catch(e) { sessionStorage.removeItem("cached_companies"); }

    try {
        const { data, error } = await supabase.from("companies").select("*");
        if (error) throw error;
        setCompanies(data || []);
        try { sessionStorage.setItem("cached_companies", JSON.stringify(data)); } catch(e){}
    } catch (err) {
        console.error("Error fetching companies:", err);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setActiveTab("all");
    setSortConfig({ key: 'created_at', direction: 'desc' });
  };

  // --- SORTING LOGIC ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredOrders = useMemo(() => {
    // 1. Filter
    let result = orders.filter((o) => {
      const statusMatch = activeTab === "all" || o.status?.toLowerCase() === activeTab;
      const searchMatch = (o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase()));

      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      let dateMatch = true;

      if (dateMode === "date" && singleDate) dateMatch = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) dateMatch = orderDate >= startDate && orderDate <= endDate;

      return statusMatch && searchMatch && dateMatch;
    });

    // 2. Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle Status string comparison
        if(sortConfig.key === 'status') {
            aVal = aVal?.toLowerCase() || '';
            bVal = bVal?.toLowerCase() || '';
        }
        // Handle Date comparison
        if (sortConfig.key === 'created_at') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
        }
        // Handle Number comparison
        if (sortConfig.key === 'total_amount') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [orders, activeTab, searchTerm, dateMode, singleDate, startDate, endDate, sortConfig]);

  const stats = useMemo(() => ({
    incoming: orders.filter(o => o.status === 'incoming').length,
    packed: orders.filter(o => o.status === 'packed').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
  }), [orders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleWhatsApp = (order) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) return alert("Missing phone number");
    const message = `ORDER STATUS: ${order.status?.toUpperCase()}%0AHello ${order.customer_name}, your order is being processed!`;
    window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, "_blank");
  };

  const getCompanyDetails = (franchiseId) => {
    return companies.find(c => c.franchise_id === franchiseId) || companies[0] || {};
  };

  const getCompanyLogo = (companyName) => {
    if (!companyName) return null;
    const name = companyName.toLowerCase();
    if (name.includes("t vanamm") || name.includes("t-vanamm")) return tvanammLogo;
    if (name.includes("leaf")) return tleafLogo;
    if (name.includes("jksh") || name.includes("j.k.s.h")) return jkshLogo;
    return null; 
  };

  // Helper for Table Header Sort Icon
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="opacity-20 flex flex-col ml-1"><FiArrowUp size={8}/><FiArrowDown size={8}/></span>;
    return sortConfig.direction === 'asc' 
      ? <FiArrowUp size={12} className="ml-1 text-black" /> 
      : <FiArrowDown size={12} className="ml-1 text-black" />;
  };

  return (
    <div className="min-h-screen bg-white text-black pb-12 overflow-x-hidden font-sans print:bg-white print:p-0 print:overflow-visible selection:bg-black/10">
      
      {/* --- STYLES --- */}
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: white; }
            body * { visibility: hidden; }
            .print-invoice-container, .print-invoice-container * { visibility: visible; }
            .print-invoice-container {
                position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                margin: 0; padding: 0; display: block !important; background: white;
            }
            .invoice-page { page-break-after: always; break-after: page; height: 296mm; width: 210mm; position: relative; overflow: hidden; }
            .invoice-page:last-child { page-break-after: auto; break-after: auto; }
            nav, .dashboard-content, .modal-ui-controls { display: none !important; }
          }
        `}
      </style>

      {/* NAV */}
      <nav className="sticky top-0 z-[60] bg-white/95 backdrop-blur-sm border-b border-black/5 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-4 z-20 shrink-0">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 -ml-2 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all text-black">
                <FiArrowLeft size={20} />
                <span className="font-bold text-sm">Back</span>
            </button>
        </div>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[60%] text-center pointer-events-none z-10">
            <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter text-black truncate">Manage Orders</h1>
        </div>

        <div className="flex items-center gap-3 z-20 shrink-0">
             {/* Rectangular Box for ID */}
             <div className="bg-slate-100 px-4 py-2 rounded-lg text-[10px] font-black border border-black/10 text-black flex items-center gap-1 shadow-sm">
                <span className="text-black/50">ID:</span>
                <span>{authUser?.franchise_id || "HQ"}</span>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6 dashboard-content print:hidden">
        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "New Orders", val: stats.incoming, color: BRAND_COLOR },
            { label: "In Packing", val: stats.packed, color: BRAND_COLOR },
            { label: "Dispatched", val: stats.dispatched, color: BRAND_COLOR },
            { label: "Today", val: todayDisplay, isDate: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-black/10 p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[9px] font-bold uppercase text-black/60 mb-1">{stat.label}</p>
              <p className={`${stat.isDate ? 'text-xs' : 'text-2xl'} font-black truncate`} style={{ color: stat.isDate ? 'black' : stat.color }}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="bg-white border border-black/10 p-4 rounded-[2rem] shadow-sm space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              placeholder="Search Client or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 transition-all text-black uppercase placeholder:text-black/30"
              style={{ '--tw-ring-color': BRAND_COLOR }}
            />
          </div>

          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex w-full bg-slate-100 p-1 rounded-2xl gap-1 min-w-max">
                {TABS.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase transition-all duration-200 min-w-[80px]
                    ${activeTab === tab ? 'text-white shadow-md' : 'text-black/60 hover:text-black hover:bg-white/50'}`}
                    style={activeTab === tab ? { backgroundColor: BRAND_COLOR } : {}}
                >
                    {tab}
                </button>
                ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-black/5 w-full lg:w-auto">
              <div className="flex justify-between sm:justify-start items-center w-full lg:w-auto gap-4">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-black/40 shrink-0" />
                    <span className="text-[10px] font-bold text-black/40 md:hidden uppercase whitespace-nowrap">Filter Date</span>
                  </div>
                  <div className="flex bg-slate-200 p-1 rounded-lg shrink-0">
                    <button onClick={() => setDateMode('date')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'date' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}>Date</button>
                    <button onClick={() => setDateMode('range')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'range' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}>Range</button>
                  </div>
              </div>
              <div className="hidden sm:block w-[1px] h-6 bg-black/10 mx-1" />
              <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-center">
                  {dateMode === "date" ? (
                    <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[11px] font-bold outline-none w-full sm:w-auto sm:flex-1 text-black min-w-[130px] py-2 sm:py-1 border-b sm:border-none border-black/10" />
                  ) : (
                    <div className="flex flex-row items-center gap-2 w-full lg:w-auto sm:min-w-[260px]">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0 py-2 sm:py-1 border-b sm:border-none border-black/10" />
                      <span className="text-black/40 font-bold">-</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0 py-2 sm:py-1 border-b sm:border-none border-black/10" />
                    </div>
                  )}
              </div>
            </div>
            <button onClick={resetFilters} className="p-4 bg-slate-100 text-black/50 rounded-2xl active:bg-black active:text-white transition-all flex justify-center w-full lg:w-auto hover:bg-slate-200"><FiRotateCcw /></button>
          </div>
        </div>

        {/* LIST VIEW (Mobile & Tablet) / TABLE VIEW (Laptop+) */}
        {isMobileView ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full text-center py-20 text-black/30 font-bold uppercase text-[10px] tracking-widest">No matching orders</div>
            ) : filteredOrders.map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white border border-black/10 p-5 rounded-[2rem] shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer hover:border-black/30">
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-black/50 uppercase tracking-widest truncate">{order.franchise_id || "TV-GEN"}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border whitespace-nowrap ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-black/60'}`}>{order.status}</span>
                  </div>
                  <h3 className="font-black text-sm uppercase leading-none text-black truncate">{order.customer_name}</h3>
                  {/* UPDATED: Pass order_time_text to helper */}
                  <p className="text-[10px] font-bold text-black/60 truncate flex items-center gap-1">
                     <FiClock size={10} /> {formatDateTime(order.created_at, order.order_time_text)}
                  </p>
                  <p className="text-[10px] font-bold text-black/60 truncate">Total: ₹{order.total_amount}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-black/20 shrink-0"><FiChevronRight size={20} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
            <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full text-left min-w-[800px] relative border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-gray-200">
                    <tr className="text-black uppercase text-[10px] font-black">
                        {/* Serial Number: No Sort */}
                        <th className="px-6 py-4 cursor-default">
                            <div className="flex items-center gap-1">Serial</div>
                        </th>
                        {/* Sortable Columns */}
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('created_at')}>
                            <div className="flex items-center gap-1">Date & Time <SortIcon column="created_at" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('franchise_id')}>
                             <div className="flex items-center gap-1">Franchise ID <SortIcon column="franchise_id" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('customer_name')}>
                             <div className="flex items-center gap-1">Customer Name <SortIcon column="customer_name" /></div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('status')}>
                             <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('total_amount')}>
                             <div className="flex items-center justify-end gap-1">Total <SortIcon column="total_amount" /></div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-xs">
                    {filteredOrders.map((order, idx) => (
                    <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                        <td className="px-6 py-6 text-black/60 group-hover:text-black">{(idx + 1).toString().padStart(2, '0')}</td>
                        {/* UPDATED: Pass order_time_text */}
                        <td className="px-6 py-6 text-black whitespace-nowrap">{formatDateTime(order.created_at, order.order_time_text)}</td>
                        <td className="px-6 py-6 uppercase font-black text-black">{order.franchise_id}</td>
                        <td className="px-6 py-6 uppercase font-black text-black">{order.customer_name}</td>
                        <td className="px-6 py-6 uppercase">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-black/60'}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-6 text-right font-black text-black">₹{order.total_amount}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:items-center lg:justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 print:bg-white print:p-0 print:absolute print:inset-0">
          
          <div className="bg-white w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden lg:h-[80vh] lg:rounded-[3rem] lg:border-[6px] lg:border-slate-100 rounded-t-[2.5rem] h-[95dvh] modal-ui-controls print:hidden transition-all">
            
            {/* Modal Header */}
            <div className="p-5 lg:p-8 border-b border-black/5 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{selectedOrder.status}</span>
                  <span className="text-[10px] font-bold text-black/40 uppercase truncate">REF: {selectedOrder.id.substring(0, 8)}</span>
                  {/* UPDATED: Modal Time Display */}
                  <span className="text-[10px] font-bold text-black/60 flex items-center gap-1">
                      <FiClock size={10}/> {formatDateTime(selectedOrder.created_at, selectedOrder.order_time_text)}
                  </span>
                </div>
                <h2 className="text-xl lg:text-3xl font-black uppercase tracking-tight leading-none text-black truncate">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={handleCloseModal} className="p-3 lg:p-4 bg-slate-100 rounded-2xl active:bg-black active:text-white transition-all text-black hover:bg-slate-200 shrink-0"><FiX size={24} /></button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-5 lg:p-10 space-y-6 lg:space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 h-full">
                
                {/* Shipping Info Card */}
                <div className="bg-white p-6 rounded-3xl border border-black/10 shadow-sm space-y-4 h-fit md:h-full md:overflow-y-auto overscroll-contain custom-scrollbar">
                  <h4 className="text-[10px] font-black text-black/50 uppercase tracking-widest flex items-center gap-2"><FiUser /> Shipping Info</h4>
                  <div className="space-y-3 text-[11px] font-bold uppercase">
                    <div className="flex justify-between border-b pb-2 border-slate-50 text-black">
                        <span>Franchise ID</span>
                        <span className="text-right">{selectedOrder.franchise_id || "N/A"}</span>
                    </div>
                    
                    <div className="flex justify-between border-b pb-2 border-slate-50 text-black">
                        <span>Phone</span>
                        <span className="text-right">{selectedOrder.customer_phone || "N/A"}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-black">
                        <span>Address:</span>
                        <span className="text-black/70 leading-relaxed font-black break-words">
                            {selectedOrder.customer_address || "No address provided."}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Items Card */}
                <div className="bg-white p-6 rounded-3xl border border-black/10 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h4 className="text-[10px] font-black text-black/50 uppercase tracking-widest flex items-center gap-2"><FiPackage /> Items List</h4>
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase text-black">{selectedOrder.invoice_items?.length} Items</span>
                  </div>
                  
                  {/* UNIFIED SCROLLABLE AREA for Items AND Breakdown */}
                  <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar pr-2 pb-2">
                    <div className="space-y-3 mb-6">
                        {selectedOrder.invoice_items?.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-black/5">
                            <div className="flex-1 pr-4 min-w-0">
                            <p className="text-[11px] font-black uppercase truncate text-black">{item.item_name}</p>
                            <p className="text-[9px] font-bold text-black/50 uppercase">{item.quantity} {item.unit}</p>
                            </div>
                            <span className="font-black text-xs tracking-tighter text-black shrink-0">₹{item.price}</span>
                        </div>
                        ))}
                    </div>

                    {/* SCROLLING PRICE BREAKDOWN */}
                    <div className="pt-4 border-t-2 border-dashed border-black/10 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black/60">
                            <span>Sub Total</span>
                            <span>₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black/60">
                            <span>CGST</span>
                            <span>₹{(Number(selectedOrder.tax_amount || 0) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black/60">
                            <span>SGST</span>
                            <span>₹{(Number(selectedOrder.tax_amount || 0) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black/60">
                            <span>Round Off</span>
                            <span>{Number(selectedOrder.round_off || 0) > 0 ? '+' : ''}{Number(selectedOrder.round_off || 0).toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-black/5 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-black uppercase">Grand Total</span>
                            <span className="text-2xl font-black tracking-tighter text-black">₹{selectedOrder.total_amount}</span>
                        </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Modal Footer - Actions */}
            <div className={`p-5 lg:p-8 bg-white border-t border-black/5 z-20 flex flex-col md:flex-row gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] shrink-0 ${isMobileView ? 'pb-8' : ''}`}>
              <div className="flex-1 flex gap-2">
                <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-100 text-black/70 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-slate-200 transition-all hover:bg-slate-200">Print</button>
                <button onClick={() => handleWhatsApp(selectedOrder)} className="flex-1 py-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-emerald-100 transition-all flex items-center justify-center gap-2 hover:bg-emerald-100"><FaWhatsapp size={16} /> WhatsApp</button>
              </div>
              <div className="flex-1 flex gap-2">
                {selectedOrder.status === 'incoming' && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:opacity-90 transition-all" style={{ backgroundColor: BRAND_COLOR }}>Mark Packed</button>
                )}
                {selectedOrder.status === 'packed' && (
                  <>
                    <button onClick={() => updateStatus(selectedOrder.id, "incoming")} className="px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all hover:bg-red-100"><FiRotateCcw size={16} /> Undo</button>
                    <button onClick={() => updateStatus(selectedOrder.id, "dispatched")} style={{ backgroundColor: BRAND_COLOR }} className="flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"><FiTruck size={16} /> Dispatch</button>
                  </>
                )}
                {selectedOrder.status === 'dispatched' && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all hover:bg-red-100"><FiRotateCcw size={16} /> Undo Dispatch</button>
                )}
              </div>
            </div>
          </div>
            
            {/* INVOICE PRINT RENDER (UNCHANGED) */}
          <div className="print-invoice-container hidden">
            {(() => {
                const companyDetails = getCompanyDetails(selectedOrder.franchise_id);
                const selectedLogo = getCompanyLogo(companyDetails.company_name);
                const inv = selectedOrder;
                const fullItems = selectedOrder.invoice_items || [];
                const itemsPerPage = 15;
                const pages = [];
                if (fullItems.length === 0) pages.push([]);
                else { for (let i = 0; i < fullItems.length; i += itemsPerPage) { pages.push(fullItems.slice(i, i + itemsPerPage)); } }

                return (
                    <div>
                        {pages.map((pageItems, pageIndex) => {
                            const isLastPage = pageIndex === pages.length - 1;
                            const emptyRows = Array.from({ length: itemsPerPage - pageItems.length });
                            const dbSubtotal = Number(inv.subtotal) || 0;
                            const dbTaxAmount = Number(inv.tax_amount) || 0;
                            const dbRoundOff = Number(inv.round_off) || 0;
                            const dbTotalAmount = Number(inv.total_amount) || 0;
                            const cgstDisplay = dbTaxAmount / 2;
                            const sgstDisplay = dbTaxAmount / 2;

                            return (
                                <div key={pageIndex} className="bg-white text-black font-sans text-xs w-[210mm] h-[296mm] relative flex flex-col p-6 mx-auto invoice-page">
                                    <div className="border-2 border-black h-full flex flex-col relative">
                                        <div className="text-center py-2 bg-white"><h1 className="text-xl font-bold underline uppercase tracking-wider leading-none text-black">Tax Invoice</h1></div>
                                        <div className="flex border-b-2 border-black">
                                            <div className="w-1/2 p-3 flex flex-col justify-center">
                                                <p className="font-bold text-[11px] mb-0.5 underline uppercase text-black">Registered Office:</p>
                                                <p className="whitespace-pre-line text-[11px] font-bold uppercase leading-tight text-black">{companyDetails.company_address || "Address Not Available"}</p>
                                                <div className="mt-2 text-[11px] font-medium leading-relaxed text-black">
                                                    <p><span className="font-black">GSTIN:</span> {companyDetails.company_gst || "N/A"}</p>
                                                    <p><span className="font-black">Email:</span> {companyDetails.company_email || "N/A"}</p>
                                                </div>
                                            </div>
                                            <div className="w-1/2 p-2 flex flex-col items-end justify-center text-right">
                                                <div className="flex flex-col items-center">
                                                    <div className="mb-1">{selectedLogo ? <img src={selectedLogo} alt="Logo" className="h-16 w-auto object-contain" /> : <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black">NO LOGO</div>}</div>
                                                    <h2 className="text-xl font-black uppercase leading-none text-black">{companyDetails.company_name || "T Vanamm"}</h2>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex border-b-2 border-black text-[11px] text-black">
                                            <div className="w-1/2 border-r-2 border-black p-2 flex justify-between items-center"><span className="font-black">Invoice No:</span><span className="font-bold uppercase">{inv.id.substring(0,8)}</span></div>
                                            <div className="w-1/2 p-2 flex justify-between items-center"><span className="font-black">Invoice Date:</span><span className="font-bold">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span></div>
                                        </div>
                                        <div className="flex border-b-2 border-black bg-white text-black">
                                            <div className="w-1/2 border-r-2 border-black p-3">
                                                <h3 className="font-black underline mb-1 uppercase text-xs">Bill To:</h3>
                                                <p className="font-bold uppercase text-[13px] leading-tight">{inv.customer_name}</p>
                                                <p className="text-[11px] uppercase mt-1 leading-tight font-medium">{inv.customer_address}</p>
                                            </div>
                                            <div className="w-1/2 p-3 flex flex-col justify-center gap-2 text-[11px]">
                                                <div className="flex justify-between"><span className="font-black uppercase">Franchise ID:</span><span className="font-bold">{inv.franchise_id}</span></div>
                                                <div className="flex justify-between"><span className="font-black uppercase">Phone Number:</span><span className="font-bold uppercase">{inv.customer_phone || "N/A"}</span></div>
                                            </div>
                                        </div>

                                        <div className="flex-grow overflow-hidden relative flex flex-col">
                                            <div className="flex bg-white text-center border-b-2 border-black font-bold uppercase text-[11px] py-2 text-black">
                                                <div className="border-r border-black w-10">S.No</div>
                                                <div className="border-r border-black flex-1 text-left px-2">Item Description</div>
                                                <div className="border-r border-black w-20">HSN/SAC</div>
                                                <div className="border-r border-black w-16">Qty</div>
                                                <div className="border-r border-black w-24">Rate</div>
                                                <div className="border-r border-black w-16">GST %</div>
                                                <div className="w-28 px-2 text-right">Amount</div>
                                            </div>
                                            {pageItems.map((item, i) => (
                                                <div key={item.id || i} className="flex border-b border-black text-center items-center text-[10px] py-1 text-black h-[10mm]">
                                                    <div className="border-r border-black w-10 h-full flex items-center justify-center">{(pageIndex * itemsPerPage) + i + 1}</div>
                                                    <div className="border-r border-black flex-1 text-left px-2 font-bold h-full flex items-center uppercase text-wrap">{item.item_name}</div>
                                                    <div className="border-r border-black w-20 h-full flex items-center justify-center">{item.stocks?.hsn_code || item.hsn_code || "-"}</div>
                                                    <div className="border-r border-black w-16 h-full flex items-center justify-center font-bold">{item.quantity} {item.unit}</div>
                                                    <div className="border-r border-black w-24 text-right px-2 h-full flex items-center justify-end">{Number(item.price).toFixed(2)}</div>
                                                    <div className="border-r border-black w-16 h-full flex items-center justify-center">{item.gst_rate || 0}%</div>
                                                    <div className="w-28 text-right px-2 font-black h-full flex items-center justify-end">{Number(item.total).toFixed(2)}</div>
                                                </div>
                                            ))}
                                            {emptyRows.map((_, i) => (
                                                 <div key={`empty-${i}`} className="flex border-b border-black text-center items-center text-[10px] py-1 text-black h-[10mm]">
                                                    <div className="border-r border-black w-10 h-full"></div><div className="border-r border-black flex-1 h-full"></div>
                                                    <div className="border-r border-black w-20 h-full"></div><div className="border-r border-black w-16 h-full"></div>
                                                    <div className="border-r border-black w-24 h-full"></div><div className="border-r border-black w-16 h-full"></div>
                                                    <div className="w-28 h-full"></div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex border-t-2 border-black mt-auto text-black h-[60mm]"> 
                                            <div className="w-full flex">
                                                <div className="w-1/2 border-r-2 border-black flex flex-col h-full">
                                                    <div className="p-2 border-b border-black h-[20%]">
                                                        <span className="text-[10px] font-bold underline uppercase">Amount in Words:</span>
                                                        {isLastPage ? <p className="text-[10px] font-black uppercase mt-1 leading-tight">{numberToWords(Math.round(dbTotalAmount || 0))}</p> : <p className="text-[10px] italic mt-1 text-black/50">Continued on next page...</p>}
                                                    </div>
                                                    <div className="p-2 border-b border-black h-[30%]">
                                                        <h4 className="font-black underline text-[10px] uppercase">Bank Details:</h4>
                                                        <div className="text-[10px] leading-tight mt-1 space-y-0.5 font-bold"><p>Bank: {companyDetails.bank_name || "N/A"}</p><p>A/C: {companyDetails.bank_acc_no || "N/A"}</p><p>IFSC: {companyDetails.bank_ifsc || "N/A"}</p></div>
                                                    </div>
                                                    <div className="p-2 h-[50%] overflow-hidden">
                                                        <h4 className="font-black underline text-[10px] uppercase">Terms:</h4>
                                                        <p className="text-[9px] whitespace-pre-line leading-tight font-medium text-black">{companyDetails.terms || "No terms available."}</p>
                                                    </div>
                                                </div>
                                                <div className="w-1/2 flex flex-col text-[11px]">
                                                    {isLastPage ? (
                                                        <>
                                                            <div className="flex justify-between px-3 py-1.5 border-b border-black"><span className="font-bold">Taxable Amount</span><span className="font-bold">₹{dbSubtotal.toFixed(2)}</span></div>
                                                            <div className="flex justify-between px-3 py-1 border-b border-black"><span>CGST</span><span>₹{cgstDisplay.toFixed(2)}</span></div>
                                                            <div className="flex justify-between px-3 py-1 border-b border-black"><span>SGST</span><span>₹{sgstDisplay.toFixed(2)}</span></div>
                                                            <div className="flex justify-between px-3 py-1 border-b border-black"><span>Round Off</span><span>{dbRoundOff > 0 ? '+' : ''}{dbRoundOff.toFixed(2)}</span></div>
                                                            <div className="flex justify-between px-3 py-2 border-b-2 border-black bg-white font-black text-[12px] text-black"><span>TOTAL AMOUNT</span><span>₹{dbTotalAmount.toFixed(2)}</span></div>
                                                        </>
                                                    ) : (
                                                         <div className="flex-1 flex items-center justify-center"><span className="text-[10px] font-bold italic uppercase text-black/50">...Continued Next Page</span></div>
                                                    )}
                                                    <div className="flex-grow flex flex-col justify-center items-center py-4 px-3 text-center">
                                                        <span className="font-black uppercase text-[10px]">For {companyDetails.company_name || "T VANAMM"}</span>
                                                        <div className="h-8 mt-2"></div><span className="text-[9px] font-bold uppercase text-black">(Authorized Signatory)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div> 
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrders;
