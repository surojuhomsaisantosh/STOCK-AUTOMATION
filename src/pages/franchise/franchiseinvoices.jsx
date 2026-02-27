import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
    ArrowLeft, Search, Printer, X, TrendingUp, ReceiptText, ChevronRight, Clock, Calendar
} from "lucide-react";
import { formatCurrency, amountToWords } from "../../utils/formatters";
import { headerStyles } from "../../utils/headerStyles";

const ITEMS_PER_INVOICE_PAGE = 15;

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




// --- INVOICE PRINT COMPONENT ---
const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk, allItemsForTaxCalc }) => {
    if (!order) return null;
    const companyName = companyDetails?.company_name || "";

    // FETCH LOGO FROM DATABASE (Storage Bucket URL)
    const currentLogo = companyDetails?.logo_url || null;

    const invDate = formatDate(order.created_at);
    const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'PENDING';

    let totalTaxableValue = 0, totalTax = 0;
    (allItemsForTaxCalc || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const basePrice = Number(item.price) || 0;
        const gstRate = Number(item.gst_rate) || 0;
        const rowTaxable = basePrice * qty;
        const rowTaxAmount = rowTaxable * (gstRate / 100);
        totalTaxableValue += rowTaxable;
        totalTax += rowTaxAmount;
    });

    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    const roundedBill = Number(order.total_amount) || 0;
    const calculatedTotal = totalTaxableValue + totalTax;
    const roundOff = roundedBill - calculatedTotal;

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
                                const finalAmount = subtotal + gstAmt;
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
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Taxable</span><span>{formatCurrency(totalTaxableValue)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Total GST</span><span>{formatCurrency(totalTax)}</span></div>
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


// --- MAIN PAGE ---
function FranchiseInvoices() {
    const navigate = useNavigate();
    const brandGreen = "rgb(0, 100, 55)";

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentFranchiseId, setCurrentFranchiseId] = useState(null);
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
            const { data: itemsData } = await supabase.from("invoice_items").select(`*, stocks(hsn_code)`).eq("invoice_id", invoice.id);
            setInvoiceItems(itemsData || []);

            let aggTaxable = 0;
            let aggTax = 0;
            (itemsData || []).forEach(item => {
                const qty = Number(item.quantity) || 0;
                const basePrice = Number(item.price) || 0;
                const gstRate = Number(item.gst_rate) || 0;
                const rowTaxable = basePrice * qty;
                const rowTax = rowTaxable * (gstRate / 100);
                aggTaxable += rowTaxable;
                aggTax += rowTax;
            });
            setModalStats({ taxable: aggTaxable, tax: aggTax });

            // GET COMPANY DETAILS (INCLUDING LOGO URL) BASED ON FRANCHISE PROFILE
            const { data: profileData } = await supabase.from('profiles').select('company, phone').eq('franchise_id', invoice.franchise_id).single();
            if (profileData) {
                const { data: companyData } = await supabase.from('companies').select('*').eq('company_name', profileData.company).single();
                setCompanyDetails({ ...companyData, franchise_phone: profileData.phone });
            }
        } catch (err) { console.error(err); }
    };

    const handlePrint = () => window.print();

    return (
        <div className="h-screen w-full bg-[#F8F9FA] text-black font-sans flex flex-col overflow-hidden">
            <style>{`
        @media print { 
            .no-print { display: none !important; } 
            .print-only { display: block !important; width: 100%; } 
            body { background: white; margin: 0; padding: 0; } 
            @page { margin: 0; size: A4; } 
            .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; }
            .a4-page:last-child { page-break-after: auto; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-only { display: none; }
      `}</style>

            <div className="print-only hidden print:block bg-white">
                {selectedInvoice && (() => {
                    const fullItems = invoiceItems || [];
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
                            allItemsForTaxCalc={fullItems}
                        />
                    ));
                })()}
            </div>

            <header className="no-print shrink-0" style={styles.header}>
                <div style={styles.headerInner}>
                    <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={18} /> <span>Back</span></button>
                    <h1 style={styles.heading}>Franchise <span style={{ color: brandGreen }}>Invoices</span></h1>
                    <div style={styles.idBox}>ID : {currentFranchiseId || "---"}</div>
                </div>
            </header>

            <main className="flex-1 flex flex-col min-h-0 px-4 md:px-8 pb-4 gap-4 no-print overflow-hidden">
                <div className="shrink-0 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Revenue</p><h2 className="text-xl font-black">₹{stats.total.toLocaleString()}</h2></div>
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={20} /></div>
                        </div>

                        <div className="bg-white p-3 rounded-3xl border border-slate-200 flex flex-col justify-center gap-2 px-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button onClick={() => setFilterMode("single")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "single" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Single Day</button>
                                <button onClick={() => setFilterMode("range")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMode === "range" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Date Range</button>
                            </div>
                            <div className="flex items-center gap-2 h-8">
                                {filterMode === "single" ? (
                                    <div className="w-full flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100"><Calendar size={14} className="text-slate-400 mr-2" /><input type="date" className="w-full bg-transparent text-xs font-black uppercase outline-none text-slate-700 h-8" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} /></div>
                                ) : (
                                    <div className="w-full flex items-center gap-1">
                                        <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100"><input type="date" className="w-full bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 h-8" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></div>
                                        <span className="text-slate-300 font-bold">-</span>
                                        <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100"><input type="date" className="w-full bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 h-8" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Count</p><h2 className="text-xl font-black">{stats.count}</h2></div>
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ReceiptText size={20} /></div>
                        </div>
                    </div>
                    <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="SEARCH CUSTOMER..." className="w-full pl-12 h-12 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold uppercase" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] border overflow-hidden flex flex-col min-h-0">
                    <div className="hidden md:grid grid-cols-7 gap-4 p-5 border-b bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                        <span>S.No</span><span>Ref ID</span><span className="col-span-2">Customer</span><span>Date</span><span>Time</span><span className="text-right">Amount</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y">
                        {filteredInvoices.map((inv, index) => (
                            <div key={inv.id} onClick={() => openInvoiceDetails(inv)} className="p-4 md:p-5 flex flex-col md:grid md:grid-cols-7 hover:bg-slate-50 cursor-pointer gap-3 md:items-center">
                                <div className="flex md:hidden justify-between items-start">
                                    <div><span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">#{inv.id.slice(0, 8).toUpperCase()}</span><p className="font-black uppercase text-sm mt-1">{inv.customer_name}</p></div>
                                    <div className="text-right"><p className="font-black text-sm">₹{Number(inv.total_amount).toLocaleString()}</p><div className="flex items-center gap-1 text-slate-400 mt-1"><Clock size={10} /><span className="text-[10px] font-bold">{formatTime(inv.created_at)}</span></div></div>
                                </div>
                                <span className="hidden md:block text-xs font-bold text-slate-400">{index + 1}</span>
                                <span className="hidden md:block text-[10px] font-bold text-slate-400 truncate">#{inv.id.slice(0, 8)}</span>
                                <span className="hidden md:block md:col-span-2 font-black uppercase text-xs truncate">{inv.customer_name}</span>
                                <span className="hidden md:block text-xs font-bold text-slate-600">{formatDate(inv.created_at)}</span>
                                <span className="hidden md:block text-xs font-bold text-slate-600">{formatTime(inv.created_at)}</span>
                                <div className="hidden md:flex items-center justify-end gap-3"><span className="font-black text-sm">₹{Number(inv.total_amount).toLocaleString()}</span><ChevronRight size={16} className="text-slate-300" /></div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {showModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center no-print">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center shrink-0">
                            <div><h2 className="text-lg font-black uppercase">Details</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Ref: {selectedInvoice.id.slice(0, 8)}</p></div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-3 rounded-2xl"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Date</span><p className="text-xs font-black">{formatDate(selectedInvoice.created_at)}</p></div>
                                <div className="bg-slate-50 p-3 rounded-2xl"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Time</span><p className="text-xs font-black">{formatTime(selectedInvoice.created_at)}</p></div>
                            </div>
                            <div className="space-y-3">
                                {invoiceItems.map((item, i) => {
                                    const gstRate = Number(item.gst_rate) || 0;
                                    const basePrice = Number(item.price) || 0;
                                    const quantity = Number(item.quantity) || 0;
                                    const totalTaxable = basePrice * quantity;
                                    const totalTax = totalTaxable * (gstRate / 100);
                                    const lineTotal = totalTaxable + totalTax;
                                    return (
                                        <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                                            <div className="flex justify-between items-start mb-2"><p className="text-xs font-black uppercase w-[70%]">{item.item_name}</p><p className="font-black text-sm">₹{lineTotal.toFixed(2)}</p></div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><span className="px-2 py-1 bg-slate-100 rounded-md text-slate-500">{quantity} {item.unit}</span> x <span>₹{basePrice.toFixed(2)}</span></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-6 border-t bg-slate-50 shrink-0">
                            <div className="flex justify-between items-center mb-6 px-2"><span className="text-xs font-black uppercase">Grand Total</span><span className="text-2xl font-black">₹{selectedInvoice.total_amount}</span></div>
                            <button onClick={handlePrint} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2"><Printer size={16} /> Print Invoice</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = headerStyles;

export default FranchiseInvoices;