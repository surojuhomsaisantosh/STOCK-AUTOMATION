import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiPrinter, FiSearch, FiCalendar, FiX, FiFileText } from "react-icons/fi";

// --- ASSET IMPORTS ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

// --- THEME CONSTANTS ---
const THEME_COLOR = "rgb(0, 100, 55)"; // Deep Green

// --- UTILITY: Safe Session Storage ---
const getSessionItem = (key) => {
    try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) { return null; }
};

const setSessionItem = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
};

// --- HELPER FUNCTION ---
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

function InvoicesBilling() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [invoices, setInvoices] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState("Loading...");

    const [filterType, setFilterType] = useState("date");
    const [singleDate, setSingleDate] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- Body Scroll Lock ---
    useEffect(() => {
        if (selectedInvoice) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedInvoice]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchFranchiseProfile();
            fetchInvoiceData();
            fetchCompanies();
        }
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [user, authLoading]);

    const fetchFranchiseProfile = async () => {
        try {
            if (!user?.id) return;
            const { data, error } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).single();
            if (data) setSelectedFranchiseId(data.franchise_id || "N/A");
        } catch (err) { console.error(err); }
    };

    const fetchInvoiceData = async () => {
        setLoading(true);
        try {
            const { data: invData, error: invError } = await supabase
                .from("invoices")
                .select(`*, invoice_items (*, stocks ( hsn_code ))`)
                .eq("status", "dispatched")
                .order("created_at", { ascending: false });
            if (invError) throw invError;
            setInvoices(invData || []);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const fetchCompanies = async () => {
        const cached = getSessionItem('cached_companies');
        if (cached) { setCompanies(cached); return; }
        try {
            const { data, error } = await supabase.from("companies").select("*");
            if (data) { setCompanies(data); setSessionItem('cached_companies', data); }
        } catch (err) { console.error(err); }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (inv.customer_name?.toLowerCase().includes(searchLower)) || (inv.franchise_id?.toLowerCase().includes(searchLower));
            const orderDate = new Date(inv.created_at).toLocaleDateString('sv-SE');
            let matchesDate = true;
            if (filterType === "date" && singleDate) matchesDate = orderDate === singleDate;
            else if (filterType === "range" && startDate && endDate) matchesDate = orderDate >= startDate && orderDate <= endDate;
            return matchesSearch && matchesDate;
        });
    }, [invoices, searchQuery, filterType, singleDate, startDate, endDate]);

    const getCompanyDetails = (franchiseId) => companies.find(c => c.franchise_id === franchiseId) || companies[0] || {};
    const getCompanyLogo = (companyName) => {
        if (!companyName) return null;
        const name = companyName.toLowerCase();
        if (name.includes("vanamm")) return tvanammLogo;
        if (name.includes("leaf")) return tleafLogo;
        if (name.includes("jksh")) return jkshLogo;
        return null;
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 print:bg-white print:pb-0 overflow-x-hidden">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: white; }
                    .print-invoice-container { display: block !important; width: 100%; }
                    .print-invoice-container * { visibility: visible; }
                    .invoice-page { page-break-after: always; height: 297mm; width: 210mm; position: relative; overflow: hidden; margin: 0 auto; box-sizing: border-box; background: white; color: black; }
                    .invoice-page:last-child { page-break-after: auto; }
                    nav, .filters-container, .main-ui, .preview-modal { display: none !important; }
                }
                .print-invoice-container { display: none; }
            `}</style>

            <div className="main-ui">
                {/* --- NAVIGATION BAR --- */}
                <nav className="border-b border-slate-200 bg-white sticky top-0 z-50 h-16 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between relative">
                        <div className="z-20 flex items-center">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black hover:opacity-60 transition-all">
                                <FiArrowLeft size={18} /> <span>Back</span>
                            </button>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black">Invoices</h1>
                        </div>
                        <div className="z-20">
                            <div className="text-[10px] md:text-xs font-black bg-slate-100 px-3 py-2 rounded-md border border-slate-200 text-slate-700 whitespace-nowrap shadow-sm">
                                <span className="text-slate-400 mr-1">ID:</span>{selectedFranchiseId}
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
                    {/* --- FILTERS --- */}
                    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl mb-6 flex flex-col gap-6 filters-container">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="relative flex-1 group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" placeholder="Search Client, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-bold shadow-inner" onFocus={(e) => e.target.style.borderColor = THEME_COLOR} onBlur={(e) => e.target.style.borderColor = 'transparent'} />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-center shadow-md md:w-48 shrink-0">
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-black uppercase text-gray-400">Date Today</span>
                                    <div className="text-sm font-black text-black">{currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center pt-4 border-t border-gray-100">
                            <div className="bg-gray-100 p-1 rounded-xl flex w-full md:w-auto">
                                <button onClick={() => { setFilterType("date"); setStartDate(""); setEndDate(""); }} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === "date" ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Exact Date</button>
                                <button onClick={() => { setFilterType("range"); setSingleDate(""); }} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === "range" ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Date Range</button>
                            </div>
                            <div className="w-full md:w-auto flex-grow flex items-center">
                                {filterType === "date" ? (
                                    <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full md:w-48 px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-xs font-bold" />
                                ) : (
                                    <div className="flex items-center gap-2 w-full bg-white border-2 border-gray-100 rounded-xl p-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold outline-none" />
                                        <span className="text-gray-300 font-bold">-</span>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold outline-none" />
                                    </div>
                                )}
                                {(singleDate || (startDate && endDate)) && (<button onClick={() => { setSingleDate(''); setStartDate(''); setEndDate(''); }} className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg"><FiX /></button>)}
                            </div>
                        </div>
                    </div>

                    {/* --- MOBILE CARD VIEW --- */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                        {filteredInvoices.map((inv) => (
                            <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 active:scale-[0.98] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 rounded-md text-white font-black text-[9px] uppercase tracking-wider" style={{ backgroundColor: THEME_COLOR }}>{inv.franchise_id}</span>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                                </div>
                                <h4 className="text-sm font-black text-gray-800 uppercase line-clamp-1">{inv.customer_name}</h4>
                                <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{inv.customer_address || "N/A"}</p>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Grand Total</span>
                                    <span className="text-base font-black text-black">₹{Number(inv.total_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- DESKTOP TABLE VIEW --- */}
                    <div className="hidden lg:block bg-white border border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-black tracking-wider text-black">
                                <tr><th className="px-8 py-6">S.No</th><th className="px-8 py-6">Franchise ID</th><th className="px-8 py-6 w-1/3 text-center">Address</th><th className="px-8 py-6 text-right">Amount</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-xs">
                                {loading ? (<tr><td colSpan="4" className="py-32 text-center text-gray-400 uppercase tracking-widest animate-pulse">Fetching Invoices...</td></tr>) : filteredInvoices.map((inv, idx) => (
                                    <tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="group cursor-pointer hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-6 opacity-60">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-8 py-6"><span className="px-3 py-1.5 rounded-lg text-white font-black tracking-wide text-[10px]" style={{ backgroundColor: THEME_COLOR }}>{inv.franchise_id}</span></td>
                                        <td className="px-8 py-6 text-gray-500 text-center max-w-xs truncate">{inv.customer_address || "N/A"}</td>
                                        <td className="px-8 py-6 text-right text-black font-black">₹{Number(inv.total_amount).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- PREVIEW MODAL --- */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm preview-modal">
                    <div className="absolute inset-0" onClick={() => setSelectedInvoice(null)} />
                    <div className="bg-white w-full max-w-5xl h-[95vh] sm:h-[80vh] overflow-hidden rounded-t-[2rem] sm:rounded-3xl shadow-2xl relative z-10 flex flex-col transition-all">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
                            <div><h2 className="text-lg font-black uppercase tracking-widest text-black">Invoice Preview</h2><div className="text-[10px] text-gray-400 font-bold mt-0.5">REF: #{selectedInvoice.id.substring(0, 12)}</div></div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-3 bg-gray-50 rounded-xl text-black hover:bg-red-50 hover:text-red-500 transition-all"><FiX size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-[#F8F9FA]">
                            {(() => {
                                const inv = selectedInvoice;
                                const items = inv.invoice_items || [];
                                const taxableAmount = Number(inv.subtotal) || 0;
                                const totalTaxAmount = Number(inv.tax_amount) || 0;
                                const roundOff = Number(inv.round_off) || 0;
                                const gstPercent = items[0]?.gst_rate || 18;

                                return (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                                        {/* Item Details with Scrollbar */}
                                        <div className="lg:col-span-2 bg-white rounded-3xl p-5 shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2 shrink-0"><FiFileText size={14} /> Ordered Items ({items.length})</h4>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 overscroll-contain">
                                                <div className="space-y-3 pb-2">
                                                    {items.map((item, i) => (
                                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100 gap-2">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-7 h-7 shrink-0 rounded bg-white border border-gray-200 flex items-center justify-center font-black text-gray-400 text-[10px]">{i + 1}</div>
                                                                <div><h5 className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase tracking-tight line-clamp-1">{item.item_name}</h5><div className="text-[9px] font-bold text-gray-400 uppercase">Rate: ₹{Number(item.price).toFixed(2)}</div></div>
                                                            </div>
                                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                                                                <span className="text-[9px] font-black text-gray-500 bg-white px-2 py-1 rounded border">x {item.quantity} {item.unit}</span>
                                                                <span className="font-black text-xs text-gray-900 text-right min-w-[60px]">₹{Number(item.total).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary (Fixed) */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            <div className="bg-white rounded-[1.5rem] p-5 shadow-xl border border-slate-100 shrink-0">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Payment Summary</h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>Taxable Amount</span><span className="text-gray-800 font-black">₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>CGST ({gstPercent/2}%)</span><span className="text-gray-600">+ ₹{(totalTaxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>SGST ({gstPercent/2}%)</span><span className="text-gray-600">+ ₹{(totalTaxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>Round Off</span><span className={roundOff < 0 ? 'text-red-500' : 'text-gray-600'}>{roundOff >= 0 ? '+' : ''} ₹{roundOff.toFixed(2)}</span></div>
                                                    <div className="my-2 border-t border-dashed border-gray-100"></div>
                                                    <div className="flex justify-between items-end pt-1"><span className="text-[10px] font-black uppercase text-gray-900">Grand Total</span><span className="text-2xl font-black leading-none" style={{ color: THEME_COLOR }}>₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                </div>
                                            </div>
                                            <button onClick={() => window.print()} className="w-full py-4 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95" style={{ backgroundColor: THEME_COLOR }}><FiPrinter size={16} /> Print Invoice</button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* --- ACTUAL PRINT CONTAINER (ROOT LEVEL) --- */}
            <div className="print-invoice-container">
                {selectedInvoice && (() => {
                    const inv = selectedInvoice;
                    const fullItems = inv.invoice_items || [];
                    const companyDetails = getCompanyDetails(inv.franchise_id);
                    const selectedLogo = getCompanyLogo(companyDetails.company_name);
                    const taxableAmount = Number(inv.subtotal) || 0;
                    const totalTaxAmount = Number(inv.tax_amount) || 0;
                    const roundOff = Number(inv.round_off) || 0;
                    const gstPercent = fullItems[0]?.gst_rate || 18;

                    const itemsPerPage = 10;
                    const pages = [];
                    for (let i = 0; i < fullItems.length; i += itemsPerPage) pages.push(fullItems.slice(i, i + itemsPerPage));
                    if (pages.length === 0) pages.push([]);

                    return pages.map((pageItems, pageIdx) => {
                        const isLastPage = pageIdx === pages.length - 1;
                        return (
                            <div key={pageIdx} className="invoice-page bg-white p-10 text-black font-bold">
                                <div className="border-2 border-black h-full flex flex-col relative">
                                    <div className="text-center py-2 border-b-2 border-black"><h1 className="text-xl font-bold underline uppercase tracking-wider">Tax Invoice</h1></div>
                                    <div className="flex border-b-2 border-black h-28">
                                        <div className="w-1/2 p-3 flex flex-col justify-center text-left">
                                            <p className="font-bold text-[10px] underline uppercase mb-0.5">Registered Office:</p>
                                            <p className="text-[10px] font-bold uppercase leading-tight">{companyDetails.company_address}</p>
                                            <div className="mt-2 text-[10px] font-bold">
                                                <p>GSTIN: {companyDetails.company_gst}</p>
                                                <p>Email: {companyDetails.company_email}</p>
                                            </div>
                                        </div>
                                        <div className="w-1/2 p-3 flex flex-col items-end justify-center text-right">
                                            <div className="flex flex-col items-center">
                                                <div className="mb-1">{selectedLogo && <img src={selectedLogo} alt="Logo" className="h-14 w-auto object-contain" />}</div>
                                                <h2 className="text-lg font-black uppercase leading-none">{companyDetails.company_name}</h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex border-b-2 border-black text-[10px]">
                                        <div className="w-1/2 border-r-2 border-black p-2 flex justify-between"><span>Invoice No:</span><span className="font-bold uppercase">{inv.id.substring(0, 8)}</span></div>
                                        <div className="w-1/2 p-2 flex justify-between"><span>Invoice Date:</span><span className="font-bold">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span></div>
                                    </div>
                                    <div className="flex border-b-2 border-black text-[10px]">
                                        <div className="w-1/2 border-r-2 border-black p-3 text-left">
                                            <p className="font-bold underline uppercase mb-0.5">Bill To:</p>
                                            <p className="font-bold uppercase text-[12px]">{inv.customer_name}</p>
                                            <p className="uppercase leading-tight">{inv.customer_address}</p>
                                        </div>
                                        <div className="w-1/2 p-3 flex flex-col justify-center gap-2 text-[10px]">
                                            <div className="flex justify-between"><span>Franchise ID:</span><span className="font-bold">{inv.franchise_id}</span></div>
                                            <div className="flex justify-between"><span>Phone:</span><span className="font-bold">{inv.customer_phone || "N/A"}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex-grow flex flex-col relative">
                                        <div className="flex bg-white text-center border-b-2 border-black font-bold uppercase text-[10px] py-1.5">
                                            <div className="border-r border-black w-10">S.No</div><div className="border-r border-black flex-1 text-left px-2">Description</div><div className="border-r border-black w-20">HSN</div><div className="border-r border-black w-14">Qty</div><div className="border-r border-black w-24">Rate</div><div className="border-r border-black w-14">GST</div><div className="w-24 px-2 text-right">Amount</div>
                                        </div>
                                        {pageItems.map((item, i) => (
                                            <div key={i} className="flex border-b border-black text-center items-stretch text-[9px] min-h-[12mm] py-1">
                                                <div className="border-r border-black w-10 flex items-center justify-center font-bold">{(pageIdx * itemsPerPage) + i + 1}</div>
                                                <div className="border-r border-black flex-1 text-left px-2 font-bold uppercase flex items-center">{item.item_name}</div>
                                                <div className="border-r border-black w-20 flex items-center justify-center font-bold">{item.stocks?.hsn_code || "-"}</div>
                                                <div className="border-r border-black w-14 flex items-center justify-center font-bold">{item.quantity} {item.unit}</div>
                                                <div className="border-r border-black w-24 text-right px-2 flex items-center justify-end font-bold">{Number(item.price).toFixed(2)}</div>
                                                <div className="border-r border-black w-14 flex items-center justify-center font-bold">{item.gst_rate}%</div>
                                                <div className="w-24 text-right px-2 font-bold flex items-center justify-end">{Number(item.total).toFixed(2)}</div>
                                            </div>
                                        ))}
                                        {pageItems.length < itemsPerPage && Array.from({length: itemsPerPage - pageItems.length}).map((_, idx) => (
                                            <div key={`f-${idx}`} className="flex border-b border-black flex-grow min-h-[12mm]">
                                                <div className="border-r border-black w-10"></div><div className="border-r border-black flex-1"></div><div className="border-r border-black w-20"></div><div className="border-r border-black w-14"></div><div className="border-r border-black w-24"></div><div className="border-r border-black w-14"></div><div className="w-24"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex border-t-2 border-black mt-auto">
                                        <div className="w-1/2 border-r-2 border-black flex flex-col text-left">
                                            <div className="p-2 border-b border-black"><p className="font-bold underline text-[9px] uppercase">Amount in Words:</p><p className="text-[9px] font-bold uppercase">{isLastPage ? numberToWords(Math.round(inv.total_amount)) : "Continued..."}</p></div>
                                            
                                            <div className="p-2 border-b border-black">
                                                <p className="font-bold underline text-[9px] uppercase mb-1">Bank Details:</p>
                                                <ul className="list-disc pl-4 text-[8px] font-bold uppercase space-y-0.5">
                                                    <li>Bank: {companyDetails.bank_name || "N/A"}</li>
                                                    <li>A/C No: {companyDetails.bank_acc_no || "N/A"}</li>
                                                    <li>IFSC: {companyDetails.bank_ifsc || "N/A"}</li>
                                                </ul>
                                            </div>

                                            <div className="p-2 flex-1 overflow-hidden text-[8px] font-bold leading-tight uppercase">
                                                <p className="font-bold underline mb-1">Terms & Conditions:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    {companyDetails.terms 
                                                        ? companyDetails.terms.split('\n').map((term, i) => 
                                                            term.trim() ? <li key={i}>{term}</li> : null
                                                          )
                                                        : <li>Standard terms and conditions apply.</li>
                                                    }
                                                </ul>
                                            </div>

                                        </div>
                                        <div className="w-1/2 flex flex-col text-[10px] font-bold">
                                            {isLastPage ? (
                                                <>
                                                    <div className="flex justify-between px-3 py-1 border-b border-black"><span>Taxable Amount</span><span className="font-bold">₹{taxableAmount.toFixed(2)}</span></div>
                                                    <div className="flex justify-between px-3 py-1 border-b border-black"><span>CGST ({gstPercent/2}%)</span><span>₹{(totalTaxAmount/2).toFixed(2)}</span></div>
                                                    <div className="flex justify-between px-3 py-1 border-b border-black"><span>SGST ({gstPercent/2}%)</span><span>₹{(totalTaxAmount/2).toFixed(2)}</span></div>
                                                    <div className="flex justify-between px-3 py-1 border-b border-black"><span>Round Off</span><span>{roundOff.toFixed(2)}</span></div>
                                                    <div className="flex justify-between px-3 py-2 border-b-2 border-black font-bold text-sm"><span>TOTAL</span><span>₹{Number(inv.total_amount).toFixed(2)}</span></div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-black font-bold">Continued on next page...</div>
                                            )}
                                            <div className="flex-grow flex flex-col justify-center items-center py-4"><p className="font-bold uppercase text-[9px]">For {companyDetails.company_name}</p><div className="h-8"></div><p className="text-[8px] font-bold">(Authorized Signatory)</p></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-1 right-2 text-[8px] font-bold">Page {pageIdx+1} of {pages.length}</div>
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
}

export default InvoicesBilling;