import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Search, Calendar, Printer, ChevronRight, CheckCircle2,
  X, MapPin, ShieldCheck, CalendarRange, LayoutDashboard,
  CalendarDays, Store, FileDown, TrendingUp, ReceiptText, ChevronDown, Phone, Mail
} from "lucide-react"; 

function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // New state for the top right ID
  const [currentFranchiseId, setCurrentFranchiseId] = useState("LOADING...");

  const [filterMode, setFilterMode] = useState("single"); 
  const [singleDate, setSingleDate] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const brandGreen = "rgb(0, 100, 55)";

  useEffect(() => {
    fetchProfile();
    fetchData();
  }, []);

  // 1. Fetch the logged-in user's profile to get their ID specifically
  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
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
    // Explicitly selecting all columns to ensure nothing is missed by the helper
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
    console.log("Opening Invoice:", invoice);
    
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
    <div className="min-h-screen bg-[#F8F9FA] text-black antialiased font-sans pb-20">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-8 h-20 flex items-center shadow-sm">
        <div className="flex-1 flex justify-start">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-black">
            <ArrowLeft size={22} />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-black">Invoices</h1>
        </div>

        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              {/* UPDATED: Uses state variable fetched from profile */}
              <span className="text-sm font-black text-black uppercase tracking-tight whitespace-nowrap">
                  Franchise ID: <span className="text-black">{currentFranchiseId}</span>
              </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-8">
        
        {/* STATS & FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Revenue</p>
                    <h2 className="text-3xl font-black tracking-tighter text-black">₹{stats.total.toLocaleString()}</h2>
                </div>
                <TrendingUp size={32} className="text-black opacity-10" />
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col justify-center gap-3 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setFilterMode("single")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "single" ? "bg-black text-white shadow-sm" : "text-slate-500"}`}>
                        <CalendarDays size={14}/> Single Date
                    </button>
                    <button onClick={() => setFilterMode("range")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "range" ? "bg-black text-white shadow-sm" : "text-slate-500"}`}>
                        <CalendarRange size={14}/> Date Range
                    </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                    {filterMode === "single" ? (
                        <input type="date" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-black uppercase outline-none text-black" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="date" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none w-28 text-black" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                            <span className="text-[9px] font-black text-slate-300">TO</span>
                            <input type="date" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none w-28 text-black" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Invoices Generated</p>
                    <h2 className="text-3xl font-black tracking-tighter text-black">{stats.count}</h2>
                </div>
                <ReceiptText size={32} className="text-black opacity-10" />
            </div>
        </div>

        {/* SEARCH & DATE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="md:col-span-3 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by customer, franchise ID or Ref..." 
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[20px] outline-none focus:ring-2 ring-black/5 text-sm font-bold shadow-sm uppercase text-black"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="bg-white border border-slate-200 rounded-[20px] p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black text-white">
                    <Calendar size={20} />
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase">Today's Date</p>
                    <p className="text-sm font-black text-black uppercase">
                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-white" style={{ backgroundColor: brandGreen }}>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white">S.No</th>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white">Franchise ID</th>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white">Company</th>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white">Date</th>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white text-center">Status</th>
                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-white text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan="6" className="py-20 text-center font-black text-black uppercase animate-pulse">Syncing...</td></tr>
                    ) : filteredInvoices.length === 0 ? (
                        <tr><td colSpan="6" className="py-20 text-center font-black text-slate-400 uppercase">No Records Found</td></tr>
                    ) : filteredInvoices.map((inv, idx) => (
                        <tr key={inv.id} onClick={() => openInvoiceDetails(inv)} className="hover:bg-slate-50 cursor-pointer transition-colors group text-black">
                            <td className="px-6 py-6 text-xs font-black text-black">{(idx + 1).toString().padStart(2, '0')}</td>
                            <td className="px-6 py-6 text-xs font-black uppercase text-black">
                                <span className="px-2 py-1 bg-slate-100 rounded-md">#{inv.franchise_id || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-6">
                                <p className="text-xs font-black uppercase leading-none mb-1 text-black">{inv.profiles?.company || "Personal"}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{inv.customer_name}</p>
                            </td>
                            <td className="px-6 py-6 text-xs font-black uppercase text-black">
                                {new Date(inv.created_at).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-6 py-6 text-center">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black bg-white text-black">
                                    <ShieldCheck size={10} /> {inv.status || 'Paid'}
                                </span>
                            </td>
                            <td className="px-6 py-6 text-right font-black text-black">
                                <div className="flex items-center justify-end gap-3">
                                    <p className="text-sm tracking-tight">₹{inv.total_amount}</p>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-black transition-all" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </main>

      {/* POPUP MODAL */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border-4 border-black relative animate-in zoom-in duration-150">
            
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-black text-white rounded-full hover:scale-110 transition-transform z-10 shadow-lg">
              <X size={24} strokeWidth={3} />
            </button>

            <div className="p-10">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Invoice Breakdown</p>
                    <h2 className="text-3xl font-black text-black uppercase tracking-tighter leading-tight">{selectedInvoice.customer_name}</h2>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter">REF: {selectedInvoice.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><Phone size={10}/> Contact</p>
                        <p className="text-[11px] font-black text-black">{selectedInvoice.customer_phone || "N/A"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><Mail size={10}/> Email</p>
                        <p className="text-[11px] font-black text-black lowercase truncate">{selectedInvoice.customer_email || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin size={10}/> Billing Address</p>
                    <p className="text-[11px] font-black text-black uppercase leading-tight">{selectedInvoice.customer_address || "No address provided"}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Branch: {selectedInvoice.branch_location || "HQ"}</p>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-6 py-3 border-b-2 border-slate-200 flex justify-between items-center text-black">
                        <span className="text-[10px] font-black uppercase text-black">Item Manifest</span>
                        <span className="text-[10px] font-black uppercase text-black">Franchise ID: {selectedInvoice.franchise_id}</span>
                    </div>
                    <div className="p-6 max-h-48 overflow-y-auto space-y-4">
                        {itemsLoading ? <p className="text-center py-4 animate-pulse text-[10px] font-black uppercase text-black">Loading Items...</p> :
                            invoiceItems.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-black">
                                    <div>
                                        <p className="text-xs font-black uppercase leading-none mb-1 text-black">{item.item_name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{item.quantity} {item.unit} @ ₹{item.price}</p>
                                    </div>
                                    <p className="font-black text-sm tracking-tighter text-black">₹{(Number(item.quantity) * Number(item.price)).toFixed(2)}</p>
                                </div>
                            ))
                        }
                    </div>
                    
                    <div className="px-8 py-6 flex justify-between items-center border-t-2 border-slate-200 bg-white">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Amount</span>
                        <span className="text-3xl font-black text-black tracking-tighter italic">₹{selectedInvoice.total_amount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]">
                        <Printer size={14}/> Print
                    </button>
                    <button className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-black text-black text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50">
                        <FileDown size={14}/> PDF
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;