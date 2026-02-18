import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft, Plus, Trash2, X, Edit3,
    Search, Package, AlertTriangle, Calendar, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown,
    FileText, Hash, DollarSign, Globe, Info, Tag, EyeOff, ChevronDown
} from "lucide-react";

// --- CONSTANTS ---
const BRAND_COLOR = "rgb(0, 100, 55)";

// --- UTILITY: Safe Session Storage ---
const getSessionItem = (key, defaultValue) => {
    try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading ${key}`, error);
        return defaultValue;
    }
};

const setSessionItem = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error writing ${key}`, error);
    }
};

function StockUpdate() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- Data State ---
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    // SESSION STORAGE: Persist filters
    const [selectedCategory, setSelectedCategory] = useState(() => getSessionItem("stock_category", "All"));
    const [showLowStockOnly, setShowLowStockOnly] = useState(() => getSessionItem("stock_low_only", false));

    const [stockSort, setStockSort] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- Form/UI State ---
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Full Schema Form State
    const initialForm = {
        item_name: "", quantity: "", unit: "pcs", price: "",
        description: "", category: "", alt_unit: "", item_code: "",
        hsn_code: "", gst_rate: "", sales_tax_inc: "Exclusive",
        purchase_price: "", purchase_tax_inc: "Exclusive",
        mrp: "", threshold: 10, item_type: "Product",
        online_store: false, min_order_quantity: "", moq_unit: "pcs"
    };
    const [formData, setFormData] = useState(initialForm);

    // --- Persist Filters ---
    useEffect(() => { setSessionItem("stock_category", selectedCategory); }, [selectedCategory]);
    useEffect(() => { setSessionItem("stock_low_only", showLowStockOnly); }, [showLowStockOnly]);

    // --- Scroll Lock Hook ---
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showModal]);

    // --- Fetch Data ---
    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("stocks")
            .select("*")
            .order("item_name", { ascending: true });

        if (error) console.error("Error fetching stocks:", error);
        setItems(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchItems(); }, []);

    // --- Filtering & Sorting ---
    const dynamicCategories = useMemo(() => {
        const uniqueCats = [...new Set(items.map(item => item.category).filter(Boolean))];
        return ["All", ...uniqueCats.sort()];
    }, [items]);

    const filteredItems = useMemo(() => {
        let result = items.filter(item => {
            const matchesSearch =
                item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
            const qty = Number(item.quantity) || 0;
            const thresh = Number(item.threshold) || 0;
            const isLowStock = qty <= thresh;

            if (showLowStockOnly) return matchesSearch && matchesCategory && isLowStock;
            return matchesSearch && matchesCategory;
        });

        if (stockSort) {
            result.sort((a, b) => {
                const isAsc = stockSort === 'asc';
                const qtyA = Number(a.quantity) || 0;
                const qtyB = Number(b.quantity) || 0;
                return isAsc ? qtyA - qtyB : qtyB - qtyA;
            });
        }
        return result;
    }, [items, searchTerm, selectedCategory, showLowStockOnly, stockSort]);

    const lowStockCount = items.filter(i => (Number(i.quantity) || 0) <= (Number(i.threshold) || 0)).length;

    // --- Actions ---
    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const openAdd = () => {
        setEditingId(null);
        setFormData(initialForm);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            ...initialForm,
            ...item,
            sales_tax_inc: item.sales_tax_inc || "Exclusive",
            purchase_tax_inc: item.purchase_tax_inc || "Exclusive",
            online_store: item.online_store || false,
            quantity: item.quantity ?? "",
            price: item.price ?? "",
            gst_rate: item.gst_rate ?? "",
            purchase_price: item.purchase_price ?? "",
            mrp: item.mrp ?? "",
            threshold: item.threshold ?? "",
            min_order_quantity: item.min_order_quantity ?? ""
        });
        setShowModal(true);
    };

    const saveItem = async () => {
        if (!formData.item_name) return alert("Item Name is required");
        setLoading(true);

        const payload = {
            ...formData,
            quantity: formData.quantity === "" ? 0 : Number(formData.quantity),
            price: formData.price === "" ? 0 : Number(formData.price),
            gst_rate: formData.gst_rate === "" ? 0 : Number(formData.gst_rate),
            purchase_price: formData.purchase_price === "" ? 0 : Number(formData.purchase_price),
            mrp: formData.mrp === "" ? 0 : Number(formData.mrp),
            threshold: formData.threshold === "" ? 0 : Number(formData.threshold),
            min_order_quantity: formData.min_order_quantity === "" ? 0 : Number(formData.min_order_quantity),
        };

        const { error } = editingId
            ? await supabase.from("stocks").update(payload).eq('id', editingId)
            : await supabase.from("stocks").insert([payload]);

        if (error) alert(error.message);
        else { setShowModal(false); fetchItems(); }
        setLoading(false);
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Delete item permanently?")) return;
        await supabase.from("stocks").delete().eq("id", id);
        fetchItems();
    };

    // --- Helpers ---
    const calculateWithTax = (price, taxInc) => {
        const p = parseFloat(price);
        const gst = parseFloat(formData.gst_rate);

        if (isNaN(p)) return "0.00";
        if (isNaN(gst)) return p.toFixed(2);

        if (taxInc === "Inclusive") return p.toFixed(2);
        return (p + (p * gst) / 100).toFixed(2);
    };

    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // --- Sub-Components ---
    const TaxToggle = ({ value, onSelect }) => (
        <div className="flex bg-slate-100 rounded-lg p-1 h-[42px] w-full border border-slate-200">
            {["Exclusive", "Inclusive"].map((mode) => (
                <button key={mode} onClick={() => onSelect(mode)} type="button"
                    className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                    ${value === mode ? "text-white shadow-sm" : "text-black hover:text-slate-600"}`}
                    style={value === mode ? { backgroundColor: BRAND_COLOR } : {}}
                >
                    {mode}
                </button>
            ))}
        </div>
    );

    const CustomSelect = ({ name, value, onChange, options }) => (
        <div className="relative w-full">
            <select name={name} value={value} onChange={onChange} className="w-full bg-slate-50 rounded-lg border border-slate-200 pl-3 pr-8 py-3 outline-none font-bold text-black text-xs uppercase appearance-none">
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );

    const StockBadge = ({ quantity, threshold, unit }) => {
        const qtyNum = Number(quantity) || 0;
        const threshNum = Number(threshold) || 0;
        const isLow = qtyNum <= threshNum;

        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black border ${isLow ? "bg-rose-50 text-rose-600 border-rose-600" : "bg-emerald-50 text-emerald-700 border-emerald-600"}`}>
                {isLow ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                {qtyNum} {unit}
            </div>
        );
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-black overflow-hidden relative">

            {/* --- HEADER --- */}
            {/* Removed top padding to reduce space */}
            <div className="flex-none bg-white shadow-sm z-30">
                <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 relative flex items-center justify-between border-b border-slate-200">

                    {/* LEFT: BACK BUTTON */}
                    <div className="z-20 relative flex-shrink-0">
                        <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base">
                            <ArrowLeft size={18} /> <span>Back</span>
                        </button>
                    </div>

                    {/* CENTER: TITLE */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <h1 className="text-[12px] md:text-2xl font-black uppercase text-black text-center leading-tight tracking-widest bg-white/0 px-2">
                            Update <span style={{ color: BRAND_COLOR }}>Stock</span>
                        </h1>
                    </div>

                    {/* RIGHT: ID BOX (RECTANGULAR) */}
                    <div className="z-20 relative flex-shrink-0 flex items-center">
                        <div className="bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-md border border-slate-200 flex items-center justify-center gap-2 shadow-sm min-w-[80px]">
                            <span className="text-[9px] md:text-xs text-slate-400 font-black uppercase tracking-widest whitespace-nowrap leading-none">
                                ID:
                            </span>
                            <span className="text-[9px] md:text-sm font-bold text-black uppercase leading-none whitespace-nowrap">
                                {user?.franchise_id || "Global"}
                            </span>
                        </div>
                    </div>

                </div>

                {/* CONTROLS (Immediately below header) */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 pb-0">
                    <div className="flex flex-col lg:flex-row gap-3 mb-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text" placeholder="Search items..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[rgb(0,100,55)] transition-all text-black text-sm font-semibold shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-2 text-black bg-slate-50 px-5 py-3 border border-slate-200 rounded-xl flex-shrink-0">
                                <Calendar size={18} style={{ color: BRAND_COLOR }} />
                                <span className="text-sm font-bold">{todayStr}</span>
                            </div>
                            <button onClick={openAdd}
                                className="w-full lg:w-auto text-white px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all flex-shrink-0"
                                style={{ backgroundColor: BRAND_COLOR }}>
                                <Plus size={18} /> Add Item
                            </button>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
                        <button onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${showLowStockOnly ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`}
                            style={showLowStockOnly ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                            <AlertTriangle size={14} /> Low Stock ({lowStockCount})
                        </button>
                        <button onClick={() => setStockSort(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc')}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 bg-white text-black border-slate-200`}>
                            {stockSort === 'asc' ? <ArrowUp size={14} /> : stockSort === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />} Sort Qty
                        </button>
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-3 border-t border-slate-100 pt-3">
                        {dynamicCategories.map((cat) => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0
                                ${selectedCategory === cat ? "text-white shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-grow overflow-hidden bg-slate-50 relative">
                <div className="absolute inset-0 overflow-y-auto px-4 md:px-6 pb-20 md:pb-6 pt-2 scrollbar-thin scrollbar-thumb-slate-200">

                    {/* MOBILE/TABLET CARD VIEW */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredItems.length === 0 && <div className="text-center py-10 text-slate-400 font-bold text-sm col-span-full">No items found matching your criteria.</div>}
                        {filteredItems.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Tag size={10} /> {item.category}
                                        </div>
                                        <div className="font-black text-base text-black leading-tight mb-1 break-words">{item.item_name}</div>
                                        <div className="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-500 font-mono">
                                            {item.item_code || 'NO SKU'}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-lg font-black" style={{ color: BRAND_COLOR }}>₹{item.price}</div>
                                        <div className="text-[10px] text-slate-400">GST: {item.gst_rate}%</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 mt-1">
                                    <div className="flex-1">
                                        <StockBadge quantity={item.quantity} threshold={item.threshold} unit={item.unit} />
                                    </div>
                                    {item.online_store && (
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0"><Globe size={14} /></div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <button onClick={() => openEdit(item)} className="py-2.5 rounded-lg font-bold text-xs uppercase bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100">
                                        <Edit3 size={14} /> Update
                                    </button>
                                    <button onClick={() => deleteItem(item.id)} className="py-2.5 rounded-lg font-bold text-xs uppercase bg-white text-red-500 border border-red-100 flex items-center justify-center gap-2 hover:bg-red-50">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                                <tr className="text-[10px] font-black text-black uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-slate-200">#</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Code</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Item Name</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Stock Status</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Price/GST</th>
                                    <th className="px-6 py-4 border-b border-slate-200 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-bold text-black whitespace-nowrap">{(index + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-6 py-4 font-bold text-xs text-black whitespace-nowrap">{item.item_code || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-black uppercase text-xs flex items-center gap-2 max-w-[250px]">
                                                <span className="truncate" title={item.item_name}>{item.item_name}</span>
                                                {item.online_store ? <Globe size={12} className="text-blue-500 flex-shrink-0" /> : <EyeOff size={12} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />}
                                            </div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs tracking-tighter whitespace-nowrap">
                                            <StockBadge quantity={item.quantity} threshold={item.threshold} unit={item.unit} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-black text-xs text-black">₹{item.price}</div>
                                            <div className="text-[9px] font-bold text-slate-400">{item.gst_rate}% ({item.sales_tax_inc})</div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(item)} className="p-2 bg-white border border-slate-200 text-black rounded-lg hover:border-[rgb(0,100,55)] hover:text-[rgb(0,100,55)] transition-all shadow-sm"><Edit3 size={14} /></button>
                                                <button onClick={() => deleteItem(item.id)} className="p-2 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL (FULL FIELDS) --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-slate-100 md:bg-black/60 md:backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                            <h2 className="text-base md:text-lg font-black uppercase tracking-widest text-black flex items-center gap-2">
                                <Package size={18} className="text-slate-400" />
                                {editingId ? "Edit Item" : "New Item"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full text-black hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-6">

                                {/* 1. ONLINE STORE */}
                                <div className="md:col-span-3 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                                    <input type="checkbox" name="online_store" id="online_store" checked={formData.online_store} onChange={handleInput} className="w-5 h-5 accent-[rgb(0,100,55)] rounded cursor-pointer" />
                                    <label htmlFor="online_store" className="text-xs font-black uppercase tracking-wide text-blue-900 cursor-pointer flex items-center gap-2">
                                        <Globe size={14} className="text-blue-500" /> Sync with Online Store Storefront
                                    </label>
                                </div>

                                {/* 2. PRODUCT IDENTITY */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Info size={12} /> Product Identity</h3></div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Name*</label>
                                    <input name="item_name" value={formData.item_name} onChange={handleInput} placeholder="Enter Product Name" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] focus:ring-1 focus:ring-[rgb(0,100,55)] transition font-bold text-base text-black" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Code / SKU</label>
                                    <input name="item_code" value={formData.item_code} onChange={handleInput} placeholder="SKU001" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition text-black font-mono text-sm" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Category</label>
                                    <input name="category" value={formData.category} onChange={handleInput} placeholder="e.g. Groceries" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition text-black text-sm" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">HSN Code</label>
                                    <input name="hsn_code" value={formData.hsn_code} onChange={handleInput} placeholder="8-digit" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition tracking-widest text-black text-sm" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Min Order Qty (MOQ)</label>
                                    <div className="flex gap-2">
                                        <input type="number" name="min_order_quantity" value={formData.min_order_quantity} onChange={handleInput} placeholder="1" className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition font-bold text-black text-sm" />
                                        <div className="w-[80px]">
                                            <CustomSelect name="moq_unit" value={formData.moq_unit} onChange={handleInput} options={["pcs", "kg", "gm", "pkt"]} />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. INVENTORY */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Package size={12} /> Inventory & Units</h3></div>

                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Primary Unit</label>
                                        <CustomSelect name="unit" value={formData.unit} onChange={handleInput} options={["pcs", "kg", "gm", "pkt"]} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Current Stock</label>
                                        <input type="number" name="quantity" value={formData.quantity} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition font-black text-black text-sm" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Threshold</label>
                                        <input type="number" name="threshold" value={formData.threshold} onChange={handleInput} className="w-full bg-red-50 rounded-lg border border-red-100 px-3 py-3 outline-none focus:border-red-500 transition text-red-600 font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Alt Unit</label>
                                        <CustomSelect name="alt_unit" value={formData.alt_unit} onChange={handleInput} options={["None", "pcs", "kg", "gm", "pkt"]} />
                                    </div>
                                </div>

                                {/* 4. PRICING */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Hash size={12} /> Pricing & Taxation</h3></div>

                                {/* Row 1: Purchase */}
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Purchase Price</label>
                                    <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none font-bold text-black text-sm" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Purchase Tax Mode</label>
                                    <TaxToggle value={formData.purchase_tax_inc} onSelect={(val) => setFormData(prev => ({ ...prev, purchase_tax_inc: val }))} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">GST Rate (%)</label>
                                    <input type="number" name="gst_rate" value={formData.gst_rate} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none font-bold text-black text-sm" placeholder="18" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Purchase Cost</label>
                                    <div className="py-3 font-black text-slate-600 bg-slate-50 px-3 rounded-lg border border-slate-100 text-sm">
                                        ₹ {calculateWithTax(formData.purchase_price, formData.purchase_tax_inc)}
                                    </div>
                                </div>

                                <div className="md:col-span-2"></div>

                                {/* Row 2: Sales */}
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Sales Price</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none font-black text-black text-sm" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Sales Tax Mode</label>
                                    <TaxToggle value={formData.sales_tax_inc} onSelect={(val) => setFormData(prev => ({ ...prev, sales_tax_inc: val }))} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sales Price + GST</label>
                                    <div className="py-3 font-black text-emerald-700 bg-emerald-50 px-3 rounded-lg border border-emerald-100 text-sm">
                                        ₹ {calculateWithTax(formData.price, formData.sales_tax_inc)}
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">MRP</label>
                                    <input type="number" name="mrp" value={formData.mrp} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none font-black text-black text-sm" placeholder="0.00" />
                                </div>

                            </div>
                            {/* Spacer for bottom on mobile */}
                            <div className="h-20 md:hidden"></div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex gap-3 flex-shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 md:py-4 rounded-xl border border-slate-200 font-black text-[11px] uppercase tracking-widest text-black hover:bg-slate-50 transition-all">Discard</button>
                            <button onClick={saveItem} disabled={loading} className="flex-[2] py-3.5 md:py-4 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2" style={{ backgroundColor: BRAND_COLOR }}>
                                {loading ? 'Saving...' : 'Finalize & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockUpdate;
