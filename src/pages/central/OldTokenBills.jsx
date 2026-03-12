import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Trash2, Printer, X, Search, FileText, Plus, Minus, Building2, PlusCircle, ClipboardList, Receipt, ChevronDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BRAND_COLOR = "rgb(37, 99, 235)"; // Blue distinct from Quotations (Green)
const ITEMS_PER_INVOICE_PAGE = 15;

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
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

const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk, docTitle = "REGISTRATION RECEIPT" }) => {
    if (!order) return null;
    const companyName = order.snapshot_company_name || companyDetails?.company_name || "";
    const invDate = new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const currentLogo = companyDetails?.logo_url || null;
    
    // Always calculate from the saved arrays for consistency
    const taxableAmount = Number(order.subtotal) || 0;
    const totalGst = Number(order.tax_amount) || 0;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const roundedBill = Number(order.total_amount) || 0;
    const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'PENDING';
    const termsList = companyDetails?.terms ? companyDetails.terms.split('\n').filter(t => t.trim() !== '') : ["Goods once sold will not be taken back or exchanged", "Payments terms : 100% advance payments"];

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
                                <img src={currentLogo} alt="Logo" crossOrigin="anonymous" className="h-12 w-auto object-contain mb-1" />
                            ) : (
                                <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black mb-1">NO LOGO</div>
                            )}
                            <h2 className="text-base font-black uppercase text-black break-words text-center leading-tight">{companyName}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent text-black">
                    <div className="w-1/2 border-r-2 border-black py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Receipt No:</span>
                        <p className="font-black text-sm text-black">#{orderId}</p>
                    </div>
                    <div className="w-1/2 py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Receipt Date:</span>
                        <p className="font-black text-sm text-black">{invDate}</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-black text-black">
                    <div className="w-[70%] p-2 border-r-2 border-black">
                        <span className="font-black uppercase underline text-[10px] tracking-widest text-black mb-1 block">Received From:</span>
                        <h3 className="text-sm font-black uppercase leading-tight text-black">{order?.customer_name || ""}</h3>
                        <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">{order?.customer_address || "N/A"}</p>
                    </div>
                    <div className="w-[30%] p-2 flex flex-col justify-center pl-4 text-black">
                        {order?.customer_phone && (<div><span className="text-[10px] font-bold block mb-0.5">Ph: </span><span className="text-sm font-black block text-black leading-none">{order.customer_phone}</span></div>)}
                    </div>
                </div>

                <div className="flex-1 border-b-2 border-black relative">
                    <table className="w-full text-left border-collapse text-black border-b-2 border-black">
                        <thead className="bg-slate-100 text-[10px] border-b-2 border-black text-black">
                            <tr>
                                <th className="py-1 px-2 border-r-2 border-black w-10 text-center">S.No</th>
                                <th className="py-1 px-2 border-r-2 border-black">Description of Registration Amount</th>
                                <th className="py-1 px-2 border-r-2 border-black w-20 text-right">Rate</th>
                                <th className="py-1 px-2 border-r-2 border-black w-12 text-center">GST%</th>
                                <th className="py-1 px-2 w-24 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold text-black">
                            {itemsChunk.map((item, idx) => {
                                const rate = Number(item.price) || 0;
                                const finalAmount = Number(item.total) || 0;
                                const gstRate = Number(item.gst_rate) || 0;

                                return (
                                    <tr key={idx} className="h-[26px] overflow-hidden">
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[200px] text-black overflow-hidden whitespace-nowrap">{item.item_name}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(rate)}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{gstRate}%</td>
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
                            <span className="font-bold text-[9px] text-black uppercase">Received Amount in Words:</span>
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
                        <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200 text-black"><span className="font-black uppercase text-black">Total Paid</span><span className="font-black text-black">{formatCurrency(roundedBill)}</span></div>
                        <div className="flex-1 flex flex-col justify-end p-2 text-center">
                            {pageIndex < totalPages - 1 && <p className="text-[8px] mb-1 font-bold italic text-slate-500">Continued on next page...</p>}
                            <p className="font-black border-t border-black pt-1 uppercase text-[8px] text-black">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-1 right-2 print:bottom-1.5 print:right-2 text-[9px] font-black text-black">Page {pageIndex + 1} of {totalPages}</div>
        </div>
    );
};

export default function OldTokenBills() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [bills, setBills] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [activeTab, setActiveTab] = useState("tokens"); // 'tokens' or 'quotes'
    const [loading, setLoading] = useState(true);
    const [companiesCache, setCompaniesCache] = useState({});

    // Unified Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCompany, setFilterCompany] = useState("");
    const [filterDateType, setFilterDateType] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [singleDate, setSingleDate] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    // Printing Setup
    const [printOrder, setPrintOrder] = useState(null);
    const [printCompanyDetails, setPrintCompanyDetails] = useState(null);
    const [printItems, setPrintItems] = useState([]);
    const [printDocTitle, setPrintDocTitle] = useState("REGISTRATION RECEIPT");

    const [companies, setCompanies] = useState([]);
    const [stocks, setStocks] = useState([]);

    // Quote States
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteMode, setQuoteMode] = useState("specific");
    const [quoteClient, setQuoteClient] = useState({ name: "", phone: "", address: "" });
    const [quoteCompanyId, setQuoteCompanyId] = useState("");
    const [quoteSpecificItems, setQuoteSpecificItems] = useState([]);
    const [quoteCustomItems, setQuoteCustomItems] = useState([]);
    const [quoteStockSearch, setQuoteStockSearch] = useState("");
    const [quoteCategory, setQuoteCategory] = useState("All");

    // Registration Bill States
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [tokenClient, setTokenClient] = useState({ name: "", phone: "", address: "" });
    const [tokenCompanyId, setTokenCompanyId] = useState("");
    const [tokenItems, setTokenItems] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);


    useEffect(() => {
        if (!user) return;
        const fetchInitialData = async () => {
            const { data: cData } = await supabase.from('companies').select('*');
            const cMap = {};
            if (cData) {
                setCompanies(cData);
                cData.forEach(c => cMap[c.id] = c);
            }
            setCompaniesCache(cMap);

            const { data: stks } = await supabase.from('stocks').select('*').order('item_name');
            if (stks) setStocks(stks);

            const [{ data: tData, error: tErr }, { data: qData, error: qErr }] = await Promise.all([
                supabase.from('token_bills').select('*').order('created_at', { ascending: false }),
                supabase.from('quotations').select('*').order('created_at', { ascending: false })
            ]);
            
            if (tErr) console.error("Error fetching token bills:", tErr);
            if (qErr) console.error("Error fetching quotations:", qErr);
            
            if (tData) setBills(tData);
            if (qData) setQuotations(qData);
            
            setLoading(false);
        };
        fetchInitialData();
    }, [user]);

    const [selectedItemObj, setSelectedItemObj] = useState(null);

    const handlePrint = async (obj) => {
        // Always fetch fresh company data from Supabase so logo_url is always current
        let company = companiesCache[obj.company_id] || {};
        try {
            const { data: freshCompany } = await supabase
                .from('companies')
                .select('*')
                .eq('id', obj.company_id)
                .single();
            if (freshCompany) {
                company = freshCompany;
                // Also update the cache for future use
                setCompaniesCache(prev => ({ ...prev, [obj.company_id]: freshCompany }));
            }
        } catch (e) {
            console.warn("Could not fetch fresh company data, using cache", e);
        }

        // If we still don't have company_name, use the snapshot
        if (!company.company_name) {
            company.company_name = obj.snapshot_company_name || 'Unknown Company';
        }

        let items = [];
        try {
            if (Array.isArray(obj.items)) {
                items = obj.items;
            } else if (typeof obj.items === 'string') {
                items = JSON.parse(obj.items);
            }
        } catch (e) {
            console.error("Failed to parse items", e);
        }

        setPrintDocTitle(activeTab === 'tokens' ? "REGISTRATION RECEIPT" : "QUOTATION");
        setPrintOrder(obj);
        setPrintCompanyDetails(company);
        setPrintItems(items);

        setTimeout(() => {
            window.print();
        }, 600);
    };

    const handleDelete = async (id) => {
        const table = activeTab === 'tokens' ? 'token_bills' : 'quotations';
        if (!window.confirm(`Are you sure you want to permanently delete this ${activeTab === 'tokens' ? 'Registration Bill' : 'Quotation'}? It cannot be recovered.`)) return;
        
        console.log(`Attempting to delete ${id} from table ${table}`);
        const { data, error, count } = await supabase.from(table).delete().eq('id', id).select();
        console.log("Delete response:", { data, error, count });
        
        if (error) {
            alert(`Error deleting record: ` + error.message);
        } else {
            if (!data || data.length === 0) {
                console.warn("Delete executed but zero rows were removed from Supabase.");
                alert("Could not delete the record. It may not exist or permission is denied. Check Row Level Security (RLS).");
                return;
            }
            if (activeTab === 'tokens') {
                setBills(prev => prev.filter(b => b.id !== id));
            } else {
                setQuotations(prev => prev.filter(q => q.id !== id));
            }
            if (selectedItemObj?.id === id) setSelectedItemObj(null);
        }
    };

