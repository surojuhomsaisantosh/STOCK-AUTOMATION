import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft, Search, X, Calendar, ChevronDown, ChevronUp, FileText, Printer, Trash2
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const ITEMS_PER_INVOICE_PAGE = 15;

const amountToWords = (price) => {
    if (!price || isNaN(price)) return "Zero Rupees Only";
    const num = Math.round(Number(price));
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

// --- PRINT COMPONENT ---
const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk, docTitle = "QUOTATION" }) => {
    if (!order) return null;
    const companyName = companyDetails?.company_name || "";
    const currentLogo = companyDetails?.logo_url || null;

    const invDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
    }) : new Date().toLocaleDateString('en-GB');

    const taxableAmount = Number(order.subtotal) || 0;
    const totalGst = Number(order.tax_amount) || 0;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const roundedBill = Number(order.total_amount) || 0;
    // For quotations, we typically don't have round_off explicit, calculate roughly
    const roundOff = order.round_off !== undefined ? Number(order.round_off) : Math.round(roundedBill) - (taxableAmount + totalGst);
    const orderId = order.id ? String(order.id).substring(0, 8).toUpperCase() : 'PENDING';

    const emptyRowsCount = Math.max(0, ITEMS_PER_INVOICE_PAGE - itemsChunk.length);

    return (
        <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
            <div className="w-full border-2 border-black flex flex-col relative flex-1">
                <div className="p-3 border-b-2 border-black relative">
                    <div className="absolute top-2 left-0 w-full text-center pointer-events-none">
                        <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4 text-black">{docTitle}</h1>
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
                        <span className="font-bold text-black uppercase text-[9px]">Quotation No:</span>
                        <p className="font-black text-sm text-black">#{orderId}</p>
                    </div>
                    <div className="w-1/2 py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Quotation Date:</span>
                        <p className="font-black text-sm text-black">{invDate}</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-black text-black">
                    <div className="w-[70%] p-2 border-r-2 border-black">
                        <span className="font-black uppercase underline text-[10px] tracking-widest text-black mb-1 block">Quote To:</span>
                        <h3 className="text-sm font-black uppercase leading-tight text-black">{order?.customer_name || ""}</h3>
                        <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">
                            {order?.customer_address || order?.branch_location || "Customer Address"}
                        </p>
                    </div>
                    <div className="w-[30%] p-2 flex flex-col justify-center pl-4 text-black">
                        {order?.franchise_id && <div className="mb-1.5"><span className="text-[10px] font-bold block mb-0.5">ID: </span><span className="text-sm font-black block text-black leading-none">{order?.franchise_id}</span></div>}
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
                                const hsnText = item.hsn_no || item.hsn_code ? ` (HSN: ${item.hsn_no || item.hsn_code})` : '';

                                return (
                                    <tr key={idx} className="h-[26px] overflow-hidden">
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[150px] text-black overflow-hidden whitespace-nowrap">
                                            {item.item_name}{hsnText}
                                        </td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{qty} {item.unit || "Pcs"}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(rate)}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{gstRate}%</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(gstAmt)}</td>
                                        <td className="py-0.5 px-2 border-b border-black text-right text-black">{formatCurrency(finalAmount)}</td>
                                    </tr>
                                );
                            })}
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
                            {/* Bank Details and Terms & Conditions omitted for Quotations */}
                        </div>
                    </div>

                    <div className="w-[40%] flex flex-col text-[10px] text-black">
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-slate-300 text-black text-[9px] bg-slate-50 pl-4"><span>CGST</span><span>{formatCurrency(cgst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-black text-black text-[9px] bg-slate-50 pl-4"><span>SGST</span><span>{formatCurrency(sgst)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                        <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200 text-black"><span className="font-black uppercase text-black">Total</span><span className="font-black text-black">{formatCurrency(roundedBill)}</span></div>
                        <div className="flex-1 flex flex-col justify-end p-2 text-center min-h-[80px]">
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

export default function OldQuotations() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [profile, setProfile] = useState({});

    // Modal / Print State
    const [selectedQuotation, setSelectedQuotation] = useState(null); // replaces expandedId
    const [printOrder, setPrintOrder] = useState(null);
    const [printCompanyDetails, setPrintCompanyDetails] = useState(null);
    const [printItems, setPrintItems] = useState([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCompany, setFilterCompany] = useState("");
    const [filterMode, setFilterMode] = useState("");
    const [filterDateType, setFilterDateType] = useState("all"); // all, date, range
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [singleDate, setSingleDate] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    // Expanded row
    const [expandedId, setExpandedId] = useState(null);

    // Print states
    const [isPrinting, setIsPrinting] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [{ data: qData }, { data: cData }] = await Promise.all([
                supabase.from("quotations").select("*").order("created_at", { ascending: false }),
                supabase.from("companies").select("*")
            ]);
            setQuotations(qData || []);
            setCompanies(cData || []);

            if (user) {
                const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (prof) setProfile(prof);
            }

            setLoading(false);
        };
        fetchData();
    }, [user]);

    // Date helpers
    const getDateRange = () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (filterDateType) {
            case "date": {
                if (!singleDate) return { from: null, to: null };
                const d = new Date(singleDate);
                return { from: d, to: new Date(d.getTime() + 86400000) };
            }
            case "range":
                return {
                    from: dateFrom ? new Date(dateFrom) : null,
                    to: dateTo ? new Date(new Date(dateTo).getTime() + 86400000) : null
                };
            default:
                return { from: null, to: null };
        }
    };

    // Filtered + sorted
    const filtered = useMemo(() => {
        let list = [...quotations];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(qt =>
                (qt.customer_name || "").toLowerCase().includes(q) ||
                (qt.customer_phone || "").toLowerCase().includes(q) ||
                (qt.snapshot_company_name || "").toLowerCase().includes(q)
            );
        }

        // Company
        if (filterCompany) {
            list = list.filter(qt => qt.company_id === filterCompany);
        }

        // Mode
        if (filterMode) {
            list = list.filter(qt => qt.quote_mode === filterMode);
        }

        // Date
        const { from, to } = getDateRange();
        if (from) list = list.filter(qt => new Date(qt.created_at) >= from);
        if (to) list = list.filter(qt => new Date(qt.created_at) < to);

        // Sort
        switch (sortBy) {
            case "oldest":
                list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case "amount_high":
                list.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
                break;
            case "amount_low":
                list.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
                break;
            default:
                list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return list;
    }, [quotations, searchQuery, filterCompany, filterMode, filterDateType, dateFrom, dateTo, sortBy]);

    const clearFilters = () => {
        setSearchQuery("");
        setFilterCompany("");
        setFilterMode("");
        setFilterDateType("all");
        setDateFrom("");
        setDateTo("");
        setSingleDate("");
        setSortBy("newest");
    };

    const handlePrint = (qt, e) => {
        if (e) e.stopPropagation(); // prevent row expansion toggle

        // Build a complete companyDetails object from:
        // 1. Snapshot data stored directly in the quotation record
        // 2. Live company data (for logo_url which isn't snapshotted)
        const liveComp = companies.find(c => c.id === qt.company_id) || companies.find(c => c.company_name === qt.snapshot_company_name);
        const bankSnap = qt.snapshot_bank_details || {};

        const mergedCompany = {
            company_name: qt.snapshot_company_name || liveComp?.company_name || "",
            company_address: qt.snapshot_company_address || liveComp?.company_address || "",
            company_gst: qt.snapshot_company_gst || liveComp?.company_gst || "",
            company_email: liveComp?.company_email || "",
            bank_name: bankSnap.bank_name || liveComp?.bank_name || "",
            bank_acc_no: bankSnap.bank_acc_no || liveComp?.bank_acc_no || "",
            bank_ifsc: bankSnap.bank_ifsc || liveComp?.bank_ifsc || "",
            terms: qt.snapshot_terms || liveComp?.terms || "",
            logo_url: liveComp?.logo_url || null,
        };

        setPrintOrder(qt);
        setPrintCompanyDetails(mergedCompany);
        setPrintItems(qt.items || []);
        setIsPrinting(true);

        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setPrintOrder(null);
            setPrintCompanyDetails(null);
            setPrintItems([]);
        }, 500);
    };

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this quotation? This cannot be undone.")) return;
        
        try {
            // Adding .select() lets us verify if a row was actually deleted or if RLS blocked it silently.
            const { data, error } = await supabase.from("quotations").delete().eq("id", id).select();
            if (error) throw error;
            
            if (!data || data.length === 0) {
                alert("Could not delete quotation. This is usually because Row Level Security (RLS) policies for DELETE are missing or restricting your access on the 'quotations' table.");
                return;
            }

            // Remove from state only if deletion was successful
            setQuotations(prev => prev.filter(q => q.id !== id));
            if (selectedQuotation?.id === id) {
                setSelectedQuotation(null);
            }
        } catch (error) {
            console.error("Error deleting quotation:", error);
            alert("Failed to delete quotation: " + error.message);
        }
    };

    const hasActiveFilters = searchQuery || filterCompany || filterMode || filterDateType !== "all" || sortBy !== "newest";

    const getCompanyName = (id) => companies.find(c => c.id === id)?.company_name || "---";

    return (
        <div className="h-screen flex flex-col bg-white text-black overflow-hidden print:overflow-visible print:bg-white print:block">
            <style>{`
                @media print {
                  body { background: white; margin: 0; padding: 0; }
                  .screen-content { display: none !important; }
                  .print-content { display: block !important; width: 100%; }
                  @page { size: A4; margin: 0; }
                  .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; }
                  .a4-page:last-child { page-break-after: auto; }
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                .print-content { display: none; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* INVOICE PRINT LAYER - ONLY VISIBLE DURING PRINT */}
            <div className="print-content bg-white">
                {printOrder && printCompanyDetails && (() => {
                    const pages = [];
                    for (let i = 0; i < printItems.length; i += ITEMS_PER_INVOICE_PAGE) {
                        pages.push(printItems.slice(i, i + ITEMS_PER_INVOICE_PAGE));
                    }
                    if (pages.length === 0) pages.push([]);

                    return pages.map((chunk, idx) => (
                        <FullPageInvoice
                            key={idx}
                            order={printOrder}
                            companyDetails={printCompanyDetails}
                            pageIndex={idx}
                            totalPages={pages.length}
                            itemsChunk={chunk}
                            docTitle={"QUOTATION"}
                        />
                    ));
                })()}
            </div>

            {/* MAIN APP CONTENT - HIDDEN DURING PRINT */}
            <div className="screen-content h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 shrink-0 flex items-center justify-between gap-2">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base w-24">
                        <ArrowLeft size={18} /> <span>Back</span>
                    </button>
                    <h1 className="text-base md:text-2xl font-black uppercase text-black text-center flex-1">Old Quotations</h1>
                    <div className="flex justify-end w-24">
                        <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 text-[10px] md:text-xs font-black uppercase tracking-wide">
                            ID : {profile.franchise_id || "---"}
                        </div>
                    </div>
                </div>

                {/* Today's Date Card */}
            <div className="px-4 md:px-6 py-2 bg-white border-b border-slate-100 shrink-0 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </span>
            </div>

            {/* Filters */}
            <div className="px-4 md:px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0 space-y-3">
                {/* Row 1: Search + Sort */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by customer name, phone, or company..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[rgb(0,100,55)] transition"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                        )}
                    </div>
                    <div className="relative">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="appearance-none pl-4 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold cursor-pointer focus:border-[rgb(0,100,55)] w-full">
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="amount_high">Amount: High to Low</option>
                            <option value="amount_low">Amount: Low to High</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Row 2: Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs font-bold cursor-pointer focus:border-[rgb(0,100,55)] w-full">
                            <option value="">All Companies</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs font-bold cursor-pointer focus:border-[rgb(0,100,55)] w-full">
                            <option value="">All Modes</option>
                            <option value="specific">Specific (Stock)</option>
                            <option value="nonspecific">Non-Specific (Custom)</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Date toggle: All / Date / Range */}
                    <div className="flex gap-2 items-center">
                        <div className="flex bg-slate-200 p-[2px] rounded-lg">
                            {["all", "date", "range"].map(dt => (
                                <button key={dt} onClick={() => setFilterDateType(dt)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${filterDateType === dt ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    {dt === "all" ? "All Time" : dt === "date" ? "Date" : "Date Range"}
                                </button>
                            ))}
                        </div>

                        {filterDateType !== "all" && (
                            <div className="flex items-center bg-white border border-slate-200 px-3 rounded-lg h-[34px]">
                                <Calendar size={14} className="mr-2 text-slate-400" />
                                {filterDateType === "date" ? (
                                    <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-slate-800" />
                                ) : (
                                    <>
                                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-slate-800" />
                                        <span className="mx-2 text-xs font-black text-slate-300">-</span>
                                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-slate-800" />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition">
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Table Header Section & Total Records */}
            <div className="px-4 md:px-6 py-2 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">History</h3>
                <div className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    {filtered.length} Record{filtered.length !== 1 && 's'}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Loading quotations...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <FileText size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No quotations found</p>
                        {hasActiveFilters && <p className="text-xs text-slate-400 mt-2">Try adjusting your filters</p>}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 pb-20 sm:pb-0">
                        {/* Table Header (Hidden on small screens) */}
                        <div className="hidden sm:grid grid-cols-[1.5fr_1fr_100px_100px_120px_120px] gap-3 px-4 md:px-6 py-2 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 sticky top-0 border-b border-slate-200">
                            <span>Customer</span>
                            <span>Company</span>
                            <span className="text-center">Mode</span>
                            <span className="text-right">Amount</span>
                            <span className="text-right">Date</span>
                            <span className="text-center">Action</span>
                        </div>

                        {filtered.map(qt => {
                            const isSelected = selectedQuotation?.id === qt.id;
                            const items = Array.isArray(qt.items) ? qt.items : [];
                            return (
                                <div key={qt.id}>
                                    <div
                                        className={`flex flex-col sm:grid sm:grid-cols-[1.5fr_1fr_100px_100px_120px_120px] gap-2 sm:gap-3 px-4 md:px-6 py-3 sm:items-center cursor-pointer hover:bg-slate-50 transition border-b sm:border-b-0 border-slate-100 ${isSelected ? 'bg-emerald-50/50' : ''}`}
                                        onClick={() => setSelectedQuotation(qt)}
                                    >
                                        <div className="flex justify-between items-start sm:block min-w-0">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800 truncate">{qt.customer_name || "N/A"}</p>
                                                {qt.customer_phone && <p className="text-[10px] font-bold text-slate-400">{qt.customer_phone}</p>}
                                            </div>
                                            {/* Mobile-only visible amount & date */}
                                            <div className="sm:hidden text-right shrink-0 ml-2">
                                                <p className="text-sm font-black text-slate-800">{formatCurrency(qt.total_amount)}</p>
                                                <p className="text-[10px] font-bold text-slate-500">{formatDate(qt.created_at)}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center sm:block">
                                            <p className="text-xs font-bold text-slate-600 truncate">{qt.snapshot_company_name || getCompanyName(qt.company_id)}</p>
                                            <span className={`sm:hidden px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${qt.quote_mode === 'specific' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {qt.quote_mode === 'specific' ? 'Stock' : 'Custom'}
                                            </span>
                                        </div>

                                        <div className="hidden sm:flex justify-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${qt.quote_mode === 'specific' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {qt.quote_mode === 'specific' ? 'Stock' : 'Custom'}
                                            </span>
                                        </div>
                                        <p className="hidden sm:block text-sm font-black text-slate-800 text-right">{formatCurrency(qt.total_amount)}</p>
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-slate-500">{formatDate(qt.created_at)}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{formatTime(qt.created_at)}</p>
                                        </div>
                                        <div className="hidden sm:flex justify-center items-center gap-2">
                                            <button onClick={(e) => handlePrint(qt, e)} className="px-3 py-1 bg-[rgb(0,100,55)] text-white rounded text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition active:scale-95">
                                                Print
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(qt.id, e)} 
                                                className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded transition"
                                                title="Delete Quotation"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            </div>
            
            {/* QUOTATION DETAILS MODAL */}
            {selectedQuotation && (() => {
                const qt = selectedQuotation;
                const items = Array.isArray(qt.items) ? qt.items : [];
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden" onClick={() => setSelectedQuotation(null)}>
                        <div 
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                                <div>
                                    <h2 className="font-black text-slate-800 text-lg">Quotation Details</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {formatDate(qt.created_at)} • {qt.customer_name || "N/A"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => handlePrint(qt, e)} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgb(0,100,55)] text-white rounded border-b-[3px] border-[rgb(0,80,44)] text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition active:border-b-0 active:translate-y-[3px]"
                                    >
                                        <Printer size={14} /> Print
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(qt.id, e)} 
                                        className="p-1.5 bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition"
                                        title="Delete Quotation"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedQuotation(null)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Company</span>
                                        <p className="text-xs font-bold text-slate-700">{qt.snapshot_company_name || getCompanyName(qt.company_id)}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</span>
                                        <p className="text-xs font-bold text-slate-700">{qt.customer_phone || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Address</span>
                                        <p className="text-xs font-bold text-slate-700">{qt.customer_address || "N/A"}</p>
                                    </div>
                                </div>

                                {/* Items Table Wrapper for horizontal scroll on very small screens inside modal */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto w-full">
                                        <div className="min-w-[500px]">
                                            <div className="grid grid-cols-[32px_1fr_60px_60px_80px_70px_80px] gap-2 px-3 py-2 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                                <span className="text-center">#</span>
                                                <span>Item</span>
                                                <span className="text-center">Qty</span>
                                                <span className="text-center">Unit</span>
                                                <span className="text-right">Rate</span>
                                                <span className="text-center">GST%</span>
                                                <span className="text-right">Total</span>
                                            </div>
                                            {items.length > 0 ? items.map((item, i) => (
                                                <div key={i} className="grid grid-cols-[32px_1fr_60px_60px_80px_70px_80px] gap-2 px-3 py-2 border-b border-slate-50 text-xs items-center hover:bg-slate-50 transition">
                                                    <span className="text-center text-slate-400 font-bold text-[10px]">{i + 1}</span>
                                                    <span className="font-bold text-slate-800 truncate" title={item.item_name}>{item.item_name}</span>
                                                    <span className="text-center font-bold text-slate-600">{item.quantity || 1}</span>
                                                    <span className="text-center font-bold text-slate-500">{item.unit || "Pcs"}</span>
                                                    <span className="text-right font-bold text-slate-700">{formatCurrency(item.price)}</span>
                                                    <span className="text-center font-bold text-slate-500">{item.gst_rate || 0}%</span>
                                                    <span className="text-right font-black text-slate-800">{formatCurrency(item.total)}</span>
                                                </div>
                                            )) : (
                                                <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                    No items found in this quotation
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Totals Section */}
                                <div className="mt-4 flex flex-col items-end gap-1 text-[10px] text-slate-600">
                                    <div className="flex justify-between w-48 px-2">
                                        <span>Subtotal</span>
                                        <span className="font-bold">{formatCurrency(qt.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between w-48 px-2">
                                        <span>Tax Amount</span>
                                        <span className="font-bold">{formatCurrency(qt.tax_amount)}</span>
                                    </div>
                                    {qt.round_off !== undefined && qt.round_off !== 0 && (
                                        <div className="flex justify-between w-48 px-2">
                                            <span>Round Off</span>
                                            <span className="font-bold">{formatCurrency(qt.round_off)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between w-48 px-2 py-1.5 mt-1 bg-slate-100 rounded border border-slate-200">
                                        <span className="font-black uppercase tracking-widest text-slate-800">Total</span>
                                        <span className="font-black text-slate-800">{formatCurrency(qt.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}
