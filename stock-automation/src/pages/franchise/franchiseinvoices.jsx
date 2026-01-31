import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Search, Calendar, Printer, ChevronRight, CheckCircle2,
  X, MapPin, ShieldCheck, CalendarRange, LayoutDashboard,
  CalendarDays, Store, FileDown, TrendingUp, ReceiptText, ChevronDown, Phone, Mail
} from "lucide-react"; 

const BRAND_GREEN = "rgb(0, 100, 55)";

function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Franchise ID State
  const [currentFranchiseId, setCurrentFranchiseId] = useState("LOADING...");

  const [filterMode, setFilterMode] = useState("single"); 
  const [singleDate, setSingleDate] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchData();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("franchise_id")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setCurrentFranchiseId(data.franchise_id);
        }
      }
    } catch (error) {
      console.error("Profile Fetch Error", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        created_at,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        branch_location,
        franchise_id,
        total_amount,
        status,
        profiles:created_by (company) 
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch Error:", error);
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.franchise_id?.toLowerCase().includes(search.toLowerCase()) ||
        inv.id.toLowerCase().includes(search.toLowerCase());
      
      const invDateStr = new Date(inv.created_at).toISOString().split('T')[0];

      let matchesDate = true;
      if (filterMode === "single" && singleDate) {
        matchesDate = invDateStr === singleDate;
      } else if (filterMode === "range" && customStart && customEnd) {
        matchesDate = invDateStr >= customStart && invDateStr <= customEnd;
      }

      return matchesSearch && matchesDate;
    });
  }, [invoices, search, filterMode, singleDate, customStart, customEnd]);

  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
    const count = filteredInvoices.length;
    return { total, count };
  }, [filteredInvoices]);

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);
    
    if (error) console.error("Items Fetch Error:", error);
    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 relative">
      
      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
            {/* Back Button */}
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">
                <ArrowLeft size={18} /> <span>Back</span>
            </button>
            
            {/* Mobile Title */}
            <h1 className="text-base font-black uppercase tracking-widest text-center md:hidden">Invoices</h1>
            
            {/* Mobile ID Box */}
            <div className="flex items-center gap-2 md:hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID:</span>
                <span className="text-[10px] font-black text-black bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                    {currentFranchiseId}
                </span>
            </div>
        </div>
        
        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2">
            Franchise Invoices
        </h1>
        
        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID :</span>
            <span className="text-xs font-black text-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                {currentFranchiseId}
            </span>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        
        {/* STATS & FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* Revenue Card */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Total Revenue</p>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-black">₹{stats.total.toLocaleString()}</h2>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl">
                    <TrendingUp size={24} className="text-emerald-600" />
                </div>
            </div>

            {/* Date Filter Card */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col justify-center gap-3 shadow-sm">
                <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => setFilterMode("single")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "single" ? "bg-black text-white shadow-sm" : "text-slate-400"}`}>
                        <CalendarDays size={14}/> Single
                    </button>
                    <button onClick={() => setFilterMode("range")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "range" ? "bg-black text-white shadow-sm" : "text-slate-400"}`}>
                        <CalendarRange size={14}/> Range
                    </button>
                </div>
                <div className="flex items-center justify-center w-full">
                    {filterMode === "single" ? (
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none text-black text-center" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
                    ) : (
                        <div className="flex items-center gap-2 w-full">
                            <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] md:text-xs font-bold uppercase outline-none text-black text-center" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                            <span className="text-[9px] font-black text-slate-300">-</span>
                            <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] md:text-xs font-bold uppercase outline-none text-black text-center" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                        </div>
                    )}
                </div>
            </div>

            {/* Count Card */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Invoices</p>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-black">{stats.count}</h2>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl">
                    <ReceiptText size={24} className="text-blue-600" />
                </div>
            </div>
        </div>

        {/* SEARCH BAR */}
        <div className="mb-6">
            <div className="relative w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="SEARCH BY CUSTOMER OR ID..." 
                    className="w-full pl-14 pr-6 h-14 bg-white border border-slate-200 rounded-2xl outline-none focus:border-black transition-all text-xs md:text-sm font-bold shadow-sm uppercase text-black"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* --- INVOICE LIST (SCROLLABLE & RESPONSIVE) --- */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[65vh] min-h-[500px]">
            
            {/* Sticky Desktop Table Header */}
            <div className="hidden lg:grid grid-cols-6 gap-4 p-5 border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500 sticky top-0 z-10 shrink-0">
                <div className="col-span-1">Ref ID</div>
                <div className="col-span-1">Franchise ID</div>
                <div className="col-span-2">Customer / Company</div>
                <div className="col-span-1">Date</div>
                <div className="col-span-1 text-right">Amount</div>
            </div>

            {/* Scrollable Content Area */}
            <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                        <p className="text-xs font-bold uppercase tracking-widest">Loading Invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <ReceiptText size={48} className="opacity-20"/>
                        <p className="text-xs font-bold uppercase tracking-widest">No Invoices Found</p>
                    </div>
                ) : filteredInvoices.map((inv) => (
                    // RESPONSIVE ROW/CARD
                    <div 
                        key={inv.id} 
                        onClick={() => openInvoiceDetails(inv)} 
                        className="group hover:bg-slate-50 cursor-pointer transition-colors p-5 flex flex-col lg:grid lg:grid-cols-6 lg:items-center gap-4 lg:gap-4"
                    >
                        {/* Mobile: Top Row (ID + Amount) */}
                        <div className="flex justify-between items-center lg:hidden mb-2">
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase">#{inv.id.toString().slice(0, 8)}...</span>
                            <span className="text-lg font-black text-black">₹{inv.total_amount}</span>
                        </div>

                        {/* Desktop Cols */}
                        <div className="hidden lg:block text-xs font-black text-slate-500 uppercase">#{inv.id.toString().slice(0, 8)}...</div>
                        <div className="hidden lg:block"><span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold uppercase text-black">#{inv.franchise_id || 'N/A'}</span></div>

                        {/* Content */}
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-1 lg:hidden">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Shop ID:</span>
                                <span className="text-[10px] font-bold text-black uppercase bg-slate-100 px-2 rounded-md">{inv.franchise_id || 'N/A'}</span>
                            </div>
                            <p className="text-sm font-black uppercase text-black">{inv.customer_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{inv.profiles?.company || "Personal"}</p>
                        </div>

                        {/* Date */}
                        <div className="col-span-1 flex justify-between lg:block items-center border-t lg:border-none border-slate-50 pt-3 lg:pt-0 mt-1 lg:mt-0">
                            <span className="text-[10px] text-slate-400 font-bold lg:hidden uppercase">Date</span>
                            <span className="text-xs font-bold text-slate-600 uppercase">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                        </div>

                        {/* Desktop Amount */}
                        <div className="hidden lg:flex col-span-1 justify-end items-center gap-4">
                            <p className="text-sm font-black text-black">₹{inv.total_amount}</p>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-black transition-all" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* --- RESPONSIVE MODAL --- */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Details</p>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight">{selectedInvoice.customer_name}</h2>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-black" />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Phone size={10}/> Contact</p>
                            <p className="text-[11px] font-bold text-black">{selectedInvoice.customer_phone || "N/A"}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Mail size={10}/> Email</p>
                            <p className="text-[11px] font-bold text-black lowercase truncate">{selectedInvoice.customer_email || "N/A"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin size={10}/> Billing Address</p>
                        <p className="text-[11px] font-bold text-black uppercase leading-tight">{selectedInvoice.customer_address || "No address provided"}</p>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Branch Location</span>
                             <span className="text-[10px] font-black text-black uppercase">{selectedInvoice.branch_location || "HQ"}</span>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-500">Items</span>
                            <span className="text-[10px] font-black uppercase text-slate-500">ID: {selectedInvoice.franchise_id}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {itemsLoading ? (
                                <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase animate-pulse">Loading Items...</div>
                            ) : invoiceItems.map((item, i) => (
                                <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                                    <div>
                                        <p className="text-xs font-black uppercase text-black mb-1">{item.item_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x ₹{item.price}</p>
                                    </div>
                                    <p className="font-black text-sm text-black">₹{(Number(item.quantity) * Number(item.price)).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modal Footer (Fixed) */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0 md:rounded-b-[2.5rem]">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Payable</span>
                        <span className="text-2xl font-black text-black tracking-tighter">₹{selectedInvoice.total_amount}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">
                            <Printer size={14}/> Print
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-black text-[10px] font-black uppercase tracking-widest hover:border-black active:scale-95 transition-all">
                            <FileDown size={14}/> Save
                        </button>
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

export default FranchiseInvoices;