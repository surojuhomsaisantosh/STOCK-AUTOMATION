import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Printer,
  ChevronRight,
  CheckCircle2,
  X,
  MapPin,
  ShieldCheck,
  CalendarRange,
  LayoutDashboard,
  CalendarDays,
  Store,
  FileDown
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

  const brandGreen = "rgb(0, 100, 55)";
  const brandGreenLight = "rgba(0, 100, 55, 0.1)";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, total_amount, created_at, customer_name, created_by,
          profiles:created_by (franchise_id, address) 
        `)
        .order("created_at", { ascending: false });

      if (error) console.error("Error:", error);
      else setInvoices(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customer_name.toLowerCase().includes(search.toLowerCase());
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

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  const handlePrint = () => {
    if (!selectedInvoice) return;
    const itemsHTML = invoiceItems.map((item, i) => `
      <tr>
        <td style="border-bottom: 1px solid #eee; padding: 10px;">${i + 1}</td>
        <td style="border-bottom: 1px solid #eee; padding: 10px;">${item.item_name}</td>
        <td style="border-bottom: 1px solid #eee; padding: 10px; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="border-bottom: 1px solid #eee; padding: 10px; text-align: right;">₹${item.price}</td>
        <td style="border-bottom: 1px solid #eee; padding: 10px; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>`).join("");

    const html = `<html><body style="font-family: sans-serif; padding: 40px;">
      <h2 style="color: ${brandGreen}">TAX INVOICE</h2>
      <p><b>Customer:</b> ${selectedInvoice.customer_name}</p>
      <p><b>Franchise ID:</b> ${selectedInvoice.profiles?.franchise_id}</p>
      <p><b>Ref:</b> ${selectedInvoice.id.slice(0,8).toUpperCase()}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f4f4f4;"><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <div style="text-align: right; margin-top: 20px;"><h3>Total: ₹${selectedInvoice.total_amount}</h3></div>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased font-sans pb-20">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-20 px-6 h-20 flex items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 font-bold absolute left-6 hover:opacity-70 transition-all" style={{ color: brandGreen }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase mx-auto tracking-tighter" style={{ color: brandGreen }}>Invoices</h1>
        <div className="absolute right-6 flex flex-col items-end">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Franchise ID</p>
            <p className="text-xs font-black text-slate-800 tracking-tighter flex items-center gap-1">
                <Store size={12} style={{color: brandGreen}}/> {invoices[0]?.profiles?.franchise_id || "ID-001"}
            </p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ACTION BAR: SEARCH, TOGGLE, AND DATE ALL IN ONE ROW */}
        <div className="flex items-center gap-4 mb-10 p-3 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm">
          
          <div className="relative flex-[2.5]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search customer..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-bold transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-xl flex-[2]">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setFilterMode("single")} className={`p-1.5 rounded-md transition-all ${filterMode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}><CalendarDays size={14} /></button>
              <button onClick={() => setFilterMode("range")} className={`p-1.5 rounded-md transition-all ${filterMode === "range" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}><CalendarRange size={14} /></button>
            </div>
            <div className="h-6 w-[1px] bg-slate-100 mx-1"></div>
            {filterMode === "single" ? (
              <input type="date" className="text-xs font-black outline-none bg-transparent uppercase cursor-pointer" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            ) : (
              <div className="flex items-center gap-2">
                <input type="date" className="text-[10px] font-black outline-none bg-transparent uppercase cursor-pointer w-24" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <span className="text-[9px] font-black text-slate-300">TO</span>
                <input type="date" className="text-[10px] font-black outline-none bg-transparent uppercase cursor-pointer w-24" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            )}
            {(singleDate || customStart) && (
              <button onClick={() => {setSingleDate(""); setCustomStart(""); setCustomEnd("");}} className="ml-auto p-1 hover:bg-slate-50 rounded-full"><X size={14} className="text-slate-400" /></button>
            )}
          </div>

          <div className="flex flex-col items-end pr-4 min-w-[170px] border-l border-slate-200 ml-2">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Todays Date:</p>
            <div className="flex items-center gap-1.5 text-slate-900 font-black text-sm whitespace-nowrap">
              <Calendar size={14} style={{color: brandGreen}}/>
              {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 px-8 py-4 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
          <div className="col-span-4">Ref & Customer</div>
          <div className="col-span-3 text-center">Reference ID</div>
          <div className="col-span-3 text-center">Status</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        <div className="space-y-3">
          {loading ? (
             <div className="py-20 text-center animate-pulse text-slate-400 font-bold text-xs uppercase">Loading...</div>
          ) : filteredInvoices.map((inv) => (
            <div key={inv.id} onClick={() => openInvoiceDetails(inv)} className="grid grid-cols-12 items-center bg-white border border-slate-100 p-6 rounded-[24px] cursor-pointer hover:border-slate-300 transition-all hover:shadow-md group">
              <div className="col-span-4">
                <h3 className="font-black text-slate-800 text-sm uppercase mb-1">{inv.customer_name}</h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{inv.id.slice(0,8)} | {new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 uppercase">
                   <LayoutDashboard size={10} /> {inv.profiles?.franchise_id || 'N/A'}
                </span>
              </div>
              <div className="col-span-3 flex justify-center">
                <span className="flex items-center gap-1 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border" style={{ backgroundColor: brandGreenLight, color: brandGreen, borderColor: 'rgba(0,100,55,0.1)' }}>
                  <ShieldCheck size={10} /> Paid
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-4">
                <p className="text-base font-black text-slate-900">₹{inv.total_amount}</p>
                <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-900" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-10 pb-6">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                 <div><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Ref</span><p className="text-xs font-mono font-bold text-slate-800 uppercase">{selectedInvoice.id}</p></div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} className="text-slate-300" /></button>
              </div>
              <div className="space-y-6">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedInvoice.customer_name}</h2></div>
                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={10}/> Franchise Address</p>
                   <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed">{selectedInvoice.profiles?.address || "Address not available"}</p>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-6">
                   <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Franchise ID</p><p className="font-black text-slate-800 tracking-widest italic uppercase">#{selectedInvoice.profiles?.franchise_id}</p></div>
                   <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: brandGreenLight, color: brandGreen }}><CheckCircle2 size={10}/> Success</span></div>
                </div>
              </div>
              <div className="mt-8 py-6 border-t border-slate-100">
                <div className="max-h-40 overflow-y-auto space-y-3">
                  {itemsLoading ? <p className="text-center text-[10px] font-bold uppercase text-slate-300 py-4">Loading items...</p> :
                    invoiceItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div><p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{item.item_name}</p><p className="text-[10px] text-slate-400 font-bold">{item.quantity} {item.unit} @ ₹{item.price}</p></div>
                        <p className="font-black text-slate-900 text-sm">₹{item.quantity * item.price}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="mt-6 rounded-[24px] p-6 flex justify-between items-center" style={{ backgroundColor: brandGreenLight }}>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: brandGreen }}>Amount Due</span>
                <span className="text-3xl font-black italic" style={{ color: brandGreen }}>₹{selectedInvoice.total_amount}</span>
              </div>
            </div>

            <div className="px-10 pb-12 flex items-center justify-center gap-4">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-full text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-green-900/20 hover:scale-105 transition-all" style={{ backgroundColor: brandGreen }}>
                <Printer size={18} /> Print
              </button>
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-full border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all">
                <FileDown size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;