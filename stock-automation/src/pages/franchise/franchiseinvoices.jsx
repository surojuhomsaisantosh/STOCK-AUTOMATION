import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Search, Printer, X, MapPin, TrendingUp, ReceiptText, 
  CalendarRange, CalendarDays, Phone, Mail, FileDown, ChevronRight, Inbox
} from "lucide-react"; 

const BRAND_GREEN = "rgb(0, 100, 55)";

// --- HELPER: Number to Words ---
const amountToWords = (price) => {
  if (!price) return "";
  const num = Math.round(price);
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return; 
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  }
  return inWords(num) + "Rupees Only";
};

// --- COMPONENT: PRINTABLE INVOICE ---
const PrintableInvoice = ({ invoice, items }) => {
  if (!invoice) return null;

  const isTLeaf = (invoice.profiles?.company || "").toLowerCase().includes("leaf");
  const totalAmount = Number(invoice.total_amount) || 0;

  return (
    <div className="w-full bg-white text-black font-sans text-[11px] p-[10mm] leading-tight print-area">
      {/* OUTER BORDER CONTAINER - Fixed height to ensure 1-page print */}
      <div className="w-full border-2 border-black flex flex-col h-[277mm] box-border">
        
        {/* HEADER SECTION */}
        <div className="p-4 border-b-2 border-black relative">
          <div className="absolute top-4 left-0 w-full text-center">
            <h1 className="text-xl font-black uppercase tracking-widest underline underline-offset-4">TAX INVOICE</h1>
          </div>
          <div className="flex justify-between items-start mt-6">
            <div className="text-left">
                <h2 className="text-base font-black uppercase text-[#006437]">{invoice.profiles?.company || "TVANAMM"}</h2>
                <p className="font-bold text-[9px] whitespace-pre-line mt-1">
                    Registered Office, Hyderabad, Telangana - 500081<br />
                    GSTIN: <span className="font-black">36ABCDE1234F1Z5</span>
                </p>
            </div>
          </div>
        </div>

        {/* META DATA ROW */}
        <div className="flex border-b-2 border-black bg-gray-50">
          <div className="flex-1 border-r-2 border-black p-2">
            <span className="font-black uppercase text-[9px]">Invoice No:</span>
            <p className="font-black text-xs">#{invoice.id.toString().slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex-1 border-r-2 border-black p-2">
            <span className="font-black uppercase text-[9px]">Date:</span>
            <p className="font-black text-xs">{new Date(invoice.created_at).toLocaleDateString('en-GB')}</p>
          </div>
          <div className="flex-1 p-2">
            <span className="font-black uppercase text-[9px]">Franchise ID:</span>
            <p className="font-black text-xs">{invoice.franchise_id}</p>
          </div>
        </div>

        {/* BILL TO SECTION */}
        <div className="flex border-b-2 border-black">
          <div className="w-[65%] p-3 border-r-2 border-black">
            <span className="font-black uppercase underline text-[9px] mb-1 block">Bill To:</span>
            <h3 className="text-xs font-black uppercase">{invoice.customer_name}</h3>
            <p className="font-bold text-[10px] mt-1 leading-relaxed uppercase">
              {invoice.customer_address || "No address provided"}<br/>
              PH: {invoice.customer_phone}
            </p>
          </div>
          <div className="w-[35%] p-3 flex flex-col justify-center">
             <span className="text-[9px] font-black uppercase mb-1">Branch Location:</span>
             <p className="text-xs font-black uppercase">{invoice.branch_location || "HQ"}</p>
          </div>
        </div>

        {/* ITEMS TABLE - Enforced Fixed Layout */}
        <div className="flex-1 border-b-2 border-black">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '37%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '15%' }} />
            </colgroup>
            <thead className="bg-gray-100 text-[10px] border-b-2 border-black">
              <tr>
                <th className="p-2 border-r-2 border-black text-center">S.No</th>
                <th className="p-2 border-r-2 border-black">Description</th>
                <th className="p-2 border-r-2 border-black text-center">HSN/SAC</th>
                <th className="p-2 border-r-2 border-black text-center">Qty</th>
                <th className="p-2 border-r-2 border-black text-right">Rate</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-black last:border-b-0">
                  <td className="p-2 border-r-2 border-black text-center">{idx + 1}</td>
                  <td className="p-2 border-r-2 border-black uppercase truncate">{item.item_name}</td>
                  <td className="p-2 border-r-2 border-black text-center">{item.stocks?.hsn_code || '-'}</td>
                  <td className="p-2 border-r-2 border-black text-center">{item.quantity} {item.unit}</td>
                  <td className="p-2 border-r-2 border-black text-right">₹{item.price}</td>
                  <td className="p-2 text-right">₹{(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
              {/* Vertical line fill rows */}
              <tr className="h-full">
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black"></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TOTALS & FOOTER */}
        <div className="flex shrink-0">
          <div className="w-[60%] border-r-2 border-black p-3 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-black uppercase">Amount in Words:</span>
              <p className="italic font-black text-[10px] mt-1">{amountToWords(totalAmount)}</p>
            </div>
            <div className="mt-4">
              <p className="text-[8px] font-black uppercase underline">Terms & Conditions:</p>
              <ul className="text-[7px] font-bold list-decimal list-inside mt-1 uppercase leading-tight">
                <li>Goods once sold will not be taken back.</li>
                <li>Payment terms : 100% advance.</li>
                <li>Subject to Hyderabad Jurisdiction.</li>
              </ul>
            </div>
          </div>
          <div className="w-[40%]">
            <div className="flex justify-between p-2 border-b border-black">
              <span className="font-black uppercase text-[9px]">Taxable Amt:</span>
              <span className="font-black text-xs">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-3 border-b-2 border-black bg-gray-200">
              <span className="font-black uppercase text-xs">Grand Total:</span>
              <span className="font-black text-sm">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex-1 flex flex-col justify-end p-4 h-24 text-center">
              <p className="font-black border-t border-black pt-1 uppercase text-[8px]">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentFranchiseId, setCurrentFranchiseId] = useState("HQ-01");
  const [filterMode, setFilterMode] = useState("single"); 
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setCurrentFranchiseId(data.franchise_id);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`*, profiles:created_by (company)`)
      .order("created_at", { ascending: false });
    if (!error) setInvoices(data || []);
    setLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customer_name?.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
      const invDateStr = new Date(inv.created_at).toISOString().split('T')[0];
      let matchesDate = true;
      if (filterMode === "single" && singleDate) matchesDate = invDateStr === singleDate;
      else if (filterMode === "range" && customStart && customEnd) matchesDate = invDateStr >= customStart && invDateStr <= customEnd;
      return matchesSearch && matchesDate;
    });
  }, [invoices, search, filterMode, singleDate, customStart, customEnd]);

  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
    return { total, count: filteredInvoices.length };
  }, [filteredInvoices]);

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    
    // UPDATED: Fetch items and join with stocks table to get hsn_code
    const { data, error } = await supabase
        .from("invoice_items")
        .select(`*, stocks(hsn_code)`)
        .eq("invoice_id", invoice.id);
    
    if (error) console.error(error);
    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 relative">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; margin: 0; padding: 0; }
          @page { margin: 0; size: A4; }
          .print-area { width: 210mm; height: 297mm; }
        }
        .print-only { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* PRINT AREA */}
      <div className="print-only">
        <PrintableInvoice invoice={selectedInvoice} items={invoiceItems} />
      </div>

      <div className="no-print">
        {/* --- HEADER --- */}
        <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">
                  <ArrowLeft size={18} /> <span>Back</span>
              </button>
              <h1 className="text-base font-black uppercase tracking-widest text-center md:hidden">Invoices</h1>
              <div className="flex items-center gap-2 md:hidden">
                  <span className="text-[10px] font-black text-slate-400">ID:</span>
                  <span className="text-[10px] font-black text-black bg-white border border-slate-200 px-2 py-1 rounded-lg">{currentFranchiseId}</span>
              </div>
          </div>
          <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2">Invoices</h1>
          <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400">ID :</span>
              <span className="text-xs font-black text-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg">{currentFranchiseId}</span>
          </div>
        </nav>

        <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
          {/* STATS & FILTER CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                      <h2 className="text-2xl font-black mt-1">₹{stats.total.toLocaleString()}</h2>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={24}/></div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setFilterMode("single")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "single" ? "bg-white text-black shadow-sm" : "text-slate-400"}`}>Single</button>
                      <button onClick={() => setFilterMode("range")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "range" ? "bg-white text-black shadow-sm" : "text-slate-400"}`}>Range</button>
                  </div>
                  <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-center" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
                      <h2 className="text-2xl font-black mt-1">{stats.count}</h2>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ReceiptText size={24}/></div>
              </div>
          </div>

          {/* SEARCH */}
          <div className="relative mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="SEARCH CUSTOMER NAME..." className="w-full pl-14 pr-6 h-14 bg-white border border-slate-200 rounded-2xl outline-none focus:border-black transition-all text-sm font-bold uppercase" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* LIST AREA */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden h-[60vh] flex flex-col">
              <div className="hidden lg:grid grid-cols-5 gap-4 p-5 border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="col-span-1">Ref ID</div>
                  <div className="col-span-2">Customer</div>
                  <div className="col-span-1">Date</div>
                  <div className="col-span-1 text-right">Amount</div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                  {filteredInvoices.map((inv) => (
                      <div key={inv.id} onClick={() => openInvoiceDetails(inv)} className="p-5 flex justify-between items-center lg:grid lg:grid-cols-5 hover:bg-slate-50 cursor-pointer transition-all">
                          <span className="text-[10px] font-bold text-slate-400 uppercase truncate">#{inv.id.slice(0,8)}</span>
                          <span className="col-span-2 font-black uppercase text-sm">{inv.customer_name}</span>
                          <span className="hidden lg:block text-xs font-bold text-slate-500">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                          <div className="flex items-center justify-end gap-3">
                              <span className="font-black text-sm">₹{inv.total_amount}</span>
                              <ChevronRight size={16} className="text-slate-300"/>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        </main>
      </div>

      {/* --- DETAILS MODAL --- */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 no-print">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-6 border-b flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-black uppercase tracking-tight">Invoice Details</h2>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full transition-colors hover:bg-slate-100"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                    <div className="bg-slate-50 p-4 rounded-2xl border flex items-center justify-between">
                         <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Customer</span>
                            <p className="font-black text-sm uppercase">{selectedInvoice.customer_name}</p>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Phone</span>
                            <p className="font-black text-sm uppercase">{selectedInvoice.customer_phone}</p>
                         </div>
                    </div>
                    <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Order Items</span>
                        <div className="border rounded-2xl overflow-hidden divide-y divide-slate-100">
                            {invoiceItems.map((item, i) => (
                                <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                                    <div>
                                        <p className="text-xs font-black uppercase">{item.item_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x ₹{item.price}</p>
                                    </div>
                                    <p className="font-black text-sm">₹{(item.quantity * item.price).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t bg-slate-50 shrink-0">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                        <span className="text-2xl font-black tracking-tighter">₹{selectedInvoice.total_amount}</span>
                    </div>
                    <button onClick={handlePrint} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Printer size={16}/> Print Formal Invoice
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;