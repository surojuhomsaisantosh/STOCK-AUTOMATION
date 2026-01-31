import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Search, X, RotateCcw, User, 
  FileText, IndianRupee, Printer, Phone, Hash, ShoppingBag, Shield, Activity, Calendar, Filter, Inbox
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";

function CentralInvoices() {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [rangeMode, setRangeMode] = useState(false); 
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]); 
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => { 
    fetchInvoices(); 
    fetchUserProfile();

    // 🚀 PRODUCTION OPTIMIZATION: Real-time Listener
    const channel = supabase
      .channel('realtime-invoices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          fetchInvoices(false); // Fetch without setting global loading state to avoid flicker
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    try {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).single();
        if (data) setUserProfile(data);
    } catch (e) {
        console.error("Profile fetch error", e);
    }
  };

  const fetchInvoices = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      // Fix UTC strings for Safari/Mobile compatibility
      const formattedStr = dateStr.replace(" ", "T");
      const isoStr = formattedStr.endsWith("Z") ? formattedStr : `${formattedStr}Z`;
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata' 
      }).format(date).toUpperCase();
    } catch (err) {
      return dateStr; 
    }
  };

  const openInvoiceModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    try {
      const { data, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch(""); 
    setRangeMode(false);
    setSingleDate(new Date().toISOString().split('T')[0]);
    setDateRange({ start: "", end: "" });
    fetchInvoices();
  };

  const handlePrint = () => window.print();

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const fId = (inv.franchise_id || "").toString().toLowerCase();
      const custName = (inv.customer_name || "").toLowerCase();
      const matchesSearch = !search || fId.includes(q) || custName.includes(q);
      
      const invDate = inv.created_at?.split('T')[0];
      let matchesDate = true;
      
      if (rangeMode) {
        if (dateRange.start && dateRange.end) {
             matchesDate = invDate >= dateRange.start && invDate <= dateRange.end;
        }
      } else {
        if (singleDate) matchesDate = invDate === singleDate;
      }

      return matchesSearch && matchesDate;
    });
  }, [search, singleDate, dateRange, rangeMode, invoices]);

  const stats = useMemo(() => {
    const revenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    return { total: filteredInvoices.length, revenue };
  }, [filteredInvoices]);

  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
        case 'dispatched': return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case 'packed': return "bg-amber-100 text-amber-700 border-amber-200";
        case 'incoming': return "bg-blue-100 text-blue-700 border-blue-200";
        default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10 font-sans text-black relative selection:bg-black selection:text-white">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; }
          .no-print { display: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- INVOICE DRAWER --- */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full md:w-[600px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" id="printable-area">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-white shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl border-2 border-slate-100">
                    <Hash size={20} style={{ color: PRIMARY }} />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-slate-800">Invoice Details</h2>
                    <p className="text-[10px] font-bold text-slate-400">ID: {selectedInvoice.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                    <Printer size={14}/> Print
                </button>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                {/* Meta Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border-l-4 shadow-sm border border-slate-100" style={{ borderLeftColor: PRIMARY }}>
                        <div className="flex items-center gap-3 mb-3">
                            <Shield size={16} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Origin Office</span>
                        </div>
                        <p className="text-base font-black text-slate-800">Franchise ID: {selectedInvoice.franchise_id}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">{selectedInvoice.branch_location || 'Main Outlets'}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border-l-4 shadow-sm border border-slate-100" style={{ borderLeftColor: '#3b82f6' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <Activity size={16} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Status</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(selectedInvoice.status)}`}>
                            {selectedInvoice.status || 'Incoming'}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">{formatDateTime(selectedInvoice.created_at)}</p>
                    </div>

                    <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><User size={20} /></div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Customer Details</span>
                            <p className="text-sm font-black text-slate-800">{selectedInvoice.customer_name}</p>
                            <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs font-bold">
                                <Phone size={12} /> {selectedInvoice.customer_phone}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <ShoppingBag size={16} className="text-slate-400"/>
                        <span className="text-xs font-black uppercase text-slate-600">Order Items</span>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-4">Item</th>
                                <th className="p-4 text-center">Qty</th>
                                <th className="p-4 text-right">Price</th>
                                <th className="p-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                            {itemsLoading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400 animate-pulse">Loading items...</td></tr>
                            ) : items.map((item) => (
                                <tr key={item.id}>
                                    <td className="p-4">
                                        <div className="font-black text-slate-800">{item.item_name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">SKU: {item.stock_id?.slice(0,8)}</div>
                                    </td>
                                    <td className="p-4 text-center">{item.quantity} {item.unit}</td>
                                    <td className="p-4 text-right">₹{item.price}</td>
                                    <td className="p-4 text-right font-black">₹{(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t-2 border-slate-100 bg-white shrink-0">
                <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Payable</span>
                    <span className="text-2xl font-black">₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</span>
                </div>
                <button onClick={handlePrint} className="md:hidden w-full mt-4 py-4 bg-slate-100 text-slate-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 no-print active:scale-95 transition-all">
                    <Printer size={16}/> Print Invoice
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STICKY HEADER --- */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-all">
                <ArrowLeft size={18} /> <span className="hidden md:inline">BACK</span>
            </button>
        </div>
        
        <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black text-center absolute left-1/2 -translate-x-1/2">
            Ledger
        </h1>
        
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">ID :</span>
            {/* WHITE ID BOX */}
            <span className="text-[10px] sm:text-xs font-black text-black bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                {userProfile?.franchise_id || "HQ-01"}
            </span>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6 md:mt-8 no-print">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:border-black/10">
                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                    <FileText size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Records</p>
                    <h2 className="text-2xl font-black text-slate-800">{stats.total}</h2>
                </div>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:border-black/10">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <IndianRupee size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Billing</p>
                    <h2 className="text-2xl font-black text-slate-800">₹{stats.revenue.toLocaleString('en-IN')}</h2>
                </div>
            </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative w-full lg:flex-1 h-12 md:h-14 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={18} />
                <input 
                    placeholder="SEARCH NAME OR FRANCHISE ID..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="w-full h-full pl-14 pr-6 bg-white border-2 border-slate-100 focus:border-black rounded-2xl text-[10px] md:text-xs font-black outline-none transition-all uppercase placeholder:text-slate-300 shadow-sm" 
                />
            </div>

            {/* Date Filters & Refresh - ROW LAYOUT ON MOBILE */}
            <div className="flex items-center gap-2 w-full lg:w-auto h-12 md:h-14">
                <div className="flex-1 flex items-center bg-white rounded-2xl border-2 border-slate-100 p-1 h-full min-w-0 shadow-sm">
                    {/* Toggle Buttons */}
                    <div className="flex bg-slate-50 p-1 rounded-xl shrink-0 mr-2">
                        <button 
                            onClick={() => setRangeMode(false)} 
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!rangeMode ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Single
                        </button>
                        <button 
                            onClick={() => setRangeMode(true)} 
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${rangeMode ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Range
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                        {!rangeMode ? (
                            <input 
                                type="date" 
                                value={singleDate} 
                                onChange={(e) => setSingleDate(e.target.value)} 
                                className="bg-transparent text-[10px] font-black outline-none uppercase w-full text-center tracking-wider cursor-pointer" 
                            />
                        ) : (
                            <div className="flex items-center gap-1 w-full justify-center">
                                <input 
                                    type="date" 
                                    value={dateRange.start} 
                                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                                    className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase text-center tracking-tighter cursor-pointer" 
                                />
                                <span className="text-[9px] text-slate-300 font-bold">-</span>
                                <input 
                                    type="date" 
                                    value={dateRange.end} 
                                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                                    className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase text-center tracking-tighter cursor-pointer" 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <button onClick={resetFilters} className="h-full aspect-square flex items-center justify-center bg-black text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10 shrink-0">
                    <RotateCcw size={18} />
                </button>
            </div>
        </div>

        {/* --- DESKTOP TABLE (Hidden on Mobile) --- */}
        <div className="hidden md:block bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                    <tr className="bg-slate-50 text-slate-400">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100">Invoice</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100">Franchise ID</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100">Customer</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100">Status</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100">Date & Time</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading && invoices.length === 0 ? (
                        <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400">Loading Ledger...</td></tr>
                    ) : filteredInvoices.length === 0 ? (
                        <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400">No Invoices Found</td></tr>
                    ) : filteredInvoices.map((inv) => (
                        <tr key={inv.id} onClick={() => openInvoiceModal(inv)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                            <td className="p-6"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black">#{inv.id.toString().slice(-6).toUpperCase()}</span></td>
                            <td className="p-6"><span className="text-xs font-black text-slate-700">{inv.franchise_id}</span></td>
                            <td className="p-6">
                                <div className="text-xs font-black text-slate-800">{inv.customer_name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{inv.customer_phone}</div>
                            </td>
                            <td className="p-6">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(inv.status)}`}>
                                    {inv.status || 'Incoming'}
                                </span>
                            </td>
                            <td className="p-6 text-xs font-bold text-slate-500 uppercase">{formatDateTime(inv.created_at)}</td>
                            <td className="p-6 text-right text-sm font-black" style={{ color: PRIMARY }}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* --- MOBILE CARD LIST (Visible on Mobile) --- */}
        <div className="md:hidden flex flex-col gap-4 pb-20">
            {loading && invoices.length === 0 ? (
                <div className="text-center p-10 text-slate-400 font-bold text-xs uppercase">Loading Ledger...</div>
            ) : filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <Inbox size={32} className="mb-2 opacity-50"/>
                    <span className="font-bold text-xs uppercase tracking-widest">No Invoices Found</span>
                </div>
            ) : filteredInvoices.map((inv) => (
                <div key={inv.id} onClick={() => openInvoiceModal(inv)} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm active:scale-95 transition-transform">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black mb-2 inline-block">#{inv.id.toString().slice(-6).toUpperCase()}</span>
                            <h3 className="text-sm font-black text-slate-800">{inv.customer_name}</h3>
                            <p className="text-[10px] font-bold text-slate-400">ID: {inv.franchise_id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black" style={{ color: PRIMARY }}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border inline-block mt-1 ${getStatusStyle(inv.status)}`}>
                                {inv.status || 'Incoming'}
                            </span>
                        </div>
                    </div>
                    <div className="pt-4 border-t-2 border-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                            <Calendar size={12} /> {formatDateTime(inv.created_at)}
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">View Details &rarr;</span>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}

export default CentralInvoices;