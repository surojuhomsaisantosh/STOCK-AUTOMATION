import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiPackage,
  FiTruck, FiRotateCcw, FiChevronRight, FiX
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

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]); 
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [dateMode, setDateMode] = useState("date"); // 'date' or 'range'
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    if (!authLoading && user) {
        fetchOrders();
        fetchCompanies();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [user, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
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
        const { data, error } = await supabase.from("companies").select("*");
        if (error) throw error;
        setCompanies(data || []);
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
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const statusMatch = activeTab === "all" || o.status?.toLowerCase() === activeTab;
      const searchMatch = (o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase()));

      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      let dateMatch = true;

      if (dateMode === "date" && singleDate) dateMatch = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) dateMatch = orderDate >= startDate && orderDate <= endDate;

      return statusMatch && searchMatch && dateMatch;
    });
  }, [orders, activeTab, searchTerm, dateMode, singleDate, startDate, endDate]);

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

  // --- INVOICE HELPERS ---
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

  return (
    <div className="min-h-screen bg-white text-black pb-12 overflow-x-hidden font-sans print:bg-white print:p-0 print:overflow-visible">
      
      {/* --- STYLES --- */}
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* Custom Scrollbar for Modal List */
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
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
            nav, .dashboard-content, .modal-ui-controls { display: none !important; }
          }
        `}
      </style>

      {/* --- NAV (Hidden on Print) --- */}
      <nav className="sticky top-0 z-[60] bg-white border-b border-black/10 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm print:hidden relative">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 px-3 py-2 -ml-2 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all text-black"
            >
                <FiArrowLeft size={20} />
                <span className="font-bold text-sm">Back</span>
            </button>
        </div>
        
        {/* CENTERED TITLE (Fixed: Visible on Mobile and Desktop) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max text-center">
            <h1 className="text-base md:text-xl font-black uppercase tracking-tighter text-black">Manage Orders</h1>
        </div>
        
        <div className="flex items-center gap-3">
             {/* REMOVED the conflicting "Orders" heading */}
             <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black border border-black/10 text-black">
                ID: {user?.franchise_id || "HQ"}
            </div>
        </div>
      </nav>

      {/* --- DASHBOARD CONTENT (Hidden on Print) --- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6 dashboard-content print:hidden">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Orders", val: stats.incoming, color: "text-blue-700" },
            { label: "In Packing", val: stats.packed, color: "text-orange-600" },
            { label: "Dispatched", val: stats.dispatched, color: "text-emerald-800" },
            { label: "Today", val: todayDisplay, isDate: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-black/10 p-4 rounded-3xl shadow-sm">
              <p className="text-[9px] font-bold uppercase text-black/60 mb-1">{stat.label}</p>
              <p className={`${stat.isDate ? 'text-xs' : 'text-2xl'} font-black ${stat.color || 'text-black'}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Filters Section */}
        <div className="bg-white border border-black/10 p-4 rounded-[2rem] shadow-sm space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              placeholder="Search Client or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5 transition-all text-black uppercase placeholder:text-black/30"
            />
          </div>

          {/* Scrollable Tabs for Mobile */}
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex w-full bg-slate-100 p-1 rounded-2xl gap-1 min-w-max">
                {TABS.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase transition-all duration-200 min-w-[80px]
                    ${activeTab === tab
                        ? 'bg-black text-white shadow-md'
                        : 'text-black/60 hover:text-black hover:bg-white/50'}`}
                >
                    {tab}
                </button>
                ))}
            </div>
          </div>

          {/* DATE FILTER - Responsive Stack */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-black/5 w-full md:w-auto">
              {/* Header Part: Icon + Toggle */}
              <div className="flex justify-between md:justify-start items-center w-full md:w-auto gap-4">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-black/40" />
                    <span className="text-[10px] font-bold text-black/40 md:hidden uppercase">Filter Date</span>
                  </div>
                  
                  {/* DATE TOGGLE BAR */}
                  <div className="flex bg-slate-200 p-1 rounded-lg shrink-0">
                    <button 
                        onClick={() => setDateMode('date')}
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'date' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
                    >
                        Date
                    </button>
                    <button 
                        onClick={() => setDateMode('range')}
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'range' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
                    >
                        Range
                    </button>
                  </div>
              </div>

              {/* Vertical divider on Desktop only */}
              <div className="hidden md:block w-[1px] h-6 bg-black/10 mx-1" />
              
              {/* Inputs Area - Full width on mobile */}
              <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center">
                  {dateMode === "date" ? (
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="bg-transparent text-[11px] font-bold outline-none w-full md:w-auto md:flex-1 text-black min-w-[130px] py-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[260px]">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0 py-1"
                      />
                      <span className="text-black/40 font-bold">-</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0 py-1"
                      />
                    </div>
                  )}
              </div>
            </div>
            
            {/* Reset Button */}
            <button onClick={resetFilters} className="p-4 bg-slate-100 text-black/50 rounded-2xl active:bg-black active:text-white transition-all flex justify-center w-full md:w-auto hover:bg-slate-200">
                <FiRotateCcw />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isMobile ? (
          <div className="grid grid-cols-1 gap-3 pb-20">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-black/30 font-bold uppercase text-[10px] tracking-widest">No matching orders</div>
            ) : filteredOrders.map(order => (
              <div
                key={order.id} onClick={() => setSelectedOrder(order)}
                className="bg-white border border-black/10 p-5 rounded-[2rem] shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-black/50 uppercase tracking-widest">{order.franchise_id || "TV-GEN"}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-black/60'}`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="font-black text-sm uppercase leading-none text-black">{order.customer_name}</h3>
                  <p className="text-[10px] font-bold text-black/60">₹{order.total_amount} • {new Date(order.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-black/20"><FiChevronRight size={20} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded-[2.5rem] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white uppercase text-[10px] font-black">
                  <th className="px-8 py-5 tracking-widest">Serial Number</th>
                  <th className="px-8 py-5 tracking-widest">Franchise ID</th>
                  <th className="px-8 py-5 tracking-widest">Customer Name</th>
                  <th className="px-8 py-5 tracking-widest">Status</th>
                  <th className="px-8 py-5 tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-xs">
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-8 py-6 text-black/60">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6 uppercase font-black text-black">{order.franchise_id}</td>
                    <td className="px-8 py-6 uppercase font-black text-black">{order.customer_name}</td>
                    <td className="px-8 py-6 uppercase">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-black/60'}`}>{order.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-black">₹{order.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL (Interactive on Screen / INVOICE on Print) --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in print:bg-white print:p-0 print:absolute print:inset-0">
          
          {/* === 1. INTERACTIVE MODAL (HIDDEN ON PRINT) === */}
          <div className="bg-white w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden md:max-h-[85vh] md:rounded-[3rem] md:border-[6px] md:border-slate-100 rounded-t-[3rem] h-[94vh] modal-ui-controls print:hidden">
            {/* Modal Header */}
            <div className="p-5 md:p-8 border-b border-black/5 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">{selectedOrder.status}</span>
                  <span className="text-[10px] font-bold text-black/40 uppercase">REF: {selectedOrder.id.substring(0, 8)}</span>
                </div>
                <h2 className="text-xl md:text-4xl font-black uppercase tracking-tight leading-none text-black pr-2">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-4 bg-slate-100 rounded-2xl active:bg-black active:text-white transition-all text-black hover:bg-slate-200"><FiX size={24} /></button>
            </div>

            {/* Modal Body (Order Details) */}
            <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Shipping Info Card */}
                <div className="bg-white p-6 rounded-3xl border border-black/10 shadow-sm space-y-4 h-fit">
                  <h4 className="text-[10px] font-black text-black/50 uppercase tracking-widest flex items-center gap-2"><FiUser /> Shipping Info</h4>
                  <div className="space-y-3 text-[11px] font-bold uppercase">
                    <div className="flex justify-between border-b pb-2 border-slate-50 text-black"><span>Phone</span><span>{selectedOrder.customer_phone}</span></div>
                    <div className="flex flex-col gap-1 text-black"><span>Address:</span><span className="text-black/70 leading-relaxed font-black">{selectedOrder.customer_address}</span></div>
                  </div>
                </div>

                {/* Items List Card */}
                <div className="bg-white p-6 rounded-3xl border border-black/10 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-black/50 uppercase tracking-widest flex items-center gap-2"><FiPackage /> Items List</h4>
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase text-black">{selectedOrder.invoice_items?.length} Items</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedOrder.invoice_items?.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-black/5">
                        <div className="flex-1 pr-4">
                          <p className="text-[11px] font-black uppercase truncate text-black">{item.item_name}</p>
                          <p className="text-[9px] font-bold text-black/50 uppercase">{item.quantity} {item.unit}</p>
                        </div>
                        <span className="font-black text-xs tracking-tighter text-black">₹{item.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t-2 border-dashed border-black/10 flex justify-between items-center">
                    <span className="text-[10px] font-black text-black/50 uppercase">Grand Total</span>
                    <span className="text-3xl font-black tracking-tighter text-black">₹{selectedOrder.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className={`p-5 md:p-8 bg-white border-t border-black/5 z-20 flex flex-col md:flex-row gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] ${isMobile ? 'pb-10' : ''}`}>
              <div className="flex-1 flex gap-2">
                <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-100 text-black/70 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-slate-200 transition-all hover:bg-slate-200">Print</button>
                <button onClick={() => handleWhatsApp(selectedOrder)} className="flex-1 py-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-emerald-100 transition-all flex items-center justify-center gap-2 hover:bg-emerald-100"><FaWhatsapp size={16} /> WhatsApp</button>
              </div>
              <div className="flex-1 flex gap-2">
                {selectedOrder.status === 'incoming' && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Mark Packed</button>
                )}

                {selectedOrder.status === 'packed' && (
                  <>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "incoming")}
                      className="px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all hover:bg-red-100"
                    >
                      <FiRotateCcw size={16} /> Undo
                    </button>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "dispatched")}
                      style={{ backgroundColor: BRAND_COLOR }}
                      className="flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    >
                      <FiTruck size={16} /> Dispatch
                    </button>
                  </>
                )}

                {selectedOrder.status === 'dispatched' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, "packed")}
                    className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all hover:bg-red-100"
                  >
                    <FiRotateCcw size={16} /> Undo Dispatch
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* === 2. PRINT-ONLY INVOICE (NO FRONTEND CALCULATION) === */}
          <div className="print-invoice-container hidden">
            {(() => {
                const companyDetails = getCompanyDetails(selectedOrder.franchise_id);
                const selectedLogo = getCompanyLogo(companyDetails.company_name);
                const items = selectedOrder.invoice_items || [];
                const inv = selectedOrder;

                const dbSubtotal = Number(inv.subtotal) || 0;
                const dbTaxAmount = Number(inv.tax_amount) || 0;
                const dbRoundOff = Number(inv.round_off) || 0;
                const dbTotalAmount = Number(inv.total_amount) || 0;

                const cgstDisplay = dbTaxAmount / 2;
                const sgstDisplay = dbTaxAmount / 2;

                return (
                    <div className="bg-white text-black font-sans text-xs w-full max-w-[210mm] relative flex flex-col min-h-[296mm] h-[296mm] shadow-none p-6 overflow-hidden mx-auto">
                        <div className="border-2 border-black h-full flex flex-col relative">
                            {/* HEADER */}
                            <div className="text-center py-2 bg-white">
                                <h1 className="text-xl font-bold underline uppercase tracking-wider leading-none text-black">Tax Invoice</h1>
                            </div>
                            {/* COMPANY DETAILS */}
                            <div className="flex border-b-2 border-black">
                                <div className="w-1/2 p-3 flex flex-col justify-center">
                                    <p className="font-bold text-[11px] mb-0.5 underline uppercase text-black">Registered Office:</p>
                                    <p className="whitespace-pre-line text-[11px] font-bold uppercase leading-tight text-black">
                                        {companyDetails.company_address || "Address Not Available"}
                                    </p>
                                    <div className="mt-2 text-[11px] font-medium leading-relaxed text-black">
                                        <p><span className="font-black">GSTIN:</span> {companyDetails.company_gst || "N/A"}</p>
                                        <p><span className="font-black">Email:</span> {companyDetails.company_email || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="w-1/2 p-2 flex flex-col items-end justify-center text-right">
                                    <div className="flex flex-col items-center">
                                        <div className="mb-1">
                                            {selectedLogo ? <img src={selectedLogo} alt="Logo" className="h-16 w-auto object-contain" /> : <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black">NO LOGO</div>}
                                        </div>
                                        <h2 className="text-xl font-black uppercase leading-none text-black">{companyDetails.company_name || "T Vanamm"}</h2>
                                    </div>
                                </div>
                            </div>
                            {/* INVOICE NO & DATE */}
                            <div className="flex border-b-2 border-black text-[11px] text-black">
                                <div className="w-1/2 border-r-2 border-black p-2 flex justify-between items-center">
                                    <span className="font-black">Invoice No:</span>
                                    <span className="font-bold uppercase">{inv.id.substring(0,8)}</span>
                                </div>
                                <div className="w-1/2 p-2 flex justify-between items-center">
                                    <span className="font-black">Invoice Date:</span>
                                    <span className="font-bold">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                                </div>
                            </div>
                            {/* BILL TO */}
                            <div className="flex border-b-2 border-black bg-white text-black">
                                <div className="w-1/2 border-r-2 border-black p-3">
                                    <h3 className="font-black underline mb-1 uppercase text-xs">Bill To:</h3>
                                    <p className="font-bold uppercase text-[13px] leading-tight">{inv.customer_name}</p>
                                    <p className="text-[11px] uppercase mt-1 leading-tight font-medium">{inv.customer_address}</p>
                                </div>
                                <div className="w-1/2 p-3 flex flex-col justify-center gap-2 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="font-black uppercase">Franchise ID:</span>
                                        <span className="font-bold">{inv.franchise_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-black uppercase">Phone Number:</span>
                                        <span className="font-bold uppercase">{inv.customer_phone || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                            {/* ITEMS TABLE */}
                            <div className="flex-grow overflow-hidden relative">
                                <div className="flex bg-white text-center border-b-2 border-black font-bold uppercase text-[11px] py-2 sticky top-0 z-10 text-black">
                                    <div className="border-r border-black w-10">S.No</div>
                                    <div className="border-r border-black flex-1 text-left px-2">Item Description</div>
                                    <div className="border-r border-black w-20">HSN/SAC</div>
                                    <div className="border-r border-black w-16">Qty</div>
                                    <div className="border-r border-black w-24">Rate</div>
                                    <div className="border-r border-black w-16">GST %</div>
                                    <div className="w-28 px-2 text-right">Amount</div>
                                </div>
                                {items.map((item, i) => (
                                    <div key={item.id || i} className="flex border-b border-black text-center items-center text-[10px] py-1 text-black">
                                        <div className="border-r border-black w-10 h-full flex items-center justify-center">{i + 1}</div>
                                        <div className="border-r border-black flex-1 text-left px-2 font-bold h-full flex items-center uppercase text-wrap">{item.item_name}</div>
                                        <div className="border-r border-black w-20 h-full flex items-center justify-center">{item.stocks?.hsn_code || item.hsn_code || "-"}</div>
                                        <div className="border-r border-black w-16 h-full flex items-center justify-center font-bold">{item.quantity} {item.unit}</div>
                                        <div className="border-r border-black w-24 text-right px-2 h-full flex items-center justify-end">
                                            {Number(item.price).toFixed(2)}
                                        </div>
                                        <div className="border-r border-black w-16 h-full flex items-center justify-center">{item.gst_rate || 0}%</div>
                                        <div className="w-28 text-right px-2 font-black h-full flex items-center justify-end">
                                            {Number(item.total).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* FOOTER */}
                            <div className="flex border-t-2 border-black mt-auto text-black"> 
                                <div className="w-full flex">
                                    <div className="w-1/2 border-r-2 border-black flex flex-col justify-end">
                                        <div className="p-2 border-b border-black">
                                            <span className="text-[10px] font-bold underline uppercase">Amount in Words:</span>
                                            <p className="text-[10px] font-black uppercase mt-1 leading-tight">{numberToWords(Math.round(dbTotalAmount || 0))}</p>
                                        </div>
                                        <div className="p-2 border-b border-black">
                                            <h4 className="font-black underline text-[10px] uppercase">Bank Details:</h4>
                                            <div className="text-[10px] leading-tight mt-1 space-y-0.5 font-bold">
                                                <p>Bank: {companyDetails.bank_name || "N/A"}</p>
                                                <p>A/C: {companyDetails.bank_acc_no || "N/A"}</p>
                                                <p>IFSC: {companyDetails.bank_ifsc || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <h4 className="font-black underline text-[10px] uppercase">Terms:</h4>
                                            <p className="text-[9px] whitespace-pre-line leading-tight font-medium text-black">
                                                {companyDetails.terms || "No terms available."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-1/2 flex flex-col text-[11px]">
                                        <div className="flex justify-between px-3 py-1.5 border-b border-black">
                                            <span className="font-bold">Taxable Amount</span>
                                            <span className="font-bold">₹{dbSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-1 border-b border-black">
                                            <span>CGST</span>
                                            <span>₹{cgstDisplay.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-1 border-b border-black">
                                            <span>SGST</span>
                                            <span>₹{sgstDisplay.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-1 border-b border-black">
                                            <span>Round Off</span>
                                            <span>{dbRoundOff > 0 ? '+' : ''}{dbRoundOff.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2 border-b-2 border-black bg-white font-black text-[12px] text-black">
                                            <span>TOTAL AMOUNT</span>
                                            <span>₹{dbTotalAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex-grow flex flex-col justify-center items-center py-4 px-3 text-center">
                                            <span className="font-black uppercase text-[10px]">For {companyDetails.company_name || "T VANAMM"}</span>
                                            <div className="h-8 mt-2"></div> 
                                            <span className="text-[9px] font-bold uppercase text-black">(Authorized Signatory)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-5 right-0 text-[10px] font-bold text-black">Page 1 of 1</div>
                        </div> 
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