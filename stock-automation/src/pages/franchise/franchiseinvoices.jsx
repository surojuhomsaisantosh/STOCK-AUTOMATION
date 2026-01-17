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
  Filter,
  X,
  Clock,
  Hash,
  ShieldCheck,
  MapPin 
} from "lucide-react"; 

function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("all");
  
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

  const franchiseList = useMemo(() => {
    const map = new Map();
    invoices.forEach(inv => {
      if (inv.profiles?.franchise_id) {
        map.set(inv.created_by, inv.profiles.franchise_id);
      }
    });
    return Array.from(map, ([id, fId]) => ({ id, fId }));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesFranchise = selectedFranchise === "all" || inv.created_by === selectedFranchise;
      const matchesSearch = inv.customer_name.toLowerCase().includes(search.toLowerCase());
      return matchesFranchise && matchesSearch;
    });
  }, [invoices, search, selectedFranchise]);

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    const { data } = await supabase
      .from("invoice_items")
      .select("item_name, quantity, unit, price")
      .eq("invoice_id", invoice.id);
    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  const handlePrint = () => {
    if (!selectedInvoice) return;
    const total = selectedInvoice.total_amount;
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
      <p><b>Address:</b> ${selectedInvoice.profiles?.address || 'N/A'}</p>
      <p><b>Ref:</b> ${selectedInvoice.id.slice(0,8).toUpperCase()}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #f4f4f4;"><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <div style="text-align: right; margin-top: 20px;"><h3>Grand Total: ₹${total}</h3></div>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased font-sans pb-20">
      {/* HEADER */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-20 px-6 h-20 flex items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 font-bold absolute left-6 hover:opacity-70 transition-all" style={{ color: brandGreen }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase mx-auto tracking-tighter" style={{ color: brandGreen }}>Invoices</h1>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* COMPACT FILTERS */}
        <div className="flex flex-wrap gap-4 mb-12 items-center">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl w-fit">
            <Filter size={14} className="text-slate-400" />
            <select 
              className="bg-transparent outline-none text-xs font-bold cursor-pointer"
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
            >
              <option value="all">All Franchises</option>
              {franchiseList.map(f => (
                <option key={f.id} value={f.id}>{f.fId}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search customer..." 
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE HEADERS */}
        <div className="grid grid-cols-12 px-6 py-4 mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <div className="col-span-4">Ref & Customer</div>
          <div className="col-span-3 text-center">Franchise ID</div>
          <div className="col-span-3 text-center">Status</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {/* INVOICE LIST */}
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div 
              key={inv.id}
              onClick={() => openInvoiceDetails(inv)}
              className="grid grid-cols-12 items-center bg-white border border-slate-100 p-5 rounded-2xl cursor-pointer hover:border-slate-300 transition-all hover:shadow-md group"
            >
              <div className="col-span-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase leading-none mb-1">{inv.customer_name}</h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{inv.id.slice(0,8).toUpperCase()}</p>
              </div>
              <div className="col-span-3 text-center text-xs font-bold text-slate-600">{inv.profiles?.franchise_id || '---'}</div>
              <div className="col-span-3 flex justify-center">
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border" 
                      style={{ backgroundColor: brandGreenLight, color: brandGreen, borderColor: 'rgba(0,100,55,0.2)' }}>
                  <ShieldCheck size={10} /> Paid
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3">
                <p className="text-base font-black text-slate-900">₹{inv.total_amount}</p>
                <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-900" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* POPUP MODAL */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transform transition-all scale-100">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                <div className="flex flex-col">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Ref</span>
                   <span className="text-xs font-mono font-bold text-slate-800 tracking-widest uppercase">{selectedInvoice.id}</span>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors group">
                  <X size={20} className="text-slate-300 group-hover:text-slate-600" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-y-6 mb-8">
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{selectedInvoice.customer_name}</h2>
                </div>

                <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MapPin size={10} style={{color: brandGreen}}/> Franchise Address
                  </p>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase">
                    {selectedInvoice.profiles?.address || "Address not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Franchise ID</p>
                  <p className="font-bold text-slate-800 tracking-widest italic">#{selectedInvoice.profiles?.franchise_id}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: brandGreenLight, color: brandGreen }}>
                    <CheckCircle2 size={12}/> Success
                   </span>
                </div>

                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedInvoice.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(selectedInvoice.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 py-6 border-t border-slate-100 mb-6">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1 text-center">Order Breakdown</p>
                <div className="max-h-40 overflow-y-auto px-1 space-y-3">
                  {itemsLoading ? (
                    <p className="text-center text-[10px] font-bold uppercase text-slate-400 py-4">Loading items...</p>
                  ) : (
                    invoiceItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center group">
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase leading-none mb-1">{item.item_name}</p>
                          <p className="text-[10px] text-slate-400">{item.quantity} {item.unit} × ₹{item.price}</p>
                        </div>
                        <p className="font-black text-slate-900 text-sm">₹{item.quantity * item.price}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total Section in Brand Green instead of Black */}
              <div className="rounded-2xl p-6 flex justify-between items-center shadow-sm border border-slate-100" style={{ backgroundColor: brandGreenLight }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: brandGreen }}>Settlement Amount</span>
                <span className="text-2xl font-black italic" style={{ color: brandGreen }}>₹{selectedInvoice.total_amount}</span>
              </div>
            </div>

            {/* Redesigned Button: Centered, smaller, and premium */}
            <div className="px-8 pb-10 flex justify-center">
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-green-900/20 hover:scale-105 active:scale-95 transition-all duration-200"
                style={{ backgroundColor: brandGreen }}
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;