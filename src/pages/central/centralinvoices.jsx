import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft, Search, X, RotateCcw,
    FileText, IndianRupee, Printer, Hash, ShoppingBag, Shield, Activity, Calendar, Inbox,
    ArrowUp, ArrowDown, ArrowUpDown, Building2, ChevronDown
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 15;

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
    const currentLogo = companyDetails?.logo_url || null;

    const invDate = new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const taxableAmount = Number(order.subtotal) || 0;
    const totalGst = Number(order.tax_amount) || 0;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const roundedBill = Number(order.total_amount) || 0;
    const roundOff = Number(order.round_off) || 0;
    const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'PENDING';

    const termsList = companyDetails?.terms
        ? companyDetails.terms.split('\n').filter(t => t.trim() !== '')
        : [
            "Goods once sold will not be taken back or exchanged",
            "Payments terms : 100% advance payments",
            "All legal matters subject to Hyderabad jurisdiction",
        ];

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
                            {order?.customer_address || order?.branch_location || "Franchise Outlet"}
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
                                <p className="text-[8px] text-black whitespace-pre-wrap leading-tight">{companyDetails?.terms || termsList.join(' | ')}</p>
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


// --- MAIN PAGE ---
function CentralInvoices() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [companyDetails, setCompanyDetails] = useState(null);

    const [companyList, setCompanyList] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(() => sessionStorage.getItem("central_invoice_company") || "All");

    const [search, setSearch] = useState("");
    const [rangeMode, setRangeMode] = useState(false);
    const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [statusFilter, setStatusFilter] = useState("All");

    const [showModal, setShowModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });

    useEffect(() => {
        if (!user) return;

        const initData = async () => {
            setLoading(true);
            const profile = await fetchUserProfile();

            await fetchCompanyList();

            if (!sessionStorage.getItem("central_invoice_company") && profile?.company) {
                setSelectedCompany(profile.company);
            }

            const activeCompanyToFetch = sessionStorage.getItem("central_invoice_company") || profile?.company;
            if (activeCompanyToFetch && activeCompanyToFetch !== "All") {
                await fetchCompanyDetails(activeCompanyToFetch);
            }

            await fetchInvoices(false);
            setLoading(false);
        };

        initData();

        const channel = supabase
            .channel('realtime-invoices')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices(false))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    useEffect(() => {
        sessionStorage.setItem("central_invoice_company", selectedCompany);
        if (selectedCompany !== "All") {
            fetchCompanyDetails(selectedCompany);
        }
    }, [selectedCompany]);

    const fetchUserProfile = async () => {
        try {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setUserProfile(data);
                return data;
            }
        } catch (e) { console.error(e); }
    };

    const fetchCompanyList = async () => {
        try {
            const { data } = await supabase.from('companies').select('company_name');
            if (data) {
                const uniqueCompanies = [...new Set(data.map(c => c.company_name).filter(Boolean))];
                setCompanyList(uniqueCompanies);
            }
        } catch (err) { console.error("Failed to load companies:", err); }
    };

    const fetchCompanyDetails = async (companyName) => {
        try {
            const { data } = await supabase
                .from('companies')
                .select('*')
                .eq('company_name', companyName)
                .single();
            if (data) setCompanyDetails(data);
        } catch (err) { console.error("Company fetch error:", err); }
    };

    const fetchInvoices = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select(`
                    *,
                    profiles:created_by (company)
                `)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setInvoices(data || []);
        } catch (error) { console.error(error); }
        finally { if (showLoading) setLoading(false); }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const formattedStr = dateStr.replace(" ", "T");
            const isoStr = formattedStr.endsWith("Z") ? formattedStr : `${formattedStr}Z`;
            return new Intl.DateTimeFormat('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
            }).format(new Date(isoStr)).toUpperCase();
        } catch (err) { return dateStr; }
    };

    const openInvoiceModal = async (invoice) => {
        setSelectedInvoice(invoice);
        setShowModal(true);
        setItemsLoading(true);
        setItems([]);
        try {
            const { data, error } = await supabase
                .from("invoice_items")
                .select(`*, stocks (hsn_code)`)
                .eq("invoice_id", invoice.id);
            if (error) throw error;
            setItems(data || []);
        } catch (err) { console.error(err); }
        finally { setItemsLoading(false); }
    };

    const resetFilters = () => {
        setSearch("");
        setRangeMode(false);
        setSingleDate(new Date().toISOString().split('T')[0]);
        setDateRange({ start: "", end: "" });
        setSortConfig({ key: 'created_at', direction: 'descending' });
        setStatusFilter("All");
        setSelectedCompany("All");
        fetchInvoices();
    };

    const handlePrint = () => { window.print(); };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-2 text-slate-300 inline" />;
        return sortConfig.direction === 'ascending'
            ? <ArrowUp size={14} className="ml-2 text-emerald-600 inline" />
            : <ArrowDown size={14} className="ml-2 text-emerald-600 inline" />;
    };

    const filteredInvoices = useMemo(() => {
        let data = invoices.filter((inv) => {
            const q = search.toLowerCase();
            const fId = (inv.franchise_id || "").toString().toLowerCase();
            const custName = (inv.customer_name || "").toLowerCase();

            const matchesSearch = !search || fId.includes(q) || custName.includes(q);

            const invCompany = inv.profiles?.company || "Unknown";
            const matchesCompany = selectedCompany === "All" || invCompany === selectedCompany;

            const currentStatus = (inv.status || 'Incoming').toLowerCase();
            let matchesDate = true;
            if (currentStatus === 'dispatched') {
                const invDate = inv.created_at?.split('T')[0];
                if (rangeMode) {
                    if (dateRange.start && dateRange.end) {
                        matchesDate = invDate >= dateRange.start && invDate <= dateRange.end;
                    }
                } else {
                    if (singleDate) matchesDate = invDate === singleDate;
                }
            }

            let matchesStatus = true;
            if (statusFilter !== "All") {
                matchesStatus = currentStatus === statusFilter.toLowerCase();
            }

            return matchesSearch && matchesDate && matchesStatus && matchesCompany;
        });

        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'total_amount') { aVal = Number(aVal); bVal = Number(bVal); }
                if (sortConfig.key === 'created_at') { aVal = new Date(aVal); bVal = new Date(bVal); }
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [search, singleDate, dateRange, rangeMode, invoices, sortConfig, statusFilter, selectedCompany]);

    const stats = useMemo(() => {
        const revenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        return { total: filteredInvoices.length, revenue };
    }, [filteredInvoices]);

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'dispatched': return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case 'packed': return "bg-amber-100 text-amber-700 border-amber-200";
            case 'incoming': return "bg-blue-100 text-blue-700 border-blue-200";
            default: return "bg-slate-100 text-slate-600 border-slate-200";
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-10 font-sans text-black relative selection:bg-black selection:text-white print:pb-0">
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

            <div className="print-content bg-white">
                {selectedInvoice && (() => {
                    const fullItems = items || [];
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

            <div className="screen-content">
                {showModal && selectedInvoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
                        <div className="relative w-full max-w-[800px] h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 rounded-xl border-2 border-slate-100">
                                        <Hash size={20} style={{ color: PRIMARY }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-800">Invoice Details</h2>
                                        <p className="text-[10px] font-bold text-slate-400">ID: {selectedInvoice.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handlePrint} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                                        <Printer size={14} /> Print
                                    </button>
                                    <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white p-5 rounded-2xl border-l-4 shadow-sm border border-slate-100" style={{ borderLeftColor: PRIMARY }}>
                                        <div className="flex items-center gap-3 mb-3"><Shield size={16} className="text-slate-400" /><span className="text-[10px] font-black uppercase text-slate-400">Origin Office</span></div>
                                        <p className="text-base font-black text-slate-800">Franchise ID: {selectedInvoice.franchise_id}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">{selectedInvoice.branch_location || 'Main Outlets'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border-l-4 shadow-sm border border-slate-100" style={{ borderLeftColor: '#3b82f6' }}>
                                        <div className="flex items-center gap-3 mb-3"><Activity size={16} className="text-slate-400" /><span className="text-[10px] font-black uppercase text-slate-400">Status</span></div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(selectedInvoice.status)}`}>{selectedInvoice.status || 'Incoming'}</span>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2">{formatDateTime(selectedInvoice.created_at)}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2"><ShoppingBag size={16} className="text-slate-400" /><span className="text-xs font-black uppercase text-slate-600">Order Items</span></div>
                                    <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                                        <thead className="text-[10px] font-black uppercase text-slate-400">
                                            <tr><th className="p-4">Item</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Price</th><th className="p-4 text-center">Tax</th><th className="p-4 text-right">Total</th></tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-slate-700">
                                            {itemsLoading ? (
                                                <tr><td colSpan="5" className="p-8 text-center text-slate-400 animate-pulse">Loading items...</td></tr>
                                            ) : items.map((item) => {
                                                const basePrice = Number(item.total);
                                                const gstRate = Number(item.gst_rate) || 0;
                                                const taxAmount = basePrice * (gstRate / 100);
                                                const lineTotal = basePrice + taxAmount;
                                                return (
                                                    <tr key={item.id} className="bg-white shadow-sm border border-slate-100 rounded-xl">
                                                        <td className="p-4 rounded-l-xl border-y border-l border-slate-100">
                                                            <div className="font-black text-slate-800">{item.item_name}</div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">SKU: {item.stock_id?.slice(0, 8)}</div>
                                                        </td>
                                                        <td className="p-4 text-center border-y border-slate-100">{item.quantity} {item.unit}</td>
                                                        <td className="p-4 text-right border-y border-slate-100">₹{Number(item.price).toFixed(2)}</td>
                                                        <td className="p-4 text-center text-xs border-y border-slate-100">
                                                            <div className="text-slate-500">{gstRate}%</div>
                                                            <div className="text-[10px] text-emerald-600">+₹{taxAmount.toFixed(2)}</div>
                                                        </td>
                                                        <td className="p-4 text-right font-black rounded-r-xl border-y border-r border-slate-100">₹{lineTotal.toFixed(2)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-6 border-t-2 border-slate-100 bg-white shrink-0">
                                <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Payable</span>
                                    <span className="text-2xl font-black">₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</span>
                                </div>
                                <button onClick={handlePrint} className="md:hidden w-full mt-4 py-4 bg-slate-100 text-slate-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    <Printer size={16} /> Print Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-all">
                            <ArrowLeft size={18} /> <span className="hidden md:inline">BACK</span>
                        </button>
                    </div>
                    <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black text-center absolute left-1/2 -translate-x-1/2">Invoices</h1>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">ID :</span>
                            <span className="text-xs font-black text-black">{userProfile?.franchise_id || userProfile?.staff_id || "..."}</span>
                        </div>
                    </div>
                </nav>

                <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-4 md:mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:border-black/10">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><FileText size={24} /></div>
                            <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Records</p><h2 className="text-2xl font-black text-slate-800">{stats.total}</h2></div>
                        </div>
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:border-black/10">
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100"><IndianRupee size={24} /></div>
                            <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Billing</p><h2 className="text-2xl font-black text-slate-800">₹{stats.revenue.toLocaleString('en-IN')}</h2></div>
                        </div>
                    </div>

                    {/* --- REARRANGED: COMPANY DROPDOWN + STATUS FILTERS --- */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6 w-full items-start md:items-center">

                        {/* Company Dropdown placed cleanly on the left */}
                        <div className="relative shrink-0 w-full md:w-[220px]">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                <Building2 size={16} className="text-slate-400" />
                            </div>
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="w-full h-[42px] appearance-none pl-11 pr-10 bg-white border-2 border-slate-100 rounded-2xl text-[10px] md:text-xs font-black uppercase text-slate-700 outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors focus:border-black"
                            >
                                <option value="All">All Companies</option>
                                {companyList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Status Filters on the right side of the company dropdown */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full flex-1">
                            {["All", "Incoming", "Packed", "Dispatched"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-5 h-[42px] rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center ${statusFilter === status
                                        ? "bg-slate-900 text-white shadow-md shadow-black/10 scale-[1.02]"
                                        : "bg-white text-slate-500 border-2 border-slate-100 hover:border-slate-300 hover:text-slate-700"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="relative w-full lg:flex-1 h-12 md:h-14 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={18} />
                            <input placeholder="SEARCH NAME OR FRANCHISE ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full pl-14 pr-6 bg-white border-2 border-slate-100 focus:border-black rounded-2xl text-[10px] md:text-xs font-black outline-none transition-all uppercase shadow-sm" />
                        </div>
                        <div className="flex items-center gap-2 w-full lg:w-auto h-12 md:h-14">
                            <div className="flex-1 flex items-center bg-white rounded-2xl border-2 border-slate-100 p-1 h-full min-w-0 shadow-sm">
                                <div className="flex bg-slate-50 p-1 rounded-xl shrink-0 mr-2">
                                    <button onClick={() => setRangeMode(false)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!rangeMode ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Single</button>
                                    <button onClick={() => setRangeMode(true)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${rangeMode ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Range</button>
                                </div>
                                <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                                    {!rangeMode ? (
                                        <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase w-full text-center tracking-wider cursor-pointer" />
                                    ) : (
                                        <div className="flex items-center gap-1 w-full justify-center">
                                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase text-center tracking-tighter cursor-pointer" />
                                            <span className="text-[9px] text-slate-300 font-bold">-</span>
                                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase text-center tracking-tighter cursor-pointer" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={resetFilters} className="h-full aspect-square flex items-center justify-center bg-black text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10 shrink-0"><RotateCcw size={18} /></button>
                        </div>
                    </div>

                    <div className="hidden md:block bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm h-[600px] relative">
                        <div className="overflow-y-auto h-full">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 text-slate-400">
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 w-16 sticky top-0 bg-slate-50 z-20 shadow-sm">S.No</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('id')}>Invoice <SortIcon columnKey="id" /></th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('franchise_id')}>Franchise ID <SortIcon columnKey="franchise_id" /></th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('customer_name')}>Customer <SortIcon columnKey="customer_name" /></th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('status')}>Status <SortIcon columnKey="status" /></th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('created_at')}>Date & Time <SortIcon columnKey="created_at" /></th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-100 text-right cursor-pointer hover:text-black transition-colors sticky top-0 bg-slate-50 z-20 shadow-sm" onClick={() => handleSort('total_amount')}>Amount <SortIcon columnKey="total_amount" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading && invoices.length === 0 ? (
                                        <tr><td colSpan="7" className="p-10 text-center font-bold text-slate-400">Loading Ledger...</td></tr>
                                    ) : filteredInvoices.length === 0 ? (
                                        <tr><td colSpan="7" className="p-10 text-center font-bold text-slate-400">No Invoices Found</td></tr>
                                    ) : filteredInvoices.map((inv, index) => (
                                        <tr key={inv.id} onClick={() => openInvoiceModal(inv)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <td className="p-6 text-[10px] font-bold text-slate-400">{index + 1}.</td>
                                            <td className="p-6"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black">#{inv.id.toString().slice(-6).toUpperCase()}</span></td>
                                            <td className="p-6"><span className="text-xs font-black text-slate-700">{inv.franchise_id}</span></td>
                                            <td className="p-6"><div className="text-xs font-black text-slate-800">{inv.customer_name}</div><div className="text-[10px] font-bold text-slate-400">{inv.customer_phone}</div></td>
                                            <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(inv.status)}`}>{inv.status || 'Incoming'}</span></td>
                                            <td className="p-6 text-xs font-bold text-slate-500 uppercase">{formatDateTime(inv.created_at)}</td>
                                            <td className="p-6 text-right text-sm font-black" style={{ color: PRIMARY }}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="md:hidden flex flex-col gap-4 pb-20">
                        {loading && invoices.length === 0 ? (
                            <div className="text-center p-10 text-slate-400 font-bold text-xs uppercase">Loading Ledger...</div>
                        ) : filteredInvoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                <Inbox size={32} className="mb-2 opacity-50" /><span className="font-bold text-xs uppercase tracking-widest">No Invoices Found</span>
                            </div>
                        ) : filteredInvoices.map((inv) => (
                            <div key={inv.id} onClick={() => openInvoiceModal(inv)} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm active:scale-95 transition-transform">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black mb-2 inline-block">#{inv.id.toString().slice(-6).toUpperCase()}</span>
                                        <h3 className="text-sm font-black text-slate-800">{inv.customer_name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400">ID: {inv.franchise_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black" style={{ color: PRIMARY }}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</p>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border inline-block mt-1 ${getStatusStyle(inv.status)}`}>{inv.status || 'Incoming'}</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t-2 border-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase"><Calendar size={12} /> {formatDateTime(inv.created_at)}</div>
                                    <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">View Details &rarr;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CentralInvoices;