import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiPackage, 
  FiPrinter, FiTruck, FiRefreshCw, FiRotateCcw, FiAlertCircle, FiCheckCircle,
  FiChevronDown 
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

// --- ASSET IMPORTS ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

const THEME_COLOR = "rgb(0, 100, 55)";
const TABS = ["all", "incoming", "packed", "dispatched"];
const ITEMS_PER_PAGE = 50;

const numberToWords = (num) => {
  if (!num || num === 0) return 'ZERO RUPEES ONLY';
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

const parseVal = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const Toast = ({ message, type }) => {
  if (!message) return null;
  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-600';
  const icon = type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />;
  return (
    <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn transition-all duration-300`}>
      {icon}
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
};

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState({ message: null, type: null });
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("Loading...");

  const [filterType, setFilterType] = useState("date"); 
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page and fetch when filters change
  useEffect(() => {
    if (!authLoading && user) {
      setPage(0);
      setHasMore(true);
      fetchOrders(0, true);
    }
  }, [user, authLoading, activeTab, debouncedSearch, singleDate, startDate, endDate, filterType]);

  // Initial Load
  useEffect(() => {
    if (!authLoading && user) {
      fetchFranchiseProfile();
      fetchCompanies();
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user, authLoading]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: null }), 3000);
  };

  const fetchFranchiseProfile = async () => {
    try {
      if (!user?.id) return;
      const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).single();
      if (data) setSelectedFranchiseId(data.franchise_id || "TV-HQ");
    } catch (err) { }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*");
    setCompanies(data || []);
  };

  const fetchOrders = async (pageIndex = 0, reset = false) => {
    if(pageIndex === 0) setLoading(true);
    
    try {
      let query = supabase
        .from("invoices")
        .select(`*, invoice_items ( *, stocks ( hsn_code, gst_rate, sales_tax_inc ) )`)
        .order("created_at", { ascending: false });

      // Apply Filters
      if (activeTab !== "all") query = query.eq("status", activeTab);

      if (debouncedSearch.trim() !== "") {
        query = query.or(`customer_name.ilike.%${debouncedSearch}%,customer_phone.ilike.%${debouncedSearch}%,franchise_id.ilike.%${debouncedSearch}%`);
      }

      if (filterType === "date" && singleDate) {
        query = query.gte("created_at", `${singleDate}T00:00:00`).lte("created_at", `${singleDate}T23:59:59`);
      } else if (filterType === "range" && startDate && endDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${endDate}T23:59:59`);
      } else if (debouncedSearch === "" && activeTab === "all") {
        const today = new Date().toLocaleDateString('en-CA'); 
        query = query.or(`status.in.(incoming,packed),and(status.eq.dispatched,created_at.gte.${today}T00:00:00)`);
      }

      const from = pageIndex * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      
      if (reset) {
        setOrders(data || []);
      } else {
        setOrders(prev => [...prev, ...data]);
      }

    } catch (err) {
      showToast("Failed to load orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage, false);
  };

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'dispatched' || newStatus === 'incoming') {
        if (!window.confirm(`Are you sure you want to mark this order as ${newStatus.toUpperCase()}?`)) return;
    }

    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast(`Order marked as ${newStatus.toUpperCase()}`);
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  const handleWhatsApp = (order, totalAmount) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) {
      showToast("Customer phone number is missing!", "error");
      return;
    }
    const message = `ORDER UPDATE%0A%0AHello ${order.customer_name},%0AYour order from T Vanamm is currently ${order.status.toUpperCase()}.%0ATotal Amount: ₹${totalAmount.toFixed(2)}`;
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const getCompanyDetails = (franchiseId) => companies.find(c => c.franchise_id === franchiseId) || companies[0] || {};
  
  const getCompanyLogo = (companyDetails) => {
    if (companyDetails?.logo_url) return companyDetails.logo_url;
    const name = companyDetails?.company_name?.toLowerCase() || "";
    if (name.includes("t vanamm") || name.includes("t-vanamm")) return tvanammLogo;
    if (name.includes("leaf")) return tleafLogo;
    if (name.includes("jksh") || name.includes("j.k.s.h")) return jkshLogo;
    return null; 
  };

  const calculateFinancials = (order) => {
    if (parseVal(order.total_amount) > 0) {
        const gTotal = parseVal(order.total_amount);
        return { grandTotal: gTotal, taxable: gTotal / 1.18, totalTax: gTotal - (gTotal / 1.18) };
    }
    let totalTaxable = 0, totalTax = 0, grandTotal = 0;
    const items = order.invoice_items || [];
    items.forEach(item => {
        const qty = parseVal(item.quantity), price = parseVal(item.price);
        const gstRate = parseVal(item?.stocks?.gst_rate) || 0; 
        const isInclusive = item?.stocks?.sales_tax_inc === 'Inclusive'; 
        let itemTaxable = 0, itemTax = 0, itemTotal = qty * price;
        if (isInclusive) {
            itemTaxable = itemTotal / (1 + (gstRate / 100));
            itemTax = itemTotal - itemTaxable;
        } else {
            itemTaxable = itemTotal;
            itemTax = itemTotal * (gstRate / 100);
            itemTotal = itemTaxable + itemTax; 
        }
        totalTaxable += itemTaxable; totalTax += itemTax; grandTotal += itemTotal;
    });
    return { grandTotal, taxable: totalTaxable, totalTax };
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 print:bg-white print:pb-0">
      <Toast message={toast.message} type={toast.type} />
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
          
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
            nav, .filters-container, .main-table-header, .quick-summary-card, .table-row-summary, .pagination-controls { display: none !important; }
            .invoice-wrapper { display: flex !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10000; justify-content: center; align-items: flex-start; padding-top: 5mm; }
            .invoice-container { border: 2px solid black !important; width: 195mm; min-height: 280mm; height: auto; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between; }
            .v-line { border-right: 1px solid black; }
            .h-line { border-bottom: 1px solid black; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 4px 8px; }
          }
          .v-line { border-right: 1px solid black; }
          .h-line { border-bottom: 1px solid black; }
          .invoice-table { width: 100%; border-collapse: collapse; }
          .invoice-table th, .invoice-table td { padding: 4px 8px; }
          .invoice-wrapper { display: none; }
        `}
      </style>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-slate-200 px-4 md:px-8 py-4 bg-white sticky top-0 z-50 flex items-center justify-between print:hidden shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black z-20">
          <FiArrowLeft size={18} /> Back
        </button>
        <h1 className="text-sm md:text-xl font-black uppercase tracking-widest md:tracking-[0.2em] absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap z-10 pointer-events-none">Stock Orders</h1>
        <div className="flex items-center z-20">
            <div className="text-[10px] md:text-xs font-black bg-slate-100 px-3 md:px-4 py-2 rounded-xl border border-slate-200 uppercase text-slate-700 whitespace-nowrap">ID : {selectedFranchiseId}</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6 md:mt-8 print:w-full print:max-w-none print:px-0 print:mt-0">
        
        {/* --- FILTERS CONTAINER --- */}
        <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 mb-8 flex flex-col gap-6 md:gap-8 filters-container">
            
            {/* Top Row: Search + Date Widget */}
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch justify-between">
                <div className="relative w-full lg:w-2/3 group">
                    <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[rgb(0,100,55)]" size={22} />
                    <input type="text" placeholder="Search Client Name, ID, Phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 md:py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-bold shadow-inner placeholder-gray-400"
                        style={{ '--tw-ring-color': THEME_COLOR }} onFocus={(e) => e.target.style.borderColor = THEME_COLOR} onBlur={(e) => e.target.style.borderColor = 'transparent'} />
                </div>
                <div className="w-full lg:w-1/3 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-center shadow-lg relative overflow-hidden">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1"><FiCalendar size={14} className="text-gray-400"/><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Today</span></div>
                        <div className="text-xl font-black tracking-tight text-black">{currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Tabs & Date Filters */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center pt-6 border-t border-gray-100">
                {/* 1. TABS (Scrollable on mobile) */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex relative w-full xl:w-auto overflow-x-auto no-scrollbar shrink-0">
                    {TABS.map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-4 md:px-6 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 relative z-10 whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-gray-600'}`}>{tab}</button>
                    ))}
                </div>

                {/* 2. FILTER CONTROLS (Stack on Mobile, Row on Tablet/Desktop) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full xl:w-auto gap-3 flex-grow justify-end">
                     
                     {/* Segmented Toggle */}
                     <div className="bg-gray-100 p-1 rounded-xl flex w-full sm:w-auto shrink-0">
                        <button 
                          onClick={() => { setFilterType("date"); setStartDate(""); setEndDate(""); }}
                          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "date" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          Date
                        </button>
                        <button 
                          onClick={() => { setFilterType("range"); setSingleDate(""); }}
                          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "range" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          Range
                        </button>
                     </div>

                     {/* Date Inputs */}
                     <div className="w-full sm:max-w-md flex-grow">
                        {filterType === "date" ? (
                            <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[rgb(0,100,55)] cursor-pointer h-12" />
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-2 bg-white border-2 border-gray-100 rounded-xl p-2 sm:p-1.5 w-full">
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-auto text-xs font-bold outline-none bg-transparent p-2 sm:p-0 cursor-pointer h-8"/>
                                <span className="hidden sm:block text-gray-300">-</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-auto text-xs font-bold outline-none bg-transparent p-2 sm:p-0 border-t sm:border-0 border-gray-100 cursor-pointer h-8"/>
                            </div>
                        )}
                     </div>

                     {/* Reset Button */}
                     <button onClick={() => {setSearchQuery(""); setActiveTab("all"); setSingleDate(""); setStartDate("");}} className="w-full sm:w-auto px-6 py-3 bg-slate-100 rounded-xl hover:bg-black hover:text-white transition-all flex justify-center items-center h-12" title="Reset Filters"><FiRefreshCw/></button>
                </div>
            </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-black tracking-wider text-black main-table-header">
                <tr>
                    <th className="px-6 md:px-8 py-5 md:py-6 whitespace-nowrap">#</th>
                    <th className="px-6 md:px-8 py-5 md:py-6 whitespace-nowrap">Franchise ID</th>
                    <th className="px-6 md:px-8 py-5 md:py-6 whitespace-nowrap">Customer</th>
                    <th className="px-6 md:px-8 py-5 md:py-6 whitespace-nowrap">Status</th>
                    <th className="px-6 md:px-8 py-5 md:py-6 text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && page === 0 ? (
                  <tr><td colSpan="5" className="py-32 text-center font-black uppercase text-xs tracking-[0.3em] text-slate-300 animate-pulse">Loading Orders...</td></tr>
                ) : orders.length === 0 ? (
                    <tr><td colSpan="5" className="py-16 text-center font-bold text-sm text-gray-400">No orders found matching your criteria.</td></tr>
                ) : orders.map((order, idx) => {
                  const isExpanded = expandedOrderId === order.id;
                  const companyDetails = getCompanyDetails(order.franchise_id);
                  const selectedLogo = getCompanyLogo(companyDetails);
                  const items = order.invoice_items || [];
                  const { grandTotal, taxable, totalTax } = calculateFinancials(order);

                  let statusColor = "bg-slate-100 text-slate-500";
                  if(order.status === "incoming") statusColor = "bg-blue-50 text-blue-600";
                  if(order.status === "packed") statusColor = "bg-amber-50 text-amber-600";
                  if(order.status === "dispatched") statusColor = "bg-emerald-50 text-emerald-600";

                  return (
                    <React.Fragment key={order.id}>
                      <tr onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className={`group cursor-pointer print:hidden table-row-summary ${isExpanded ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 md:px-8 py-5 md:py-6 font-black text-black text-xs opacity-60">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 md:px-8 py-5 md:py-6 font-bold text-xs"><span className="px-3 py-1.5 rounded-lg text-white font-black" style={{ backgroundColor: THEME_COLOR }}>{order.franchise_id || "N/A"}</span></td>
                        <td className="px-6 md:px-8 py-5 md:py-6 text-xs font-black text-black uppercase truncate">{order.customer_name || "Unknown"}</td>
                        <td className="px-6 md:px-8 py-5 md:py-6"><span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${statusColor}`}>{order.status}</span></td>
                        <td className="px-6 md:px-8 py-5 md:py-6 text-right font-black text-xs text-black">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>

                      {isExpanded && (
                        <tr className="animate-fadeIn">
                          <td colSpan="5" className="p-0">
                            {/* --- EXPANDED CARD CONTENT --- */}
                            <div className="quick-summary-card p-4 md:p-6 border-t border-green-100/50">
                                <div className="bg-white border border-green-100 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col lg:flex-row gap-6 md:gap-8">
                                    <div className="flex-1 min-w-0"> 
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-600"></span> Order Items</h4>
                                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {items.map((item, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                                                    <div className="pr-4"><span className="font-bold text-gray-800 block uppercase">{item.item_name}</span><span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{parseVal(item.quantity)} {item.unit} x ₹{parseVal(item.price).toFixed(2)}</span></div>
                                                    <span className="font-black text-gray-900">₹{(parseVal(item.price) * parseVal(item.quantity)).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-full lg:w-72 flex flex-col gap-4">
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100"><h5 className="text-[9px] font-black uppercase text-gray-400 mb-1">Shipping Address:</h5><p className="text-[11px] font-bold text-gray-600 leading-tight uppercase">{order.customer_address || "No address provided"}</p></div>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1"><span>Taxable</span><span>₹{taxable.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2"><span>GST Total</span><span>₹{totalTax.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-gray-200 uppercase"><span>Total</span><span style={{ color: THEME_COLOR }}>₹{grandTotal.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 justify-center w-full lg:w-auto min-w-[180px] border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                                        {order.status === "incoming" && <button onClick={() => updateStatus(order.id, "packed")} className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md hover:bg-gray-800 transition-all"><FiPackage size={14}/> Mark Packed</button>}
                                        {order.status === "packed" && <><button onClick={() => updateStatus(order.id, "dispatched")} style={{ backgroundColor: THEME_COLOR }} className="w-full py-3 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-all"><FiTruck size={14}/> Dispatch</button><button onClick={() => updateStatus(order.id, "incoming")} className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><FiRotateCcw size={12}/> Undo</button></>}
                                        {order.status === "dispatched" && <><button onClick={() => handleWhatsApp(order, grandTotal)} className="w-full py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all"><FaWhatsapp size={18}/> WhatsApp</button><button onClick={() => updateStatus(order.id, "packed")} className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><FiRotateCcw size={12}/> Undo</button></>}
                                        <button onClick={() => window.print()} className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"><FiPrinter size={14}/> Print Invoice</button>
                                    </div>
                                </div>
                            </div>

                            {/* --- INVOICE CONTAINER (Print Only) --- */}
                            <div className="invoice-wrapper">
                                <div className="invoice-container text-black font-sans text-xs">
                                    <div className="flex flex-col">
                                        <div className="text-center py-2 h-line bg-gray-50"><h1 className="text-xl font-bold uppercase tracking-wider">Tax Invoice</h1></div>
                                        <div className="flex h-line">
                                            {/* Unified Header (No v-line) */}
                                            <div className="w-[60%] p-2 flex flex-col justify-center">
                                                <p className="font-bold text-[10px] underline uppercase mb-1">Registered Office:</p>
                                                <p className="whitespace-pre-line text-[10px] font-bold uppercase leading-tight">{companyDetails.company_address || "Address Not Available"}</p>
                                                <div className="mt-2 text-[10px] font-medium leading-relaxed"><p><span className="font-black">GSTIN:</span> {companyDetails.company_gst || "N/A"}</p><p><span className="font-black">Email:</span> {companyDetails.company_email || "N/A"}</p></div>
                                            </div>
                                            <div className="w-[40%] p-2 flex flex-col items-end justify-center pr-6">
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="mb-2">{selectedLogo ? <img src={selectedLogo} alt="Logo" className="h-14 w-auto object-contain" /> : <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px]">NO LOGO</div>}</div>
                                                    <h2 className="text-lg font-black uppercase leading-none">{companyDetails.company_name || "T Vanamm"}</h2>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex h-line">
                                            <div className="w-1/2 v-line p-3"><h3 className="font-black underline mb-1 uppercase text-[10px]">Bill To:</h3><p className="font-bold uppercase text-[11px] leading-tight">{order.customer_name}</p><p className="text-[10px] uppercase mt-1 leading-tight font-medium text-gray-700">{order.customer_address}</p></div>
                                            <div className="w-1/2 p-3 flex flex-col justify-center gap-1 text-[10px]">
                                                <div className="flex justify-between"><span className="font-black uppercase">Invoice No:</span><span className="font-bold uppercase">{order.id?.substring(0,8)}</span></div>
                                                <div className="flex justify-between"><span className="font-black uppercase">Date:</span><span className="font-bold">{new Date(order.created_at).toLocaleDateString('en-GB')}</span></div>
                                                <div className="flex justify-between"><span className="font-black uppercase">Phone:</span><span className="font-bold uppercase">{order.customer_phone || "N/A"}</span></div>
                                                <div className="flex justify-between"><span className="font-black uppercase">Franchise:</span><span className="font-bold">{order.franchise_id}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <table className="invoice-table">
                                            <thead>
                                                <tr className="bg-gray-100 text-center font-bold uppercase text-[10px] text-black h-line">
                                                    <th className="w-10 v-line">#</th><th className="text-left v-line">Item Name</th><th className="w-20 v-line">HSN</th><th className="w-16 v-line">Qty</th><th className="w-20 v-line">Rate</th><th className="w-24 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, i) => (
                                                    <tr key={i} className="text-center text-[10px] h-line">
                                                        <td className="v-line py-2">{i + 1}</td><td className="text-left font-bold uppercase v-line py-2">{item.item_name}</td><td className="v-line py-2">{item.stocks?.hsn_code || item.hsn_code || "-"}</td><td className="font-bold v-line py-2">{parseVal(item.quantity)} {item.unit}</td><td className="text-right px-2 v-line py-2">{parseVal(item.price).toFixed(2)}</td><td className="text-right px-2 font-black py-2">{(parseVal(item.price) * parseVal(item.quantity)).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex w-full border-t border-black">
                                        <div className="w-3/5 v-line flex flex-col">
                                            <div className="p-2 border-b border-black"><span className="text-[9px] font-bold underline uppercase">Amount in Words:</span><p className="text-[10px] font-black uppercase mt-1 leading-tight text-gray-800">{numberToWords(Math.round(grandTotal))}</p></div>
                                            <div className="p-2 border-b border-black"><h4 className="font-black underline text-[9px] uppercase">Bank Details:</h4><div className="text-[9px] leading-tight mt-1 font-bold text-gray-700"><p>Bank: {companyDetails.bank_name || "AXIS BANK BASHEERBAGH"}</p><p>A/C: {companyDetails.bank_acc_no || "920020057250778"}</p><p>IFSC: {companyDetails.bank_ifsc || "UTIB0001380"}</p></div></div>
                                            <div className="p-2 flex-grow"><h4 className="font-black underline text-[9px] uppercase">Terms:</h4><p className="text-[8px] whitespace-pre-line leading-tight font-medium text-gray-600 mt-1">{companyDetails.terms || "1) Goods once sold will not be taken back or exchanged.\n2) Payments terms: 100% advance payments.\n3) Once placed order cannot be cancelled.\n4) All legal matters are subject to Hyderabad jurisdiction only.\n5) Delivery may take time upto 3-5 working days."}</p></div>
                                        </div>
                                        <div className="w-2/5 flex flex-col text-[10px]">
                                            <div className="flex justify-between px-3 py-1 h-line"><span className="font-bold">Taxable</span><span className="font-bold">₹{taxable.toFixed(2)}</span></div>
                                            <div className="flex justify-between px-3 py-1 h-line"><span>CGST (9%)</span><span>₹{(totalTax/2).toFixed(2)}</span></div>
                                            <div className="flex justify-between px-3 py-1 h-line"><span>SGST (9%)</span><span>₹{(totalTax/2).toFixed(2)}</span></div>
                                            <div className="flex justify-between px-3 py-2 h-line bg-gray-100 font-black text-[12px]"><span>TOTAL</span><span>₹{grandTotal.toFixed(2)}</span></div>
                                            <div className="flex-grow flex flex-col justify-end items-center pb-2 text-center pt-8"><span className="font-black uppercase text-[9px]">For {companyDetails.company_name || "T VANAMM"}</span><div className="h-6"></div><span className="text-[8px] font-bold uppercase">(Authorized Signatory)</span></div>
                                        </div>
                                    </div>
                                </div> 
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            
            {/* PAGINATION: LOAD MORE BUTTON */}
            {hasMore && !loading && (
                <div className="p-6 text-center pagination-controls">
                    <button 
                        onClick={loadMore} 
                        className="px-8 py-3 bg-slate-100 text-slate-600 font-black uppercase text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                        <FiRefreshCw className="animate-spin-slow"/> Load More Orders
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockOrders;