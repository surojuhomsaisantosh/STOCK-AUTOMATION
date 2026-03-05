import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft, Search, X, Plus, Minus, CheckCircle, Package, Building2, User, Printer, FileText, Trash2
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 15;

// --- HELPER FUNCTIONS ---
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

// --- PRINT COMPONENT ---
const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk, docTitle = "TAX INVOICE" }) => {
    if (!order) return null;
    const companyName = companyDetails?.company_name || "";
    const invDate = new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });

    // DYNAMIC LOGO FROM STORAGE BUCKET
    const currentLogo = companyDetails?.logo_url || null;

    const taxableAmount = Number(order.subtotal) || 0;
    const totalGst = Number(order.tax_amount) || 0;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const roundedBill = Number(order.total_amount) || 0;
    const roundOff = Number(order.round_off) || 0;
    const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'PENDING';

    const termsList = companyDetails?.terms ? companyDetails.terms.split('\n').filter(t => t.trim() !== '') : ["Goods once sold will not be taken back or exchanged", "Payments terms : 100% advance payments", "All legal matters subject to Hyderabad jurisdiction"];
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
                        <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">{order?.customer_address || order?.branch_location || "Franchise Outlet"}</p>
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
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[150px] text-black overflow-hidden whitespace-nowrap">{item.item_name}{hsnText}</td>
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
                                    <td className="py-0.5 px-2 border-r-2 border-b border-black"></td><td className="py-0.5 px-2 border-r-2 border-b border-black"></td><td className="py-0.5 px-2 border-r-2 border-b border-black"></td><td className="py-0.5 px-2 border-r-2 border-b border-black"></td><td className="py-0.5 px-2 border-r-2 border-b border-black"></td><td className="py-0.5 px-2 border-b border-black"></td>
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
            <div className="absolute bottom-1 right-2 print:bottom-1.5 print:right-2 text-[9px] font-black text-black">Page {pageIndex + 1} of {totalPages}</div>
        </div>
    );
};


// --- MAIN COMPONENT ---
function PackageBills() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data States
    const [profile, setProfile] = useState({});
    const [companies, setCompanies] = useState([]);
    const [franchises, setFranchises] = useState([]);
    const [stocks, setStocks] = useState([]);

    // Selection States
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState("");

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [pkgItems, setPkgItems] = useState([]);
    const [stockSearch, setStockSearch] = useState("");
    const [selectedModalCategory, setSelectedModalCategory] = useState("All");
    const [isGenerating, setIsGenerating] = useState(false);

    // Print States
    const [printOrder, setPrintOrder] = useState(null);
    const [printCompanyDetails, setPrintCompanyDetails] = useState(null);
    const [printItems, setPrintItems] = useState([]);
    const [printDocTitle, setPrintDocTitle] = useState("TAX INVOICE");

    // Quote States
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteMode, setQuoteMode] = useState("specific"); // "specific" | "nonspecific"
    const [quoteClient, setQuoteClient] = useState({ name: "", phone: "", address: "" });
    const [quoteCompanyId, setQuoteCompanyId] = useState("");
    const [quoteSpecificItems, setQuoteSpecificItems] = useState([]);
    const [quoteCustomItems, setQuoteCustomItems] = useState([]);
    const [quoteStockSearch, setQuoteStockSearch] = useState("");
    const [quoteCategory, setQuoteCategory] = useState("All");

    const fetchData = async () => {
        if (!user) return;
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof) setProfile(prof);

        const { data: comps } = await supabase.from('companies').select('*').order('company_name');
        if (comps) setCompanies(comps);

        const { data: franchs } = await supabase.from('profiles').select('*').eq('role', 'franchise').order('name');
        if (franchs) setFranchises(franchs);

        const { data: stks } = await supabase.from('stocks').select('*').order('item_name');
        if (stks) setStocks(stks);
    };

    useEffect(() => { fetchData(); }, [user]);

    const availableFranchises = useMemo(() => {
        if (!selectedCompanyId || companies.length === 0) return [];

        const selectedCompany = companies.find(c => c.id === selectedCompanyId);
        if (!selectedCompany) return [];

        const targetCompanyName = selectedCompany.company_name ? String(selectedCompany.company_name).trim().toLowerCase() : "";

        return franchises.filter(f => {
            const fCompany = f.company ? String(f.company).trim().toLowerCase() : "";
            return fCompany === targetCompanyName;
        });
    }, [selectedCompanyId, companies, franchises]);

    const openBillModal = () => {
        if (!selectedCompanyId || !selectedFranchiseId) {
            return alert("Please select both a Billing Company and a Target Franchise first.");
        }
        setPkgItems([]);
        setStockSearch("");
        setSelectedModalCategory("All");
        setShowModal(true);
    };

    const handleItemQtyChange = (stock, newQty) => {
        const qty = Math.max(0, parseInt(newQty) || 0);
        if (qty === 0) {
            setPkgItems(pkgItems.filter(i => i.stock_id !== stock.id));
        } else {
            const existing = pkgItems.find(i => i.stock_id === stock.id);
            if (existing) {
                setPkgItems(pkgItems.map(i => i.stock_id === stock.id ? { ...i, quantity: qty } : i));
            } else {
                setPkgItems([...pkgItems, { stock_id: stock.id, quantity: qty, stockDetails: stock }]);
            }
        }
    };

    const handleGenerateBill = async () => {
        if (pkgItems.length === 0) return alert("Please add items.");

        const company = companies.find(c => c.id === selectedCompanyId);
        const franchise = franchises.find(f => f.franchise_id === selectedFranchiseId);

        if (!window.confirm(`Generate Invoice for ${franchise.name}?`)) return;

        setIsGenerating(true);

        let subtotal = 0;
        let tax_amount = 0;
        const invoiceItemsToInsert = [];
        const stockUpdates = [];

        for (const pItem of pkgItems) {
            const stock = stocks.find(s => s.id === pItem.stock_id);
            if (!stock) continue;

            const qty = Number(pItem.quantity);
            const price = Number(stock.price);
            const gstRate = Number(stock.gst_rate) || 0;
            const lineSubtotal = qty * price;
            const lineGst = lineSubtotal * (gstRate / 100);
            const lineTotal = lineSubtotal + lineGst;

            subtotal += lineSubtotal;
            tax_amount += lineGst;

            invoiceItemsToInsert.push({
                stock_id: stock.id, item_name: stock.item_name, quantity: qty,
                unit: stock.unit, price: price, total: lineTotal, gst_rate: gstRate
            });

            stockUpdates.push({ id: stock.id, newQuantity: Number(stock.quantity) - qty });
        }

        const total_amount = subtotal + tax_amount;

        const { data: invData, error: invError } = await supabase.from('invoices').insert({
            created_by: user.id,
            total_amount, subtotal, tax_amount, round_off: 0,
            status: 'incoming',
            franchise_id: franchise.franchise_id,
            customer_name: franchise.name,
            customer_phone: franchise.phone,
            customer_email: franchise.email,
            customer_address: franchise.address,
            branch_location: franchise.branch_location,
            order_time_text: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            snapshot_company_name: company.company_name,
            snapshot_company_address: company.company_address,
            snapshot_company_gst: company.company_gst,
            snapshot_bank_details: { bank_name: company.bank_name, bank_acc_no: company.bank_acc_no, bank_ifsc: company.bank_ifsc },
            snapshot_terms: company.terms
        }).select().single();

        if (invError) {
            setIsGenerating(false);
            return alert("Error: " + invError.message);
        }

        const mappedItems = invoiceItemsToInsert.map(item => ({ ...item, invoice_id: invData.id }));
        await supabase.from('invoice_items').insert(mappedItems);

        for (const update of stockUpdates) {
            await supabase.from('stocks').update({ quantity: update.newQuantity }).eq('id', update.id);
        }

        setIsGenerating(false);
        setShowModal(false);
        fetchData();

        setPrintDocTitle("TAX INVOICE");
        setPrintOrder(invData);
        setPrintCompanyDetails(company);
        setPrintItems(mappedItems.map(mItem => ({ ...mItem, stocks: stocks.find(s => s.id === mItem.stock_id) })));

        setTimeout(() => { window.print(); }, 500);
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

        // Save to quotations table
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
            // Still allow printing even if save fails
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

    const modalFilteredStocks = useMemo(() => {
        return stocks.filter(stock => {
            const cat = stock.category || "Uncategorized";
            const matchesSearch = !stockSearch || stock.item_name.toLowerCase().includes(stockSearch.toLowerCase()) || stock.item_code?.toLowerCase().includes(stockSearch.toLowerCase());
            const matchesCategory = selectedModalCategory === "All" || cat === selectedModalCategory;
            return matchesSearch && matchesCategory;
        });
    }, [stocks, stockSearch, selectedModalCategory]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-black relative selection:bg-black selection:text-white print:bg-white print:p-0">
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
                .category-scroll::-webkit-scrollbar { height: 6px; }
                .category-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                .category-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
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

            <div className="screen-content flex flex-col h-screen">
                <div className="flex-none bg-white shadow-sm z-30">
                    <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
                        <div className="w-full flex items-center justify-between gap-2">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base w-24">
                                <ArrowLeft size={18} /> <span>Back</span>
                            </button>
                            <h1 className="text-base md:text-2xl font-black uppercase text-black text-center flex-1">Package Bills</h1>
                            <div className="w-24 flex justify-end">
                                <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 text-[10px] md:text-xs font-black uppercase tracking-wide">
                                    ID : {profile.franchise_id || "---"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 md:px-6 py-4 pb-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedFranchiseId(""); }} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[rgb(0,100,55)] font-bold text-sm shadow-sm cursor-pointer appearance-none">
                                    <option value="" disabled>1. Select Billing Company</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                            </div>

                            <div className="relative flex-1">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select value={selectedFranchiseId} onChange={(e) => setSelectedFranchiseId(e.target.value)} disabled={!selectedCompanyId || availableFranchises.length === 0} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[rgb(0,100,55)] font-bold text-sm shadow-sm cursor-pointer appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                                    <option value="" disabled>
                                        {!selectedCompanyId ? "2. Select Target Franchise" : availableFranchises.length === 0 ? "No franchises found" : "2. Select Target Franchise"}
                                    </option>
                                    {availableFranchises.map(f => <option key={f.id} value={f.franchise_id}>{f.name} ({f.franchise_id})</option>)}
                                </select>
                            </div>

                            <button onClick={openBillModal} className="w-full lg:w-auto text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
                                <Plus size={18} /> Create New Bill
                            </button>

                            <button onClick={openQuoteModal} className="w-full lg:w-auto px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all flex-shrink-0 border-2 border-[rgb(0,100,55)] text-[rgb(0,100,55)] bg-white hover:bg-[rgb(0,100,55)]/5">
                                <FileText size={18} /> Quote a Person
                            </button>

                            <button onClick={() => navigate("/central/quotations")} className="w-full lg:w-auto px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all flex-shrink-0 border-2 border-slate-300 text-slate-600 bg-white hover:bg-slate-50">
                                <FileText size={18} /> Old Quotations
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 flex items-center justify-center">
                    <div className="text-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-[2rem] max-w-md bg-white">
                        <Printer size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-600 mb-2">Ready to Bill</h2>
                        <p className="font-bold text-xs text-slate-400 leading-relaxed">Select a Billing Company and Target Franchise, then click <strong className="text-slate-600">"Create New Bill"</strong> to deduct stock and print.</p>
                    </div>
                </div>

                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h2 className="text-lg font-black uppercase tracking-widest text-black flex items-center gap-2"><Package size={20} className="text-[rgb(0,100,55)]" /> Select Items For Bill</h2>
                                <div className="flex items-center gap-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest bg-[rgb(0,100,55)] text-white px-3 py-1 rounded-md">{pkgItems.length} Items Selected</div>
                                    <button onClick={() => setShowModal(false)} className="p-2 bg-white rounded-full text-black hover:bg-red-50 hover:text-red-500 transition border border-slate-200"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="p-5 bg-white shrink-0 border-b border-slate-100 shadow-sm z-10 flex flex-col gap-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Search items..." className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-[rgb(0,100,55)] transition-all" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-3 pt-1 items-center category-scroll">
                                    {modalCategories.map(cat => (
                                        <button key={cat} onClick={() => setSelectedModalCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedModalCategory === cat ? 'bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)] shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-black'}`}>{cat}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 scrollbar-thin scrollbar-thumb-slate-300 relative">
                                {modalFilteredStocks.length === 0 ? (
                                    <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No items match.</div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
                                        {modalFilteredStocks.map(stock => {
                                            const inPkg = pkgItems.find(i => i.stock_id === stock.id);
                                            const qty = inPkg ? inPkg.quantity : 0;
                                            return (
                                                <div key={stock.id} className={`p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${qty > 0 ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-black text-slate-800 truncate">{stock.item_name}</p>
                                                            {stock.item_code && <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{stock.item_code}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
                                                            <span className={stock.quantity <= (stock.threshold || 0) ? "text-red-500" : "text-slate-400"}>Stock: {stock.quantity} {stock.unit}</span>
                                                            <span className="text-slate-300">|</span>
                                                            <span className="text-[rgb(0,100,55)]">₹{stock.price} / {stock.unit}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm h-10">
                                                            <button onClick={() => handleItemQtyChange(stock, qty - 1)} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"><Minus size={16} /></button>
                                                            <input type="number" min="0" value={qty} onChange={(e) => handleItemQtyChange(stock, e.target.value)} className="w-12 h-full text-center bg-slate-50 border-x border-slate-200 outline-none font-black text-sm text-[rgb(0,100,55)]" />
                                                            <button onClick={() => handleItemQtyChange(stock, qty + 1)} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"><Plus size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600">Cancel</button>
                                <button onClick={handleGenerateBill} disabled={isGenerating} className="flex-[2] py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-[rgb(0,100,55)]/20 active:scale-95 flex justify-center items-center gap-2" style={{ backgroundColor: PRIMARY }}>
                                    {isGenerating ? "Processing..." : <><Printer size={16} /> Generate & Print Bill</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <button onClick={() => setShowQuoteModal(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600">Cancel</button>
                                <button onClick={handleGenerateQuote} className="flex-[2] py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-[rgb(0,100,55)]/20 active:scale-95 flex justify-center items-center gap-2" style={{ backgroundColor: PRIMARY }}>
                                    <Printer size={16} /> Generate & Print Quote
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PackageBills;