// --- QUOTE LOGIC ---
const openQuoteModal = () => {
    setQuoteClient({ name: "", phone: "", address: "" });
    setQuoteCompanyId(companies.length === 1 ? companies[0].id : "");
    setQuoteMode("specific");
    setQuoteSpecificItems([]);
    setQuoteCustomItems([]);
    setQuoteStockSearch("");
    setQuoteCategory("All");
    setShowQuoteModal(true);
};

const handleQuoteSpecificQty = (stock, newQty) => {
    const qty = Math.max(0, parseInt(newQty) || 0);
    if (qty === 0) {
        setQuoteSpecificItems(prev => prev.filter(i => i.stock_id !== stock.id));
    } else {
        setQuoteSpecificItems(prev => {
            const existing = prev.find(i => i.stock_id === stock.id);
            if (existing) return prev.map(i => i.stock_id === stock.id ? { ...i, quantity: qty } : i);
            return [...prev, { stock_id: stock.id, quantity: qty, stockDetails: stock }];
        });
    }
};

const addCustomRow = () => {
    setQuoteCustomItems(prev => [...prev, { item_name: "", price: 0, gst_rate: "", showQty: false, quantity: 1, showUnit: false, unit: "" }]);
};

const updateCustomRow = (idx, field, value) => {
    setQuoteCustomItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
};

const removeCustomRow = (idx) => {
    setQuoteCustomItems(prev => prev.filter((_, i) => i !== idx));
};

const handleGenerateQuote = async () => {
    if (!quoteClient.name.trim()) return alert("Please enter the client name.");
    if (!quoteCompanyId) return alert("Please select a billing company.");

    let quoteItems = [];

    if (quoteMode === "specific") {
        if (quoteSpecificItems.length === 0) return alert("Please add at least one item.");
        for (const pItem of quoteSpecificItems) {
            const stock = stocks.find(s => s.id === pItem.stock_id);
            if (!stock) continue;
            const qty = Number(pItem.quantity);
            const price = Number(stock.price);
            const gstRate = Number(stock.gst_rate) || 0;
            const lineSubtotal = qty * price;
            const lineGst = lineSubtotal * (gstRate / 100);
            const lineTotal = lineSubtotal + lineGst;
            quoteItems.push({
                item_name: stock.item_name, quantity: qty, unit: stock.unit,
                price, total: lineTotal, gst_rate: gstRate,
                stocks: stock, hsn_code: stock.hsn_code
            });
        }
    } else {
        const valid = quoteCustomItems.filter(r => r.item_name.trim());
        if (valid.length === 0) return alert("Please add at least one item.");
        for (const row of valid) {
            const qty = row.showQty ? (Number(row.quantity) || 1) : 1;
            const price = Number(row.price) || 0;
            const gstRate = Number(row.gst_rate) || 0;
            const lineSubtotal = qty * price;
            const lineGst = lineSubtotal * (gstRate / 100);
            const lineTotal = lineSubtotal + lineGst;
            const unitVal = row.showUnit && row.unit?.trim() ? row.unit.trim() : "Pcs";
            quoteItems.push({
                item_name: row.item_name, quantity: qty, unit: unitVal,
                price, total: lineTotal, gst_rate: gstRate,
                stocks: null, hsn_code: null
            });
        }
    }

    const subtotal = quoteItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
    const tax_amount = quoteItems.reduce((s, i) => s + ((Number(i.price) * Number(i.quantity)) * (Number(i.gst_rate) / 100)), 0);
    const total_amount = subtotal + tax_amount;

    const company = companies.find(c => c.id === quoteCompanyId);

    const { data: savedQuote, error: quoteError } = await supabase.from('quotations').insert({
        created_by: user.id,
        company_id: quoteCompanyId,
        customer_name: quoteClient.name,
        customer_phone: quoteClient.phone || null,
        customer_address: quoteClient.address || null,
        quote_mode: quoteMode,
        items: quoteItems.map(i => ({ item_name: i.item_name, quantity: i.quantity, unit: i.unit, price: i.price, gst_rate: i.gst_rate, total: i.total })),
        subtotal,
        tax_amount,
        total_amount,
        snapshot_company_name: company.company_name,
    }).select().single();

    if (quoteError) {
        console.error("Quote save error:", quoteError);
    }

    const quoteId = savedQuote?.id ? savedQuote.id.substring(0, 8).toUpperCase() : "QT-" + Date.now().toString(36).toUpperCase();

    const fakeOrder = {
        id: quoteId,
        created_at: new Date().toISOString(),
        customer_name: quoteClient.name,
        customer_phone: quoteClient.phone,
        customer_address: quoteClient.address,
        franchise_id: "",
        subtotal, tax_amount, total_amount,
        round_off: 0,
    };

    setPrintDocTitle("QUOTATION");
    setPrintOrder(fakeOrder);
    setPrintCompanyDetails(company);
    setPrintItems(quoteItems);
    setShowQuoteModal(false);

    setTimeout(() => { window.print(); }, 500);
};

// --- TOKEN BILL LOGIC ---
const openTokenModal = () => {
    setTokenClient({ name: "", phone: "", address: "" });
    setTokenCompanyId(companies.length === 1 ? companies[0].id : "");
    setTokenItems([]);
    setShowTokenModal(true);
};

const addTokenRow = () => {
    setTokenItems(prev => [...prev, { item_name: "", price: 0, gst_rate: "", quantity: 1 }]);
};

const updateTokenRow = (idx, field, value) => {
    setTokenItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
};

const removeTokenRow = (idx) => {
    setTokenItems(prev => prev.filter((_, i) => i !== idx));
};

const handleGenerateTokenBill = async () => {
    if (!tokenClient.name.trim()) return alert("Please enter the client name.");
    if (!tokenCompanyId) return alert("Please select a billing company.");
    
    const valid = tokenItems.filter(r => r.item_name.trim());
    if (valid.length === 0) return alert("Please add at least one item.");

    setIsGenerating(true);

    const finalItems = valid.map(row => {
        const qty = Number(row.quantity) || 1;
        const price = Number(row.price) || 0;
        const gstRate = Number(row.gst_rate) || 0;
        const lineSubtotal = qty * price;
        const lineGst = lineSubtotal * (gstRate / 100);
        const lineTotal = lineSubtotal + lineGst;
        return {
            item_name: row.item_name, quantity: qty, unit: "Pcs",
            price, total: lineTotal, gst_rate: gstRate
        };
    });

    const subtotal = finalItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
    const tax_amount = finalItems.reduce((s, i) => s + ((Number(i.price) * Number(i.quantity)) * (Number(i.gst_rate) / 100)), 0);
    const total_amount = subtotal + tax_amount;

    const company = companies.find(c => c.id === tokenCompanyId);

    const { data: savedToken, error: tokenError } = await supabase.from('token_bills').insert({
        created_by: user.id,
        company_id: tokenCompanyId,
        customer_name: tokenClient.name,
        customer_phone: tokenClient.phone || null,
        customer_address: tokenClient.address || null,
        items: finalItems,
        subtotal,
        tax_amount,
        total_amount,
        snapshot_company_name: company.company_name,
    }).select().single();

    setIsGenerating(false);

    if (tokenError) {
        console.error("Registration Bill save error:", tokenError);
        return alert("Database Error: " + tokenError.message);
    }

    const tokenId = savedToken?.id ? savedToken.id.substring(0, 8).toUpperCase() : "TK-" + Date.now().toString(36).toUpperCase();

    const fakeOrder = {
        id: tokenId,
        created_at: new Date().toISOString(),
        customer_name: tokenClient.name,
        customer_phone: tokenClient.phone,
        customer_address: tokenClient.address,
        franchise_id: "",
        subtotal, tax_amount, total_amount,
        round_off: 0,
    };

    setPrintDocTitle("REGISTRATION RECEIPT");
    setPrintOrder(fakeOrder);
    setPrintCompanyDetails(company);
    setPrintItems(finalItems);
    
    // Auto refresh bills
    setBills(prev => [savedToken, ...prev]);

    setShowTokenModal(false);

    setTimeout(() => { window.print(); }, 500);
};

const quoteFilteredStocks = useMemo(() => {
    return stocks.filter(stock => {
        const cat = stock.category || "Uncategorized";
        const matchesSearch = !quoteStockSearch || stock.item_name.toLowerCase().includes(quoteStockSearch.toLowerCase()) || stock.item_code?.toLowerCase().includes(quoteStockSearch.toLowerCase());
        const matchesCategory = quoteCategory === "All" || cat === quoteCategory;
        return matchesSearch && matchesCategory;
    });
}, [stocks, quoteStockSearch, quoteCategory]);

const modalCategories = useMemo(() => {
    const cats = Array.from(new Set(stocks.map(s => s.category || "Uncategorized"))).sort();
    return ["All", ...cats];
}, [stocks]);


    const getDateRange = () => {
        const now = new Date();
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

    const getFilteredList = (list) => {
        let result = [...list];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                (item.customer_name || "").toLowerCase().includes(q) ||
                (item.customer_phone || "").toLowerCase().includes(q) ||
                (item.snapshot_company_name || "").toLowerCase().includes(q) ||
                (item.id || "").toLowerCase().includes(q)
            );
        }

        if (filterCompany) {
            result = result.filter(item => item.company_id === filterCompany);
        }

        const { from, to } = getDateRange();
        if (from) result = result.filter(item => new Date(item.created_at) >= from);
        if (to) result = result.filter(item => new Date(item.created_at) < to);

        switch (sortBy) {
            case "oldest":
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case "amount_high":
                result.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
                break;
            case "amount_low":
                result.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
                break;
            default:
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return result;
    };

    const filteredData = useMemo(() => {
        return activeTab === 'tokens' ? getFilteredList(bills) : getFilteredList(quotations);
    }, [bills, quotations, activeTab, searchQuery, filterCompany, filterDateType, dateFrom, dateTo, singleDate, sortBy]);

    const clearFilters = () => {
        setSearchQuery("");
        setFilterCompany("");
        setFilterDateType("all");
        setDateFrom("");
        setDateTo("");
        setSingleDate("");
        setSortBy("newest");
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-black relative selection:bg-black selection:text-white print:bg-white print:p-0 overflow-x-hidden">
            <style>{`
                @media print {
                  body { background: white !important; margin: 0 !important; padding: 0 !important; }
                  .screen-content { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; overflow: hidden !important; position: absolute !important; }
                  .print-content { display: block !important; width: 100% !important; visibility: visible !important; position: static !important; }
                  @page { size: A4; margin: 0; }
                  .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; }
                  .a4-page:last-child { page-break-after: auto; }
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  /* Prevent any blank pages from leftover elements */
                  html, body { height: auto !important; overflow: visible !important; }
                }
                .print-content { display: none; }
            `}</style>
            
            <div className="print-content bg-white">
                {printOrder && (() => {
                    const pages = [];
                    if (printItems.length === 0) pages.push([]);
                    else {
                        for (let i = 0; i < printItems.length; i += ITEMS_PER_INVOICE_PAGE) {
                            pages.push(printItems.slice(i, i + ITEMS_PER_INVOICE_PAGE));
                        }
                    }
                    return pages.map((chunk, index) => (
                        <FullPageInvoice
                            key={index} order={printOrder} companyDetails={printCompanyDetails}
                            pageIndex={index} totalPages={pages.length} itemsChunk={chunk}
                            docTitle={printDocTitle}
                        />
                    ));
                })()}
            </div>

            <div className="screen-content flex flex-col h-screen overflow-hidden">
                <div className="flex-none bg-white shadow-sm z-30">
                    <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
                        <div className="w-full flex items-center justify-between gap-2">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base shrink-0">
                                <ArrowLeft size={18} /> Back
                            </button>
                            <h1 className="text-[11px] sm:text-base md:text-2xl font-black uppercase text-black text-center flex-1 truncate">Quote & Registration Hub</h1>
                            <div className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 shrink-0 flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">ID</span>
                                <span className="text-[11px] sm:text-xs font-black text-slate-800">{user?.franchise_id ? user.franchise_id.substring(0, 8).toUpperCase() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* HUB CARDS */}
                    <div className="bg-slate-50 px-3 sm:px-4 md:px-6 py-4 sm:py-6 border-b border-slate-200">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 max-w-7xl mx-auto">
                            <div
                                onClick={openQuoteModal}
                                className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 active:scale-95 group"
                            >
                                <div className="h-9 w-9 sm:h-12 sm:w-12 bg-emerald-50 text-[rgb(0,100,55)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PlusCircle size={20} className="sm:hidden" />
                                    <PlusCircle size={24} className="hidden sm:block" />
                                </div>
                                <h3 className="font-black uppercase tracking-widest text-slate-800 text-[9px] sm:text-xs text-center leading-tight">New Quotation</h3>
                            </div>

                            <div
                                onClick={() => { setActiveTab("quotes"); setSelectedItemObj(null); }}
                                className={`bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 active:scale-95 group ${activeTab === "quotes" ? "border-slate-800" : "border-slate-200"}`}
                            >
                                <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-black text-base sm:text-xl transition-colors ${activeTab === "quotes" ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-600"}`}>
                                    {quotations.length}
                                </div>
                                <h3 className={`font-black uppercase tracking-widest text-[9px] sm:text-xs text-center leading-tight ${activeTab === "quotes" ? "text-slate-800" : "text-slate-500"}`}>Old Quotations</h3>
                            </div>

                            <div
                                onClick={openTokenModal}
                                className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 active:scale-95 group"
                            >
                                <div className="h-9 w-9 sm:h-12 sm:w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Receipt size={20} className="sm:hidden" />
                                    <Receipt size={24} className="hidden sm:block" />
                                </div>
                                <h3 className="font-black uppercase tracking-widest text-slate-800 text-[9px] sm:text-xs text-center leading-tight">New Registration</h3>
                            </div>

                            <div
                                onClick={() => { setActiveTab("tokens"); setSelectedItemObj(null); }}
                                className={`bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 active:scale-95 group ${activeTab === "tokens" ? "border-blue-600" : "border-slate-200"}`}
                            >
                                <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-black text-base sm:text-xl transition-colors ${activeTab === "tokens" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
                                    {bills.length}
                                </div>
                                <h3 className={`font-black uppercase tracking-widest text-[9px] sm:text-xs text-center leading-tight ${activeTab === "tokens" ? "text-blue-600" : "text-slate-500"}`}>Old Invoices</h3>
                            </div>
                        </div>
                    </div>

                    <div className="px-3 sm:px-4 md:px-6 py-3 border-b border-slate-100 bg-white shrink-0 space-y-2 sm:space-y-3 overflow-hidden">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                <input
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={`Search by customer, phone, ID...`}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[rgb(0,100,55)] transition"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1 sm:flex-none">
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold cursor-pointer focus:border-[rgb(0,100,55)] w-full">
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="amount_high">₹ High</option>
                                        <option value="amount_low">₹ Low</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative flex-1 sm:flex-none">
                                    <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold cursor-pointer focus:border-[rgb(0,100,55)] w-full">
                                        <option value="">All Companies</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex bg-slate-200 p-[2px] rounded-lg">
                                {["all", "date", "range"].map(dt => (
                                    <button key={dt} onClick={() => setFilterDateType(dt)}
                                        className={`px-2 sm:px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${filterDateType === dt ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {dt === "all" ? "All" : dt === "date" ? "Date" : "Range"}
                                    </button>
                                ))}
                            </div>
                            {filterDateType !== "all" && (
                                <div className="flex items-center bg-slate-50 border border-slate-200 px-2 sm:px-3 rounded-lg h-[34px] max-w-full">
                                    <Calendar size={14} className="mr-1.5 sm:mr-2 text-slate-400 shrink-0" />
                                    {filterDateType === "date" ? (
                                        <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-transparent text-[11px] sm:text-xs font-bold outline-none text-slate-800 min-w-0" />
                                    ) : (
                                        <div className="flex items-center min-w-0">
                                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-[11px] sm:text-xs font-bold outline-none text-slate-800 min-w-0 w-[105px] sm:w-auto" />
                                            <span className="mx-1 text-xs font-black text-slate-300 shrink-0">-</span>
                                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-[11px] sm:text-xs font-bold outline-none text-slate-800 min-w-0 w-[105px] sm:w-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {(searchQuery || filterCompany || filterDateType !== "all" || sortBy !== "newest") && (
                                <button onClick={clearFilters} className="px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition">
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 pb-20 sm:pb-0">
                    <div className="px-4 md:px-6 py-2 bg-slate-100 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">{activeTab === 'tokens' ? 'Registration History' : 'Quotation History'}</h3>
                        <div className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                            {filteredData.length} Record{filteredData.length !== 1 && 's'}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Records...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No records found.</div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            <div className="hidden md:grid grid-cols-[36px_1.5fr_1fr_80px_90px_90px_100px] gap-2 px-4 md:px-6 py-2 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 sticky top-10 border-b border-slate-100 z-10">
                                <span className="text-center">#</span>
                                <span>Customer</span>
                                <span>Company</span>
                                <span className="text-center">ID</span>
                                <span className="text-right">Amount</span>
                                <span className="text-right">Date</span>
                                <span className="text-center">Action</span>
                            </div>
                            
                            {filteredData.map((record, recordIndex) => {
                                const isSelected = selectedItemObj?.id === record.id;
                                const companyName = record.snapshot_company_name || companiesCache[record.company_id]?.company_name || "Unknown Company";
                                let items = [];
                                try {
                                    items = typeof record.items === 'string' ? JSON.parse(record.items) : record.items || [];
                                } catch (_) { items = []; }

                                return (
                                    <div key={record.id} className="bg-white">
                                        {/* Desktop Row */}
                                        <div
                                            className={`hidden md:grid md:grid-cols-[36px_1.5fr_1fr_80px_90px_90px_100px] gap-2 px-4 md:px-6 py-4 items-center cursor-pointer hover:bg-slate-50 transition border-b border-slate-100 ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => setSelectedItemObj(isSelected ? null : record)}
                                        >
                                            <div className="text-xs font-black text-slate-400 text-center">{recordIndex + 1}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800 truncate uppercase">{record.customer_name || "N/A"}</p>
                                                {record.customer_phone && <p className="text-[10px] font-bold text-slate-400">{record.customer_phone}</p>}
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-600 truncate flex items-center gap-1.5"><Building2 size={12} className="text-slate-400 shrink-0" /><span className="truncate">{companyName}</span></div>
                                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-center truncate">#{record.id.substring(0, 6)}</div>
                                            <div className="text-xs font-black text-slate-800 text-right">{formatCurrency(record.total_amount)}</div>
                                            <div className="text-[11px] font-bold text-slate-500 text-right">
                                                {new Date(record.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); handlePrint(record); }} className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition" title="Print">
                                                    <Printer size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Mobile + Tablet Card */}
                                        <div
                                            className={`md:hidden px-3 sm:px-4 py-3 cursor-pointer active:bg-slate-50 transition border-b border-slate-100 ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => setSelectedItemObj(isSelected ? null : record)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{recordIndex + 1}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-black text-slate-800 truncate uppercase">{record.customer_name || "N/A"}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Building2 size={10} className="text-slate-400 shrink-0" />
                                                            <p className="text-[10px] font-bold text-slate-500 truncate">{companyName}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-1">
                                                    <p className="text-[13px] font-black text-slate-800">{formatCurrency(record.total_amount)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{new Date(record.created_at).toLocaleDateString('en-GB')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">#{record.id.substring(0, 8)}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={(e) => { e.stopPropagation(); handlePrint(record); }} className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition" title="Print">
                                                        <Printer size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 md:px-6 animate-in slide-in-from-top-2 duration-200">
                                                {/* Desktop detail table */}
                                                <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="border-b border-slate-200 text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                            <tr>
                                                                <th className="pb-2 font-black">Item</th>
                                                                {activeTab === 'quotes' && <th className="pb-2 text-center">Qty</th>}
                                                                <th className="pb-2 text-right">Rate</th>
                                                                <th className="pb-2 text-center">GST</th>
                                                                <th className="pb-2 text-right">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
                                                            {items.map((it, i) => (
                                                                <tr key={i}>
                                                                    <td className="py-2.5 max-w-[180px] truncate">{it.item_name}</td>
                                                                    {activeTab === 'quotes' && <td className="py-2.5 text-center text-slate-500">{it.quantity || 1} {it.unit || "Pcs"}</td>}
                                                                    <td className="py-2.5 text-right">{formatCurrency(it.price)}</td>
                                                                    <td className="py-2.5 text-center text-slate-500">{it.gst_rate || 0}%</td>
                                                                    <td className="py-2.5 text-right text-slate-900 font-black">{formatCurrency(it.total)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/* Mobile detail cards */}
                                                <div className="sm:hidden space-y-2">
                                                    {items.map((it, i) => (
                                                        <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                                                            <p className="text-xs font-black text-slate-800 truncate">{it.item_name}</p>
                                                            <div className="flex items-center justify-between mt-1.5 text-[11px] font-bold text-slate-500">
                                                                <span>₹{Number(it.price || 0).toLocaleString('en-IN')}</span>
                                                                {activeTab === 'quotes' && <span>{it.quantity || 1} {it.unit || "Pcs"}</span>}
                                                                <span>{it.gst_rate || 0}% GST</span>
                                                                <span className="font-black text-slate-900">{formatCurrency(it.total)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {/* ========== QUOTE MODAL ========== */}
                {showQuoteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h2 className="text-lg font-black uppercase tracking-widest text-black flex items-center gap-2"><FileText size={20} className="text-[rgb(0,100,55)]" /> Generate Quotation</h2>
                                <button onClick={() => setShowQuoteModal(false)} className="p-2 bg-white rounded-full text-black hover:bg-red-50 hover:text-red-500 transition border border-slate-200"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Company Selector */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Billing Company</h3>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                        <select value={quoteCompanyId} onChange={e => setQuoteCompanyId(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[rgb(0,100,55)] font-bold text-sm cursor-pointer">
                                            <option value="" disabled>Select Company</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Client Info */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Client Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input value={quoteClient.name} onChange={e => setQuoteClient(p => ({ ...p, name: e.target.value }))} placeholder="Client Name *" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[rgb(0,100,55)] transition" />
                                        <input value={quoteClient.phone} onChange={e => setQuoteClient(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[rgb(0,100,55)] transition" />
                                        <input value={quoteClient.address} onChange={e => setQuoteClient(p => ({ ...p, address: e.target.value }))} placeholder="Address (optional)" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-[rgb(0,100,55)] transition" />
                                    </div>
                                </div>

                                {/* Mode Toggle */}
                                <div className="flex gap-2">
                                    <button onClick={() => setQuoteMode("specific")} className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] border-2 transition-all ${quoteMode === "specific" ? "bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                                        Specific (From Stock)
                                    </button>
                                    <button onClick={() => setQuoteMode("nonspecific")} className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] border-2 transition-all ${quoteMode === "nonspecific" ? "bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                                        Non-Specific (Custom)
                                    </button>
                                </div>

                                {/* Specific Mode — Same item picker as bills */}
                                {quoteMode === "specific" && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input value={quoteStockSearch} onChange={e => setQuoteStockSearch(e.target.value)} placeholder="Search items..." className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-[rgb(0,100,55)] transition-all" />
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 items-center category-scroll">
                                            {modalCategories.map(cat => (
                                                <button key={cat} onClick={() => setQuoteCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${quoteCategory === cat ? 'bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)] shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-black'}`}>{cat}</button>
                                            ))}
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm max-h-[40vh] overflow-y-auto">
                                            {quoteFilteredStocks.length === 0 ? (
                                                <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No items match.</div>
                                            ) : quoteFilteredStocks.map(stock => {
                                                const inQ = quoteSpecificItems.find(i => i.stock_id === stock.id);
                                                const qty = inQ ? inQ.quantity : 0;
                                                return (
                                                    <div key={stock.id} className={`p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${qty > 0 ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="text-sm font-black text-slate-800 truncate">{stock.item_name}</p>
                                                                {stock.item_code && <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{stock.item_code}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
                                                                <span className="text-[rgb(0,100,55)]">₹{stock.price} / {stock.unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm h-10">
                                                                <button onClick={() => handleQuoteSpecificQty(stock, qty - 1)} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"><Minus size={16} /></button>
                                                                <input type="number" min="0" value={qty} onChange={e => handleQuoteSpecificQty(stock, e.target.value)} className="w-12 h-full text-center bg-slate-50 border-x border-slate-200 outline-none font-black text-sm text-[rgb(0,100,55)]" />
                                                                <button onClick={() => handleQuoteSpecificQty(stock, qty + 1)} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"><Plus size={16} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {quoteSpecificItems.length > 0 && (
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(0,100,55)] bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 text-center">
                                                {quoteSpecificItems.length} item(s) selected
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Non-Specific Mode — Custom rows */}
                                {quoteMode === "nonspecific" && (
                                    <div className="space-y-3">
                                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-[28px_1fr_90px_80px_80px_60px_80px_32px] gap-1.5 px-3 py-2 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 items-center">
                                                <span className="text-center">#</span>
                                                <span>Description</span>
                                                <span className="text-center">Qty</span>
                                                <span className="text-center">Unit</span>
                                                <span className="text-right">Rate (₹)</span>
                                                <span className="text-center">GST%</span>
                                                <span className="text-right">Amount</span>
                                                <span></span>
                                            </div>
                                            {quoteCustomItems.length === 0 ? (
                                                <div className="py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No items yet — click "Add Row" below</div>
                                            ) : quoteCustomItems.map((row, idx) => {
                                                const rowPrice = Number(row.price) || 0;
                                                const rowQty = row.showQty ? (Number(row.quantity) || 1) : 1;
                                                const rowGst = Number(row.gst_rate) || 0;
                                                const rowAmount = (rowPrice * rowQty) + ((rowPrice * rowQty) * (rowGst / 100));
                                                return (
                                                    <div key={idx} className="grid grid-cols-[28px_1fr_90px_80px_80px_60px_80px_32px] gap-1.5 px-3 py-2 border-b border-slate-100 items-center overflow-hidden">
                                                        <span className="text-center text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                                        <input value={row.item_name} onChange={e => updateCustomRow(idx, "item_name", e.target.value)} placeholder="Item description" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-[rgb(0,100,55)] transition min-w-0" />
                                                        
                                                        {/* Qty toggle */}
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <button 
                                                                onClick={() => { updateCustomRow(idx, "showQty", !row.showQty); if(row.showQty) updateCustomRow(idx, "quantity", 1); }}
                                                                className={`px-1.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${row.showQty ? 'bg-[rgb(0,100,55)] text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                                            >
                                                                {row.showQty ? 'ON' : 'OFF'}
                                                            </button>
                                                            {row.showQty && (
                                                                <input type="number" min="1" value={row.quantity} onChange={e => updateCustomRow(idx, "quantity", e.target.value)} className="w-10 bg-slate-50 border border-slate-200 rounded px-0.5 py-1 text-xs font-bold text-center outline-none focus:border-[rgb(0,100,55)] transition" />
                                                            )}
                                                        </div>

                                                        {/* Unit toggle */}
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <button 
                                                                onClick={() => updateCustomRow(idx, "showUnit", !row.showUnit)}
                                                                className={`px-1.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${row.showUnit ? 'bg-[rgb(0,100,55)] text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                                            >
                                                                {row.showUnit ? 'ON' : 'OFF'}
                                                            </button>
                                                            {row.showUnit && (
                                                                <input value={row.unit || ""} onChange={e => updateCustomRow(idx, "unit", e.target.value)} placeholder="Kg" className="w-10 bg-slate-50 border border-slate-200 rounded px-0.5 py-1 text-xs font-bold text-center outline-none focus:border-[rgb(0,100,55)] transition" />
                                                            )}
                                                        </div>

                                                        <input type="number" min="0" value={row.price} onChange={e => updateCustomRow(idx, "price", e.target.value)} placeholder="0" className="bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs font-bold text-right outline-none focus:border-[rgb(0,100,55)] transition min-w-0" />
                                                        <input type="number" min="0" value={row.gst_rate} onChange={e => updateCustomRow(idx, "gst_rate", e.target.value)} placeholder="--" className="bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs font-bold text-center outline-none focus:border-[rgb(0,100,55)] transition min-w-0" />
                                                        <span className="text-right text-xs font-black text-slate-700 truncate">{formatCurrency(rowAmount)}</span>
                                                        <button onClick={() => removeCustomRow(idx)} className="p-0.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition justify-self-center"><Trash2 size={14} /></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button onClick={addCustomRow} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 hover:border-[rgb(0,100,55)] hover:text-[rgb(0,100,55)] transition-all flex items-center justify-center gap-2">
                                            <Plus size={16} /> Add Row
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <button onClick={() => setShowQuoteModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600">Cancel</button>
                                <button onClick={handleGenerateQuote} className="flex-[2] py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-[rgb(0,100,55)]/20 active:scale-95 flex justify-center items-center gap-2 bg-[rgb(0,100,55)]">
                                    <Printer size={16} /> Generate Quotation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========== TOKEN BILL MODAL ========== */}
                {showTokenModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h2 className="text-lg font-black uppercase tracking-widest text-black flex items-center gap-2"><FileText size={20} className="text-blue-600" /> Generate Registration Bill</h2>
                                <button onClick={() => setShowTokenModal(false)} className="p-2 bg-white rounded-full text-black hover:bg-red-50 hover:text-red-500 transition border border-slate-200"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Company Selector */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Billing Company</h3>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                        <select value={tokenCompanyId} onChange={e => setTokenCompanyId(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-sm cursor-pointer">
                                            <option value="" disabled>Select Company</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Client Info */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Client Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input value={tokenClient.name} onChange={e => setTokenClient(p => ({ ...p, name: e.target.value }))} placeholder="Client Name *" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-blue-600 transition" />
                                        <input value={tokenClient.phone} onChange={e => setTokenClient(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-blue-600 transition" />
                                        <input value={tokenClient.address} onChange={e => setTokenClient(p => ({ ...p, address: e.target.value }))} placeholder="Address (optional)" className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-blue-600 transition" />
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-3">
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-[28px_1fr_100px_80px_100px_32px] gap-1.5 px-3 py-2 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 items-center">
                                            <span className="text-center">#</span>
                                            <span>Description</span>
                                            <span className="text-right">Rate (₹)</span>
                                            <span className="text-center">GST%</span>
                                            <span className="text-right">Amount</span>
                                            <span></span>
                                        </div>
                                        {tokenItems.length === 0 ? (
                                            <div className="py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No items yet — click "Add Row" below</div>
                                        ) : tokenItems.map((row, idx) => {
                                            const rowPrice = Number(row.price) || 0;
                                            const rowQty = Number(row.quantity) || 1;
                                            const rowGst = Number(row.gst_rate) || 0;
                                            const rowAmount = (rowPrice * rowQty) + ((rowPrice * rowQty) * (rowGst / 100));
                                            return (
                                                <div key={idx} className="grid grid-cols-[28px_1fr_100px_80px_100px_32px] gap-1.5 px-3 py-3 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors">
                                                    <span className="text-[10px] font-bold text-slate-400 text-center">{idx + 1}</span>
                                                    <input value={row.item_name} onChange={e => updateTokenRow(idx, "item_name", e.target.value)} placeholder="e.g. Token Advance" className="w-full bg-transparent outline-none text-xs font-bold text-black placeholder:text-slate-300" />
                                                    <input type="number" value={row.price} onChange={e => updateTokenRow(idx, "price", e.target.value)} placeholder="Price" className="w-full bg-slate-100 rounded border border-slate-200 px-2 py-1.5 outline-none text-xs font-black text-right text-black" />
                                                    <input type="number" value={row.gst_rate} onChange={e => updateTokenRow(idx, "gst_rate", e.target.value)} placeholder="0" className="w-full bg-slate-100 rounded border border-slate-200 px-2 py-1.5 outline-none text-xs font-bold text-center text-black" />
                                                    <span className="text-xs font-black text-right text-[rgb(0,100,55)]">₹{rowAmount.toFixed(2)}</span>
                                                    <button onClick={() => removeTokenRow(idx)} className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto"><Trash2 size={14} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={addTokenRow} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition">
                                        <Plus size={16} /> Add Row
                                    </button>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <button onClick={() => setShowTokenModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600">Cancel</button>
                                <button onClick={handleGenerateTokenBill} disabled={isGenerating} className="flex-[2] py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 transition">
                                    {isGenerating ? "Processing..." : <><Printer size={16} /> Generate Registration Bill</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
