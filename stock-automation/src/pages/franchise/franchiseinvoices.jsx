import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Search, Printer, X, TrendingUp, ReceiptText, ChevronRight, Clock, Calendar
} from "lucide-react"; 

// --- ASSETS IMPORT ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tLeafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

const ITEMS_PER_PAGE = 12;

// --- HELPERS: Date & Time Fixing ---

const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  return dateStr.includes('Z') || dateStr.includes('+') 
    ? new Date(dateStr) 
    : new Date(dateStr.replace(' ', 'T') + "Z");
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return parseDate(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return parseDate(dateStr).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
};

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

// --- COMPONENT: SINGLE INVOICE PAGE ---
const InvoicePage = ({ invoice, items, companyDetails, pageIndex, totalPages, selectedLogo, totalAmount, allItemsForTaxCalc }) => {
    const emptyRows = ITEMS_PER_PAGE - items.length;
    let totalTaxableValue = 0, totalCGST = 0, totalSGST = 0;

    (allItemsForTaxCalc || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const basePrice = Number(item.price) || 0;
        const gstRate = Number(item.stocks?.gst_rate) || 0;
        const rowTaxable = basePrice * qty;
        const rowTaxAmount = rowTaxable * (gstRate / 100);
        totalTaxableValue += rowTaxable;
        totalCGST += (rowTaxAmount / 2);
        totalSGST += (rowTaxAmount / 2);
    });

    const grandTotal = Number(totalAmount) || 0;
    const calculatedTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = grandTotal - calculatedTotal;

    return (
        <div className="w-full bg-white text-black font-sans text-[11px] p-[10mm] leading-tight h-[297mm] relative box-border flex flex-col">
            <div className="w-full border-2 border-black flex flex-col flex-1">
                <div className="border-b-2 border-black shrink-0">
                    <div className="text-center pt-2 pb-1">
                        <h2 className="text-base font-black uppercase tracking-widest underline underline-offset-4">TAX INVOICE</h2>
                    </div>
                    <div className="flex justify-between items-start p-6 pt-2">
                        <div className="w-1/2 text-left pr-4">
                            <h3 className="font-black uppercase text-[10px] underline underline-offset-2 mb-3">Registered Office:</h3>
                            <p className="font-bold text-[10px] uppercase leading-snug whitespace-pre-wrap">{companyDetails?.company_address}</p>
                            <div className="mt-3 text-[10px] font-bold space-y-1">
                                <p>GSTIN: <span className="font-black text-black">{companyDetails?.company_gst || "-"}</span></p>
                                {companyDetails?.company_email && <p>Email: {companyDetails.company_email}</p>}
                            </div>
                        </div>
                        <div className="w-1/2 flex justify-end pt-2">
                            <div className="flex flex-col items-center text-center">
                                {selectedLogo && <img src={selectedLogo} alt="Logo" className="h-12 object-contain mb-2" />}
                                <h1 className="text-2xl font-black uppercase tracking-widest text-[#006437] leading-none">{companyDetails?.company_name}</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex border-b-2 border-black bg-gray-50 shrink-0">
                    <div className="w-1/2 border-r-2 border-black p-2">
                        <span className="font-black uppercase text-[9px]">Invoice No:</span>
                        <p className="font-black text-xs">#{invoice.id.toString().slice(-6).toUpperCase()} {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}</p>
                    </div>
                    <div className="w-1/2 p-2">
                        <span className="font-black uppercase text-[9px]">Date & Time:</span>
                        <p className="font-black text-xs">{formatDate(invoice.created_at)} | {formatTime(invoice.created_at)}</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-black shrink-0">
                    <div className="w-[65%] p-3 border-r-2 border-black">
                        <span className="font-black uppercase underline text-[9px] mb-1 block">Bill To:</span>
                        <h3 className="text-xs font-black uppercase">{invoice.customer_name}</h3>
                        <p className="font-bold text-[10px] mt-1 uppercase">{invoice.customer_address}<br/>PH: {invoice.customer_phone}</p>
                    </div>
                    <div className="w-[35%] p-3 flex flex-col justify-center">
                        <div className="mb-2">
                            <span className="text-[9px] font-black uppercase block">Franchise ID:</span>
                            <p className="text-xs font-black uppercase">{invoice.franchise_id}</p>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase block">Phone No:</span>
                            <p className="text-xs font-black uppercase">{companyDetails?.franchise_phone || "-"}</p>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="flex-1 border-b-2 border-black relative">
                    <table className="w-full text-left border-collapse table-fixed h-full">
                        <colgroup>
                            <col style={{ width: '7%' }} /><col style={{ width: '35%' }} /><col style={{ width: '13%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '15%' }} />
                        </colgroup>
                        <thead className="bg-gray-100 text-[10px] border-b-2 border-black h-8">
                            <tr>
                                <th className="p-2 border-r-2 border-black text-center">S.No</th>
                                <th className="p-2 border-r-2 border-black">Description</th>
                                <th className="p-2 border-r-2 border-black text-center">HSN</th>
                                <th className="p-2 border-r-2 border-black text-center">Qty</th>
                                <th className="p-2 border-r-2 border-black text-right">Rate</th>
                                <th className="p-2 border-r-2 border-black text-center">GST</th>
                                <th className="p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-[10px]">
                            {items.map((item, idx) => {
                                const gstRate = Number(item.stocks?.gst_rate) || 0;
                                const basePrice = Number(item.price) || 0;
                                const qty = Number(item.quantity) || 0;
                                const taxAmount = (basePrice * qty) * (gstRate / 100);
                                const lineTotal = (basePrice * qty) + taxAmount;
                                return (
                                <tr key={idx} className="border-b border-black last:border-b-0">
                                    <td className="p-2 border-r-2 border-black text-center align-top">{(pageIndex * ITEMS_PER_PAGE) + idx + 1}</td>
                                    <td className="p-2 border-r-2 border-black uppercase align-top">{item.item_name}</td>
                                    <td className="p-2 border-r-2 border-black text-center align-top">{item.stocks?.hsn_code || '-'}</td>
                                    <td className="p-2 border-r-2 border-black text-center align-top">{qty} {item.unit}</td>
                                    <td className="p-2 border-r-2 border-black text-right align-top">₹{basePrice.toFixed(2)}</td>
                                    <td className="p-2 border-r-2 border-black text-center align-top">{gstRate}%</td>
                                    <td className="p-2 text-right align-top">₹{lineTotal.toFixed(2)}</td>
                                </tr>
                                )
                            })}
                            {Array.from({ length: emptyRows }).map((_, i) => (
                                <tr key={i}><td className="border-r-2 border-black" colSpan="7"></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex shrink-0 h-[240px]">
                    <div className="w-[60%] border-r-2 border-black flex flex-col">
                        <div className="p-3 border-b-2 border-black">
                            <span className="text-[9px] font-black uppercase block mb-1">Amount in Words:</span>
                            <p className="italic font-black text-[10px]">{amountToWords(grandTotal)}</p>
                        </div>
                        <div className="p-3 border-b-2 border-black">
                            <p className="text-[9px] font-black uppercase underline mb-1">Bank Details:</p>
                            <div className="text-[9px] font-bold uppercase grid grid-cols-[40px_1fr] gap-x-2 gap-y-0.5">
                                <span>Bank:</span> <span>{companyDetails?.bank_name || "-"}</span>
                                <span>A/c No:</span> <span>{companyDetails?.bank_acc_no || "-"}</span>
                                <span>IFSC:</span> <span>{companyDetails?.bank_ifsc || "-"}</span>
                            </div>
                        </div>
                         <div className="p-3 flex-1">
                            <p className="text-[8px] font-black uppercase underline mb-1">Terms & Conditions:</p>
                            <div className="text-[7px] font-bold uppercase leading-tight whitespace-pre-wrap">
                                {companyDetails?.terms || "Goods once sold will not be taken back. Payment terms: 100% advance. Subject to Hyderabad Jurisdiction."}
                            </div>
                        </div>
                    </div>
                    <div className="w-[40%] flex flex-col">
                         <div className="flex-1 flex flex-col justify-start text-[9px] font-bold">
                            <div className="flex justify-between p-1.5 px-3 border-b border-black">
                                <span>Taxable Amount</span>
                                <span>₹{totalTaxableValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-1.5 px-3 border-b border-black">
                                <span>CGST</span>
                                <span>₹{totalCGST.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-1.5 px-3 border-b border-black">
                                <span>SGST</span>
                                <span>₹{totalSGST.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-1.5 px-3 border-b border-black">
                                <span>Round Off</span>
                                <span>{roundOff > 0 ? '+' : (roundOff < 0 ? '-' : '')} ₹{Math.abs(roundOff).toFixed(2)}</span>
                            </div>
                        </div>
                         <div className="flex justify-between p-3 border-t-2 border-black bg-gray-200 shrink-0">
                            <span className="font-black uppercase text-xs">Grand Total:</span>
                            <span className="font-black text-sm">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                         <div className="h-16 flex flex-col justify-end p-2 text-center shrink-0">
                            <p className="font-bold text-[8px] mb-6">For {companyDetails?.company_name || "TVANAMM"}</p>
                            <p className="font-black border-t border-black pt-1 uppercase text-[8px]">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- WRAPPER FOR PRINT ---
const PrintableInvoice = ({ invoice, items, companyDetails }) => {
    if (!invoice || !items) return null;
    const selectedLogo = (companyDetails?.company_name || "").toLowerCase().includes("jksh") ? jkshLogo : (companyDetails?.company_name || "").toLowerCase().includes("leaf") ? tLeafLogo : tvanammLogo;
    const itemChunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) itemChunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    const totalAmount = Number(invoice.total_amount) || 0;
    
    return (
        <div className="print-area">
            {itemChunks.map((chunk, index) => (
                <div key={index} className="break-after-page">
                    <InvoicePage 
                        invoice={invoice} 
                        items={chunk} 
                        companyDetails={companyDetails} 
                        pageIndex={index} 
                        totalPages={itemChunks.length} 
                        selectedLogo={selectedLogo} 
                        totalAmount={totalAmount}
                        allItemsForTaxCalc={items}
                    />
                </div>
            ))}
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
  const [companyDetails, setCompanyDetails] = useState(null);
  const [modalStats, setModalStats] = useState({ taxable: 0, tax: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("invoices").select(`*, profiles:created_by (company)`).order("created_at", { ascending: false });
    if (!error) setInvoices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { 
      fetchProfile();
      fetchData(); 
  }, [fetchData]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setCurrentFranchiseId(data.franchise_id);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customer_name?.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
      
      // Convert Invoice UTC Timestamp to IST Date String (YYYY-MM-DD)
      const invDateIST = parseDate(inv.created_at).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
      });

      let matchesDate = true;

      if (filterMode === "single" && singleDate) {
        matchesDate = invDateIST === singleDate;
      } 
      else if (filterMode === "range") {
        if (customStart && customEnd) {
          matchesDate = invDateIST >= customStart && invDateIST <= customEnd;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [invoices, search, singleDate, filterMode, customStart, customEnd]);

  const stats = useMemo(() => {
      const total = filteredInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
      return { total, count: filteredInvoices.length };
  }, [filteredInvoices]);

  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setInvoiceItems([]); 
    setCompanyDetails(null);
    setModalStats({ taxable: 0, tax: 0 });

    try {
        const { data: itemsData } = await supabase.from("invoice_items").select(`*, stocks(hsn_code, gst_rate)`).eq("invoice_id", invoice.id);
        setInvoiceItems(itemsData || []);

        // Calculate Modal Stats
        let aggTaxable = 0;
        let aggTax = 0;
        (itemsData || []).forEach(item => {
            const qty = Number(item.quantity) || 0;
            const basePrice = Number(item.price) || 0;
            const gstRate = Number(item.stocks?.gst_rate) || 0;
            const rowTaxable = basePrice * qty;
            const rowTax = rowTaxable * (gstRate / 100);
            aggTaxable += rowTaxable;
            aggTax += rowTax;
        });
        setModalStats({ taxable: aggTaxable, tax: aggTax });

        const { data: profileData } = await supabase.from('profiles').select('company, phone').eq('franchise_id', invoice.franchise_id).single();
        if (profileData) {
            const { data: companyData } = await supabase.from('companies').select('*').ilike('company_name', profileData.company).single();
            setCompanyDetails({ ...companyData, franchise_phone: profileData.phone });
        }
    } catch (err) { console.error(err); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="h-screen w-full bg-[#F8F9FA] text-black font-sans flex flex-col overflow-hidden">
      <style>{`
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } body { background: white; margin: 0; } @page { margin: 0; size: A4; } .break-after-page { page-break-after: always; height: 100vh; } .break-after-page:last-child { page-break-after: auto; } }
        .print-only { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <div className="print-only"><PrintableInvoice invoice={selectedInvoice} items={invoiceItems} companyDetails={companyDetails} /></div>

      <nav className="shrink-0 bg-white/95 border-b px-4 md:px-8 py-3 flex items-center justify-between no-print">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-[10px]"><ArrowLeft size={16} /> Back</button>
          <h1 className="text-lg md:text-xl font-black uppercase tracking-widest">Invoices</h1>
          <span className="text-[10px] font-black bg-slate-100 px-3 py-1.5 rounded-lg">{currentFranchiseId}</span>
      </nav>

      <main className="flex-1 flex flex-col min-h-0 px-4 md:px-8 py-4 gap-4 no-print overflow-hidden">
        <div className="shrink-0 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* REVENUE BOX */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Revenue</p><h2 className="text-xl font-black">₹{stats.total.toLocaleString()}</h2></div>
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={20}/></div>
                </div>

                {/* DATE FILTER BLOCK */}
                <div className="bg-white p-3 rounded-3xl border border-slate-200 flex flex-col justify-center gap-2 px-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button 
                            onClick={() => { setFilterMode("single"); setSingleDate(new Date().toISOString().split('T')[0]); }} 
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "single" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Single Day
                        </button>
                        <button 
                            onClick={() => { setFilterMode("range"); }} 
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "range" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            Date Range
                        </button>
                    </div>

                    <div className="flex items-center gap-2 h-8">
                        {filterMode === "single" ? (
                            <div className="w-full flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100">
                                <Calendar size={14} className="text-slate-400 mr-2"/>
                                <input 
                                    type="date" 
                                    className="w-full bg-transparent text-xs font-black uppercase outline-none text-slate-700 h-8" 
                                    value={singleDate} 
                                    onChange={(e) => setSingleDate(e.target.value)} 
                                />
                            </div>
                        ) : (
                            <div className="w-full flex items-center gap-1">
                                <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100">
                                    <input 
                                        type="date" 
                                        placeholder="Start"
                                        className="w-full bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 h-8" 
                                        value={customStart} 
                                        onChange={(e) => setCustomStart(e.target.value)} 
                                    />
                                </div>
                                <span className="text-slate-300 font-bold">-</span>
                                <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100">
                                    <input 
                                        type="date" 
                                        placeholder="End"
                                        className="w-full bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 h-8" 
                                        value={customEnd} 
                                        onChange={(e) => setCustomEnd(e.target.value)} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* COUNT BOX */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Count</p><h2 className="text-xl font-black">{stats.count}</h2></div>
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ReceiptText size={20}/></div>
                </div>
            </div>
            
            <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="SEARCH CUSTOMER..." className="w-full pl-12 h-12 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold uppercase" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>

        <div className="flex-1 bg-white rounded-[2rem] border overflow-hidden flex flex-col min-h-0">
            <div className="hidden md:grid grid-cols-7 gap-4 p-5 border-b bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <span>S.No</span><span>Ref ID</span><span className="col-span-2">Customer</span><span>Date</span><span>Time</span><span className="text-right">Amount</span>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y custom-scrollbar">
                {filteredInvoices.map((inv, index) => (
                    <div key={inv.id} onClick={() => openInvoiceDetails(inv)} className="p-4 md:p-5 flex flex-col md:grid md:grid-cols-7 hover:bg-slate-50 cursor-pointer gap-3 md:items-center">
                        <div className="flex md:hidden justify-between items-start">
                            <div><span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">#{inv.id.slice(0,8).toUpperCase()}</span><p className="font-black uppercase text-sm mt-1">{inv.customer_name}</p></div>
                            <div className="text-right"><p className="font-black text-sm">₹{Number(inv.total_amount).toLocaleString()}</p><div className="flex items-center gap-1 text-slate-400 mt-1"><Clock size={10}/><span className="text-[10px] font-bold">{formatTime(inv.created_at)}</span></div></div>
                        </div>

                        <span className="hidden md:block text-xs font-bold text-slate-400">{index + 1}</span>
                        <span className="hidden md:block text-[10px] font-bold text-slate-400 truncate">#{inv.id.slice(0,8)}</span>
                        <span className="hidden md:block md:col-span-2 font-black uppercase text-xs truncate">{inv.customer_name}</span>
                        <span className="hidden md:block text-xs font-bold text-slate-600">{formatDate(inv.created_at)}</span>
                        <span className="hidden md:block text-xs font-bold text-slate-600">{formatTime(inv.created_at)}</span>
                        <div className="hidden md:flex items-center justify-end gap-3"><span className="font-black text-sm">₹{Number(inv.total_amount).toLocaleString()}</span><ChevronRight size={16} className="text-slate-300"/></div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* DETAIL MODAL (SCROLL FIX APPLIED) */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center no-print">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header - Fixed */}
                <div className="p-6 border-b flex justify-between items-center shrink-0">
                    <div><h2 className="text-lg font-black uppercase">Details</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Ref: {selectedInvoice.id}</p></div>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button>
                </div>

                {/* Body - Flex Column: Top static, Bottom scrolls */}
                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Fixed Date Info */}
                    <div className="p-6 pb-4 shrink-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Date</span>
                                <p className="text-xs font-black">{formatDate(selectedInvoice.created_at)}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Time</span>
                                <p className="text-xs font-black">{formatTime(selectedInvoice.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Items */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                        <div className="space-y-3">
                            {invoiceItems.map((item, i) => {
                                const gstRate = Number(item.stocks?.gst_rate) || 0;
                                const basePrice = Number(item.price) || 0; 
                                const quantity = Number(item.quantity) || 0;
                                const totalTaxable = basePrice * quantity;
                                const totalTax = totalTaxable * (gstRate / 100);
                                const lineTotal = totalTaxable + totalTax;
                                const cgst = totalTax / 2;
                                const sgst = totalTax / 2;

                                return (
                                    <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-black uppercase w-[70%]">{item.item_name}</p>
                                            <p className="font-black text-sm">₹{lineTotal.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase">{quantity} {item.unit}</span>
                                            <span className="text-[10px] font-bold text-slate-400">x</span>
                                            <span className="text-[10px] font-bold text-slate-500">₹{basePrice.toFixed(2)} (Base)</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center border border-slate-100">
                                            <div>
                                                <span className="block text-[8px] font-black text-slate-400 uppercase">Taxable</span>
                                                <span className="block text-[10px] font-bold text-slate-700">₹{totalTaxable.toFixed(2)}</span>
                                            </div>
                                            <div className="border-l border-slate-200">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase">CGST ({(gstRate/2)}%)</span>
                                                <span className="block text-[10px] font-bold text-slate-700">₹{cgst.toFixed(2)}</span>
                                            </div>
                                            <div className="border-l border-slate-200">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase">SGST ({(gstRate/2)}%)</span>
                                                <span className="block text-[10px] font-bold text-slate-700">₹{sgst.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 border-t bg-slate-50 shrink-0">
                    <div className="mb-4 text-[10px] font-bold text-slate-500 flex justify-between px-2">
                        <span>Total Taxable: ₹{modalStats.taxable.toFixed(2)}</span>
                        <span>Total Tax: ₹{modalStats.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6 px-2"><span className="text-xs font-black uppercase">Grand Total</span><span className="text-2xl font-black">₹{selectedInvoice.total_amount}</span></div>
                    <button onClick={handlePrint} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95"><Printer size={16}/> Print Invoice</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;