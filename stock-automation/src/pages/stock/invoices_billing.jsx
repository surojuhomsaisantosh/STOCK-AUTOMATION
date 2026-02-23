import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiPrinter, FiSearch, FiCalendar, FiX, FiFileText } from "react-icons/fi";

// --- THEME CONSTANTS ---
const THEME_COLOR = "rgb(0, 100, 55)"; // Deep Green
const ITEMS_PER_INVOICE_PAGE = 15;

// --- UTILITY: Safe Session Storage ---
const getSessionItem = (key) => {
    try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) { return null; }
};

const setSessionItem = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

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


// --- INVOICE PRINT COMPONENT ---
const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk }) => {
    if (!order) return null;
    const companyName = companyDetails?.company_name || "";

    // DYNAMIC LOGO FROM BUCKET URL
    const currentLogo = companyDetails?.logo_url || null;

    const invDate = new Date(order.created_at).toLocaleDateString('en-GB');
    const taxableAmount = Number(order.subtotal) || 0;
    const totalGst = Number(order.tax_amount) || 0;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const roundedBill = Number(order.total_amount) || 0;
    const roundOff = Number(order.round_off) || 0;
    const orderId = order.id ? order.id.substring(0, 8) : 'PENDING';

    const emptyRowsCount = Math.max(0, ITEMS_PER_INVOICE_PAGE - itemsChunk.length);

    return (
        <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
            <div className="w-full border-2 border-black flex flex-col relative flex-1">
                <div className="p-3 border-b-2 border-black relative">
                    <div className="absolute top-2 left-0 w-full text-center pointer-events-none">
                        <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4 text-black">TAX INVOICE</h1>
                    </div>
                    <div className="flex justify-between items-center mt-5 pt-3">
                        <div className="text-left z-10 w-[55%]">
                            <div className="font-bold leading-relaxed text-[10px]">
                                <span className="uppercase underline mb-1 block text-black font-black">Registered Office:</span>
                                <p className="whitespace-pre-wrap break-words text-black leading-tight">{companyDetails?.company_address || ""}</p>
                                <div className="mt-1 space-y-0.5">
                                    {companyDetails?.company_gst && <p className="text-black">GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
                                    {companyDetails?.company_email && <p className="text-black">Email: {companyDetails.company_email}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="z-10 flex flex-col items-center text-center max-w-[40%]">
                            {currentLogo ? (
                                <img
                                    src={currentLogo}
                                    alt="Logo"
                                    crossOrigin="anonymous"
                                    className="h-12 w-auto object-contain mb-1"
                                />
                            ) : (
                                <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black mb-1">NO LOGO</div>
                            )}
                            <h2 className="text-base font-black uppercase text-black break-words text-center leading-tight">{companyName}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent text-black">
                    <div className="w-1/2 border-r-2 border-black py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Invoice No:</span>
                        <p className="font-black text-sm text-black">#{orderId}</p>
                    </div>
                    <div className="w-1/2 py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Invoice Date:</span>
                        <p className="font-black text-sm text-black">{invDate}</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-black text-black">
                    <div className="w-[70%] p-2 border-r-2 border-black">
                        <span className="font-black uppercase underline text-[10px] tracking-widest text-black mb-1 block">Bill To:</span>
                        <h3 className="text-sm font-black uppercase leading-tight text-black">{order?.customer_name || ""}</h3>
                        <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">
                            {order?.customer_address || ""}
                        </p>
                    </div>
                    <div className="w-[30%] p-2 flex flex-col justify-center pl-4 text-black">
                        <div className="mb-1.5"><span className="text-[10px] font-bold block mb-0.5">ID: </span><span className="text-sm font-black block text-black leading-none">{order?.franchise_id || ""}</span></div>
                        {order?.customer_phone && (<div><span className="text-[10px] font-bold block mb-0.5">Ph: </span><span className="text-sm font-black block text-black leading-none">{order.customer_phone}</span></div>)}
                    </div>
                </div>

                <div className="flex-1 border-b-2 border-black relative">
                    <table className="w-full text-left border-collapse text-black">
                        <thead className="bg-slate-100 text-[10px] border-b-2 border-black text-black">
                            <tr>
                                <th className="py-1 px-2 border-r-2 border-black w-10 text-center">S.No</th>
                                <th className="py-1 px-2 border-r-2 border-black">Item Description</th>
                                <th className="py-1 px-2 border-r-2 border-black w-14 text-center">Qty</th>
                                <th className="py-1 px-2 border-r-2 border-black w-20 text-right">Rate</th>
                                <th className="py-1 px-2 border-r-2 border-black w-12 text-center">GST%</th>
                                <th className="py-1 px-2 border-r-2 border-black w-16 text-right">GST Amt</th>
                                <th className="py-1 px-2 w-24 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold text-black">
                            {itemsChunk.map((item, idx) => {
                                const rate = Number(item.price) || 0;
                                const qty = Number(item.quantity) || 0;
                                const subtotal = rate * qty;
                                const gstRate = Number(item.gst_rate) || 0;
                                const gstAmt = subtotal * (gstRate / 100);
                                const finalAmount = Number(item.total) || (subtotal + gstAmt);
                                const hsnText = item.stocks?.hsn_code || item.hsn_code ? ` (HSN: ${item.stocks?.hsn_code || item.hsn_code})` : '';

                                return (
                                    <tr key={idx} className="h-[26px] overflow-hidden">
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[150px] text-black overflow-hidden whitespace-nowrap">
                                            {item.item_name}{hsnText}
                                        </td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{qty} {item.unit}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(rate)}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{gstRate}%</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(gstAmt)}</td>
                                        <td className="py-0.5 px-2 border-b border-black text-right text-black">{formatCurrency(finalAmount)}</td>
                                    </tr>
                                );
                            })}

                            {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                                <tr key={`empty-${idx}`} className="h-[26px]">
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-transparent">-</td>
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                                    <td className="py-0.5 px-2 border-b border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-auto text-black">
                    <div className="w-[60%] border-r-2 border-black flex flex-col">
                        <div className="py-1.5 px-2 border-b-2 border-black min-h-[30px] flex flex-col justify-center bg-slate-50">
                            <span className="font-bold text-[9px] text-black uppercase">Total Amount in Words:</span>
                            <p className="font-black italic capitalize text-[10px] mt-0.5 text-black leading-tight">{amountToWords(roundedBill)}</p>
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                            <div>
                                <p className="font-black uppercase underline text-[11px] mb-1.5 text-black">Bank Details</p>
                                <div className="grid grid-cols-[50px_1fr] gap-y-0.5 text-[10px] font-bold uppercase text-black leading-tight">
                                    <span>Bank:</span> <span className="text-black">{companyDetails?.bank_name || ""}</span>
                                    <span>A/c No:</span> <span className="text-black">{companyDetails?.bank_acc_no || ""}</span>
                                    <span>IFSC:</span> <span className="text-black">{companyDetails?.bank_ifsc || ""}</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-300">
                                <p className="font-black uppercase underline text-[10px] mb-1 text-black">Terms & Conditions:</p>
                                <p className="text-[8px] text-black whitespace-pre-wrap leading-tight">{companyDetails?.terms || "No terms available."}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-[40%] flex flex-col text-[10px] text-black">
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-slate-300 text-black text-[9px] bg-slate-50 pl-4"><span>CGST</span><span>{formatCurrency(cgst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-black text-black text-[9px] bg-slate-50 pl-4"><span>SGST</span><span>{formatCurrency(sgst)}</span></div>

                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                        <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200 text-black"><span className="font-black uppercase text-black">Total</span><span className="font-black text-black">{formatCurrency(roundedBill)}</span></div>
                        <div className="flex-1 flex flex-col justify-end p-2 text-center">
                            {pageIndex < totalPages - 1 && <p className="text-[8px] mb-1 font-bold italic text-slate-500">Continued on next page...</p>}
                            <p className="font-black border-t border-black pt-1 uppercase text-[8px] text-black">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-1 right-2 print:bottom-1.5 print:right-2 text-[9px] font-black text-black">
                Page {pageIndex + 1} of {totalPages}
            </div>
        </div>
    );
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

    useEffect(() => {
        if (selectedInvoice) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
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
            const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).single();
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
        if (cached && cached.length > 0) {
            setCompanies(cached);
            return;
        }
        try {
            const { data } = await supabase.from("companies").select("*");
            if (data && data.length > 0) {
                setCompanies(data);
                setSessionItem('cached_companies', data);
            }
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

    const getCompanyDetails = (franchiseId) => {
        if (!franchiseId || !companies.length) return companies[0] || {};
        return companies.find(c => c.franchise_id?.toUpperCase() === franchiseId.toUpperCase()) || companies[0] || {};
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 overflow-x-hidden print:bg-white print:pb-0">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                
                @media print {
                  body { background: white; margin: 0; padding: 0; }
                  .print-only { display: block !important; width: 100%; }
                  @page { size: A4; margin: 0; }
                  .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; }
                  .a4-page:last-child { page-break-after: auto; }
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .main-ui, .preview-modal { display: none !important; }
                }
            `}</style>

            {/* --- ACTUAL PRINT CONTAINER --- */}
            <div className="print-only hidden print:block bg-white">
                {selectedInvoice && (() => {
                    const companyDetails = getCompanyDetails(selectedInvoice.franchise_id);
                    const fullItems = selectedInvoice.invoice_items || [];
                    const pages = [];

                    if (fullItems.length === 0) pages.push([]);
                    else {
                        for (let i = 0; i < fullItems.length; i += ITEMS_PER_INVOICE_PAGE) {
                            pages.push(fullItems.slice(i, i + ITEMS_PER_INVOICE_PAGE));
                        }
                    }

                    return pages.map((chunk, index) => (
                        <FullPageInvoice
                            key={index}
                            order={selectedInvoice}
                            companyDetails={companyDetails}
                            pageIndex={index}
                            totalPages={pages.length}
                            itemsChunk={chunk}
                        />
                    ));
                })()}
            </div>

            <div className="main-ui print:hidden">
                <nav className="border-b border-slate-200 bg-white sticky top-0 z-50 h-16 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between relative">
                        <button onClick={() => navigate(-1)} className="z-20 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black hover:opacity-60 transition-all">
                            <FiArrowLeft size={18} /> <span>Back</span>
                        </button>
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
                    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl mb-6 flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="relative flex-1 group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" placeholder="Search Client, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-bold shadow-inner" style={{ focus: { borderColor: THEME_COLOR } }} />
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
                            </div>
                        </div>
                    </div>

                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                        {filteredInvoices.map((inv) => (
                            <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 rounded-md text-white font-black text-[9px] uppercase tracking-wider" style={{ backgroundColor: THEME_COLOR }}>{inv.franchise_id}</span>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                                </div>
                                <h4 className="text-sm font-black text-gray-800 uppercase line-clamp-1">{inv.customer_name}</h4>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Grand Total</span>
                                    <span className="text-base font-black text-black">₹{Number(inv.total_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

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

            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm preview-modal print:hidden">
                    <div className="absolute inset-0" onClick={() => setSelectedInvoice(null)} />
                    <div className="bg-white w-full max-w-5xl h-[95vh] sm:h-[80vh] overflow-hidden rounded-t-[2rem] sm:rounded-3xl shadow-2xl relative z-10 flex flex-col transition-all">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
                            <div><h2 className="text-lg font-black uppercase tracking-widest text-black">Invoice Preview</h2><div className="text-[10px] text-gray-400 font-bold mt-0.5">REF: #{selectedInvoice.id.substring(0, 12)}</div></div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-3 bg-gray-50 rounded-xl text-black hover:bg-red-50 hover:text-red-500 transition-all"><FiX size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-[#F8F9FA]">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                                <div className="lg:col-span-2 bg-white rounded-3xl p-5 shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2 shrink-0"><FiFileText size={14} /> Ordered Items</h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 overscroll-contain">
                                        <div className="space-y-3 pb-2">
                                            {(selectedInvoice.invoice_items || []).map((item, i) => (
                                                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100 gap-2">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-7 h-7 shrink-0 rounded bg-white border border-gray-200 flex items-center justify-center font-black text-gray-400 text-[10px]">{i + 1}</div>
                                                        <div><h5 className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase tracking-tight line-clamp-1">{item.item_name}</h5></div>
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

                                <div className="lg:col-span-1 flex flex-col gap-4">
                                    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl border border-slate-100 shrink-0">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Payment Summary</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>Taxable</span><span className="text-gray-800 font-black">₹{Number(selectedInvoice.subtotal).toLocaleString()}</span></div>
                                            <div className="flex justify-between items-center text-[11px] font-bold text-gray-500"><span>Total Tax</span><span className="text-gray-600">+ ₹{Number(selectedInvoice.tax_amount).toLocaleString()}</span></div>
                                            <div className="my-2 border-t border-dashed border-gray-100"></div>
                                            <div className="flex justify-between items-end pt-1"><span className="text-[10px] font-black uppercase text-gray-900">Grand Total</span><span className="text-2xl font-black leading-none" style={{ color: THEME_COLOR }}>₹{Number(selectedInvoice.total_amount).toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                    <button onClick={() => window.print()} className="w-full py-4 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95" style={{ backgroundColor: THEME_COLOR }}><FiPrinter size={16} /> Print Invoice</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InvoicesBilling;