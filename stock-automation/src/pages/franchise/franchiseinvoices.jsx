import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ArrowLeft, Search, Calendar, Printer, ChevronRight, CheckCircle2,
  X, MapPin, ShieldCheck, CalendarRange, LayoutDashboard,
  CalendarDays, Store, FileDown, TrendingUp, ReceiptText, ChevronDown, Phone, Mail, Clock
} from "lucide-react";

function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("single");
  const [singleDate, setSingleDate] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const brandGreen = "rgb(0, 100, 55)";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("invoices").select(`id,created_at,customer_name,customer_phone,customer_email,customer_address,branch_location,franchise_id,total_amount,status,profiles:created_by (company)`).order("created_at", { ascending: false });
    if (error) console.error(error);
    else setInvoices(data || []);
    setLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customer_name?.toLowerCase().includes(search.toLowerCase()) || inv.franchise_id?.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
      const invDateStr = new Date(inv.created_at).toISOString().split('T')[0];
      let matchesDate = true;
      if (filterMode === "single" && singleDate) matchesDate = invDateStr === singleDate;
      else if (filterMode === "range" && customStart && customEnd) matchesDate = invDateStr >= customStart && invDateStr <= customEnd;
      return matchesSearch && matchesDate;
    });
  }, [invoices, search, filterMode, singleDate, customStart, customEnd]);

  const stats = useMemo(() => ({
    total: filteredInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0),
    count: filteredInvoices.length
  }), [filteredInvoices]);

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black antialiased font-sans pb-20">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 h-16 md:h-20 flex items-center shadow-sm justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-black"><ArrowLeft size={22} /></button>
        <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Invoices</h1>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <Store size={14} />
          <span className="text-[10px] md:text-sm font-black uppercase">{isMobile ? invoices[0]?.franchise_id : `ID: ${invoices[0]?.franchise_id || "TV-HQ"}`}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div><p className="text-[9px] font-black text-slate-500 uppercase">Revenue</p><h2 className="text-2xl font-black">₹{stats.total.toLocaleString()}</h2></div>
            <TrendingUp size={24} className="text-black opacity-10" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setFilterMode("single")} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${filterMode === "single" ? "bg-black text-white" : "text-slate-500"}`}>Single</button>
              <button onClick={() => setFilterMode("range")} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${filterMode === "range" ? "bg-black text-white" : "text-slate-500"}`}>Range</button>
            </div>
            {filterMode === "single" ? (
              <input type="date" className="w-full bg-slate-50 border rounded-lg px-3 py-1 text-[10px] font-black" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            ) : (
              <div className="flex items-center gap-2">
                <input type="date" className="flex-1 bg-slate-50 border rounded-lg px-2 py-1 text-[9px] font-black" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <input type="date" className="flex-1 bg-slate-50 border rounded-lg px-2 py-1 text-[9px] font-black" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            )}
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div><p className="text-[9px] font-black text-slate-500 uppercase">Count</p><h2 className="text-2xl font-black">{stats.count}</h2></div>
            <ReceiptText size={24} className="text-black opacity-10" />
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search invoices..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold uppercase shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {loading ? <div className="text-center py-10 font-black animate-pulse">SYNCING...</div> :
              filteredInvoices.map((inv) => (
                <div key={inv.id} onClick={() => openInvoiceDetails(inv)} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center active:scale-95 transition-all">
                  <div>
                    <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mb-1">#{inv.franchise_id}</div>
                    <p className="text-sm font-black uppercase truncate max-w-[150px]">{inv.customer_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                      <Calendar size={10} /> {new Date(inv.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tracking-tight">₹{inv.total_amount}</p>
                    <span className="text-[8px] font-black uppercase border border-black px-2 py-0.5 rounded-full">{inv.status || 'Paid'}</span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: brandGreen }}>
                  <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">S.No</th>
                  <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Franchise ID</th>
                  <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest">Company</th>
                  <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (<tr><td colSpan="5" className="py-20 text-center font-black animate-pulse uppercase">Syncing...</td></tr>) :
                  filteredInvoices.map((inv, idx) => (
                    <tr key={inv.id} onClick={() => openInvoiceDetails(inv)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                      <td className="px-6 py-6 text-xs font-black">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="px-6 py-6 text-xs font-black uppercase"><span className="px-2 py-1 bg-slate-100 rounded-md">#{inv.franchise_id}</span></td>
                      <td className="px-6 py-6"><p className="text-xs font-black uppercase mb-1">{inv.profiles?.company || "Personal"}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{inv.customer_name}</p></td>
                      <td className="px-6 py-6 text-center"><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-black">{inv.status || 'Paid'}</span></td>
                      <td className="px-6 py-6 text-right font-black"><div className="flex items-center justify-end gap-3">₹{inv.total_amount}<ChevronRight size={16} className="text-slate-300" /></div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-none md:rounded-[32px] w-full h-full md:h-auto md:max-w-lg overflow-y-auto shadow-2xl border-none md:border-4 border-black relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-black text-white rounded-full z-10"><X size={24} /></button>
            <div className="p-6 md:p-10">
              <div className="mb-6">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Invoice Details</p>
                <h2 className="text-2xl md:text-3xl font-black uppercase">{selectedInvoice.customer_name}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase">REF: {selectedInvoice.id.slice(-8)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[8px] font-black uppercase mb-1 flex items-center gap-1"><Phone size={10} /> Phone</p>
                  <p className="text-[10px] font-black">{selectedInvoice.customer_phone || "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[8px] font-black uppercase mb-1 flex items-center gap-1"><Mail size={10} /> Email</p>
                  <p className="text-[10px] font-black truncate">{selectedInvoice.customer_email || "N/A"}</p>
                </div>
              </div>
              <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden mb-6">
                <div className="bg-slate-100 px-4 py-2 border-b-2 border-slate-200 flex justify-between text-[9px] font-black uppercase"><span>Items</span><span>Total</span></div>
                <div className="p-4 max-h-40 overflow-y-auto space-y-3">
                  {invoiceItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div><p className="text-xs font-black uppercase leading-none">{item.item_name}</p><p className="text-[9px] text-slate-500 font-bold">{item.quantity} x ₹{item.price}</p></div>
                      <p className="font-black text-sm">₹{(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t-2 border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Total Bill</span>
                  <span className="text-2xl font-black">₹{selectedInvoice.total_amount}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest"><Printer size={14} /> Print</button>
                <button className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-black text-black text-[10px] font-black uppercase tracking-widest"><FileDown size={14} /> PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default FranchiseInvoices;