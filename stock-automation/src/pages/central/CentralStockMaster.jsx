import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    Edit3, Trash2, X, Plus, Search,
    Calendar, ArrowLeft, AlertTriangle, Globe, EyeOff, Info,
    ChevronUp, ChevronDown, CheckCircle, ChevronRight, Package
} from "lucide-react";

function CentralStockMaster() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const BRAND_COLOR = "rgb(0, 100, 55)";

    // --- STATE ---
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const [showLowStock, setShowLowStock] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [showOfflineOnly, setShowOfflineOnly] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'item_name', direction: 'ascending' });

    const [profile, setProfile] = useState({ franchise_id: "..." });
    const [editingId, setEditingId] = useState(null);

    // Responsive State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const initialForm = {
        item_name: "",
        quantity: "",
        unit: "pcs",
        price: "",
        description: "",
        category: "",
        alt_unit: "",
        item_code: "",
        hsn_code: "",
        gst_rate: "",
        sales_tax_inc: "Exclusive",
        purchase_price: "",
        purchase_tax_inc: "Exclusive",
        mrp: "",
        threshold: "",
        item_type: "Product",
        online_store: false,
        min_order_quantity: "",
        moq_unit: "pcs"
    };
    const [formData, setFormData] = useState(initialForm);

    const categories = useMemo(() => {
        return ["All", ...new Set(items.map(item => item.category || "Uncategorized"))];
    }, [items]);

    // --- FETCH DATA ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);

        const getInitialData = async () => {
            setLoading(true);
            const [profileRes, stocksRes] = await Promise.all([
                user ? supabase.from('profiles').select('franchise_id').eq('id', user.id).single() : Promise.resolve({ data: null }),
                supabase.from("stocks")
                    .select("*")
                    .order("item_name", { ascending: true })
                    .range(0, 999)
            ]);

            if (profileRes.data) setProfile(profileRes.data);
            if (stocksRes.data) {
                setItems(stocksRes.data);
                setFilteredItems(stocksRes.data);
            }
            setLoading(false);
        };
        getInitialData();
        return () => window.removeEventListener('resize', handleResize);
    }, [user]);

    // --- SORTING LOGIC ---
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- SEARCH, FILTER & SORT LOGIC ---
    useEffect(() => {
        const term = searchTerm.toLowerCase();
        let results = [...items];

        if (showLowStock) {
            results = results.filter(item => (Number(item.quantity) || 0) <= (Number(item.threshold) || 0));
        }
        if (showAvailableOnly) {
            results = results.filter(item => (Number(item.quantity) || 0) > 0);
        }
        if (showOnlineOnly) {
            results = results.filter(item => item.online_store === true);
        } else if (showOfflineOnly) {
            results = results.filter(item => item.online_store === false);
        }
        if (selectedCategory !== "All") {
            results = results.filter(item => (item.category || "Uncategorized") === selectedCategory);
        }
        if (term) {
            results = results.filter(item =>
                item.item_name?.toLowerCase().includes(term) ||
                item.item_code?.toLowerCase().includes(term) ||
                item.hsn_code?.toLowerCase().includes(term)
            );
        }

        if (sortConfig.key) {
            results.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (aVal === null) return 1;
                if (bVal === null) return -1;
                if (typeof aVal === 'number') {
                    return sortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
                } else {
                    aVal = aVal.toString().toLowerCase();
                    bVal = bVal.toString().toLowerCase();
                    if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
            });
        }
        setFilteredItems(results);
    }, [searchTerm, selectedCategory, items, showLowStock, showAvailableOnly, showOnlineOnly, showOfflineOnly, sortConfig]);

    // --- CALCULATIONS ---
    const calculatePurchaseWithTax = () => {
        const pPrice = parseFloat(formData.purchase_price) || 0;
        const gst = parseFloat(formData.gst_rate) || 0;
        if (!pPrice) return "0.00";
        const total = pPrice + (pPrice * gst) / 100;
        return total.toFixed(2);
    };

    // --- ACTIONS ---
    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const val = type === 'checkbox' ? checked : value;
            const newData = { ...prev, [name]: val };
            if (name === "price") newData.mrp = value;
            if (name === "mrp") newData.price = value;
            return newData;
        });
    };

    const toggleOnline = () => {
        setShowOnlineOnly(!showOnlineOnly);
        if (!showOnlineOnly) setShowOfflineOnly(false);
    };

    const toggleOffline = () => {
        setShowOfflineOnly(!showOfflineOnly);
        if (!showOfflineOnly) setShowOnlineOnly(false);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            ...item,
            quantity: item.quantity?.toString() || "",
            price: item.price?.toString() || "",
            gst_rate: item.gst_rate?.toString() || "",
            purchase_price: item.purchase_price?.toString() || "",
            mrp: item.mrp?.toString() || "",
            threshold: item.threshold?.toString() || "",
            min_order_quantity: item.min_order_quantity?.toString() || "",
            moq_unit: item.moq_unit || "pcs"
        });
        setShowModal(true);
    };

    const saveItem = async () => {
        if (!formData.item_name) return alert("Item Name is mandatory!");
        setLoading(true);
        const payload = {
            ...formData,
            quantity: Number(formData.quantity) || 0,
            price: Number(formData.price) || 0,
            gst_rate: Number(formData.gst_rate) || 0,
            purchase_price: Number(formData.purchase_price) || 0,
            mrp: Number(formData.mrp) || 0,
            threshold: Number(formData.threshold) || 0,
            min_order_quantity: Number(formData.min_order_quantity) || 0
        };
        const { error } = editingId
            ? await supabase.from("stocks").update(payload).eq('id', editingId)
            : await supabase.from("stocks").insert([payload]);

        if (error) alert("Error: " + error.message);
        else {
            setShowModal(false);
            const { data } = await supabase.from("stocks").select("*").range(0, 999);
            if (data) setItems(data);
        }
        setLoading(false);
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Delete item permanently?")) return;
        await supabase.from("stocks").delete().eq("id", id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const TaxToggle = ({ value, onSelect }) => (
        <div className="flex bg-slate-100 rounded-lg p-1 h-[42px] w-full border border-slate-200">
            {["Exclusive", "Inclusive"].map((mode) => (
                <button
                    key={mode} onClick={() => onSelect({ target: { name: "purchase_tax_inc", value: mode, type: "text" } })}
                    type="button"
                    className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                    ${value === mode ? "text-white shadow-sm" : "text-black hover:text-slate-600"}`}
                    style={value === mode ? { backgroundColor: BRAND_COLOR } : {}}
                >
                    {mode}
                </button>
            ))}
        </div>
    );

    const SortArrows = ({ columnKey }) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <div className="flex flex-col ml-1 transition-opacity">
                <ChevronUp size={8} strokeWidth={4} className={`-mb-0.5 ${isActive && sortConfig.direction === 'ascending' ? 'opacity-100' : 'opacity-20'}`} style={isActive && sortConfig.direction === 'ascending' ? { color: BRAND_COLOR } : {}} />
                <ChevronDown size={8} strokeWidth={4} className={`${isActive && sortConfig.direction === 'descending' ? 'opacity-100' : 'opacity-20'}`} style={isActive && sortConfig.direction === 'descending' ? { color: BRAND_COLOR } : {}} />
            </div>
        );
    };

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="h-screen w-full flex flex-col bg-slate-50 font-sans text-black overflow-hidden">

            {/* --- HEADER --- */}
            <div className="flex-none bg-white shadow-sm z-30">
                <div className={`border-b border-slate-200 ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
                    <div className="max-w-full mx-auto flex items-center justify-between">
                        <button onClick={() => navigate("/dashboard/central")} className="flex items-center gap-2 text-black hover:opacity-70 font-bold transition">
                            <ArrowLeft size={18} /> {!isMobile && "Back"}
                        </button>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black uppercase text-black text-center flex-1`}>
                            Stock <span style={{ color: BRAND_COLOR }}>Master</span>
                        </h1>
                        <div className="bg-slate-50 px-3 md:px-4 py-1.5 rounded-full border border-slate-200 text-xs md:text-sm font-bold">
                            <span className="text-black">{profile.franchise_id}</span>
                        </div>
                    </div>
                </div>

                <div className={`max-w-full mx-auto ${isMobile ? 'px-4' : 'px-6'} py-4 pb-2`}>
                    <div className={`flex flex-col ${isMobile ? 'gap-3' : 'md:flex-row md:items-center justify-between gap-4'} mb-4`}>
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                            <input
                                type="text" placeholder={isMobile ? "Search..." : `Search ${items.length} items...`} value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[rgb(0,100,55)] transition-all text-black font-bold uppercase text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {!isMobile && (
                                <div className="flex items-center gap-2 text-black bg-slate-50 px-5 py-3 border border-slate-200 rounded-xl">
                                    <Calendar size={18} style={{ color: BRAND_COLOR }} />
                                    <span className="text-sm font-bold">{today}</span>
                                </div>
                            )}
                            <button onClick={() => { setEditingId(null); setFormData(initialForm); setShowModal(true); }}
                                className="flex-1 md:flex-none text-white px-6 py-3.5 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                style={{ backgroundColor: BRAND_COLOR }}>
                                <Plus size={18} /> {isMobile ? "ADD" : "Add Item"}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => setShowLowStock(!showLowStock)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 whitespace-nowrap ${showLowStock ? "text-white shadow-lg" : "bg-white text-black border-slate-200"}`}
                            style={showLowStock ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                            <AlertTriangle size={14} /> Low
                        </button>
                        <button onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 whitespace-nowrap ${showAvailableOnly ? "text-white shadow-lg" : "bg-white text-black border-slate-200"}`}
                            style={showAvailableOnly ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                            <CheckCircle size={14} /> Available
                        </button>
                        <button onClick={toggleOnline}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 whitespace-nowrap ${showOnlineOnly ? "text-white shadow-lg" : "bg-white text-black border-slate-200"}`}
                            style={showOnlineOnly ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                            <Globe size={14} /> Online
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-t border-slate-100 pt-4">
                        {categories.map((cat) => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black border transition-all whitespace-nowrap uppercase
                                ${selectedCategory === cat ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`}
                                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- DATA CONTENT --- */}
            <div className={`flex-grow overflow-hidden ${isMobile ? 'px-4 pb-4' : 'px-6 pb-6'} mt-2`}>
                {isMobile ? (
                    <div className="h-full overflow-y-auto space-y-3 no-scrollbar pb-10">
                        {filteredItems.map((item, index) => {
                            const isLowStock = (Number(item.quantity) || 0) <= (Number(item.threshold) || 0);
                            return (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all">
                                    <div className="flex justify-between items-start">
                                        <div style={{ flex: 1 }}>
                                            <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                                                ID: {item.item_code || '-'}
                                                {item.online_store ? <Globe size={10} className="text-blue-500" /> : <EyeOff size={10} className="text-slate-300" />}
                                            </div>
                                            <h3 className="font-black text-sm uppercase text-black leading-tight mt-1">{item.item_name}</h3>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">{item.category}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-base text-black">₹{item.price}</div>
                                            <div className="text-[8px] font-bold text-slate-400">GST: {item.gst_rate}%</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase border
                                            ${isLowStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                            {isLowStock ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                            {item.quantity} {item.unit}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(item)} className="p-2.5 bg-black text-white rounded-xl"><Edit3 size={16} /></button>
                                            <button onClick={() => deleteItem(item.id)} className="p-2.5 border-2 border-red-100 text-red-600 rounded-xl"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-20 bg-slate-100">
                                    <tr className="text-[10px] font-black text-black uppercase tracking-widest">
                                        <th className="px-6 py-4 border-b border-slate-200 cursor-pointer" onClick={() => requestSort('id')}>
                                            <div className="flex items-center">S.No <SortArrows columnKey="id" /></div>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-200 cursor-pointer" onClick={() => requestSort('item_code')}>
                                            <div className="flex items-center">Code <SortArrows columnKey="item_code" /></div>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-200 cursor-pointer" onClick={() => requestSort('item_name')}>
                                            <div className="flex items-center">Item Name <SortArrows columnKey="item_name" /></div>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-200 cursor-pointer" onClick={() => requestSort('quantity')}>
                                            <div className="flex items-center">Stock Status <SortArrows columnKey="quantity" /></div>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-200 cursor-pointer" onClick={() => requestSort('price')}>
                                            <div className="flex items-center">Price/GST <SortArrows columnKey="price" /></div>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-200 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((item, index) => {
                                        const isLowStock = (Number(item.quantity) || 0) <= (Number(item.threshold) || 0);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-black">{(index + 1).toString().padStart(2, '0')}</td>
                                                <td className="px-6 py-4 font-bold text-xs text-black">{item.item_code || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-black uppercase text-xs flex items-center gap-2">
                                                        {item.item_name}
                                                        {item.online_store ? <Globe size={12} className="text-blue-500" /> : <EyeOff size={12} className="text-black" />}
                                                    </div>
                                                    <div className="text-[9px] text-black font-black">{item.category}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs tracking-tighter">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase
                                                        ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                        {isLowStock ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                                        {item.quantity} {item.unit}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-xs text-black">₹{item.price}</div>
                                                    <div className="text-[9px] font-bold text-black">{item.gst_rate}% ({item.sales_tax_inc})</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => openEdit(item)} className="p-2 bg-slate-100 text-black rounded-lg hover:bg-[rgba(0,100,55,0.1)] transition-colors"><Edit3 size={14} /></button>
                                                        <button onClick={() => deleteItem(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL (Original UI Preserved) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h2 className="text-lg font-black uppercase tracking-widest text-black">Product Master</h2>
                            <button onClick={() => setShowModal(false)} className="text-black hover:text-red-500 transition-all"><X size={24} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">

                                <div className="md:col-span-3 flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                                    <input
                                        type="checkbox" name="online_store" id="online_store"
                                        checked={formData.online_store} onChange={handleInput}
                                        className="w-5 h-5 accent-[rgb(0,100,55)] rounded cursor-pointer"
                                    />
                                    <label htmlFor="online_store" className="text-xs font-black uppercase tracking-wide text-black cursor-pointer flex items-center gap-2">
                                        <Globe size={14} className="text-blue-500" /> Sync with Online Store Storefront
                                    </label>
                                </div>

                                <div className="md:col-span-3 border-b border-slate-100 pb-2"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Info size={12} /> Product Identity</h3></div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Name*</label>
                                    <input name="item_name" value={formData.item_name} onChange={handleInput} placeholder="Enter Product Name" className="w-full border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition font-bold text-lg text-black" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Code / SKU</label>
                                    <input name="item_code" value={formData.item_code} onChange={handleInput} placeholder="SKU001" className="w-full border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition text-black font-mono" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Category</label>
                                    <input name="category" value={formData.category} onChange={handleInput} placeholder="e.g. Groceries" className="w-full border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition text-black" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">HSN Code</label>
                                    <input name="hsn_code" value={formData.hsn_code} onChange={handleInput} placeholder="8-digit code" className="w-full border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition tracking-widest text-black" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Min Order Qty (MOQ)</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="number" name="min_order_quantity" value={formData.min_order_quantity} onChange={handleInput} placeholder="1" className="flex-1 border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition font-bold text-black" />
                                        <select name="moq_unit" value={formData.moq_unit} onChange={handleInput} className="border-b border-slate-200 py-2 outline-none bg-transparent font-bold text-black text-xs uppercase">
                                            <option value="pcs">pcs</option>
                                            <option value="kg">kg</option>
                                            <option value="gm">gm</option>
                                            <option value="pkt">pkt</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em]">Inventory & Units</h3></div>
                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Primary Unit</label>
                                        <select name="unit" value={formData.unit} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none bg-transparent font-bold text-black text-xs uppercase">
                                            <option value="pcs">pcs</option>
                                            <option value="kg">kg</option>
                                            <option value="gm">gm</option>
                                            <option value="pkt">pkt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Current Stock</label>
                                        <input type="number" name="quantity" value={formData.quantity} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-[rgb(0,100,55)] transition font-black text-black" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Threshold</label>
                                        <input type="number" name="threshold" value={formData.threshold} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-red-500 transition text-red-600 font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Alt Unit</label>
                                        <select name="alt_unit" value={formData.alt_unit} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none bg-transparent text-black font-bold text-xs uppercase">
                                            <option value="">None</option>
                                            <option value="pcs">pcs</option>
                                            <option value="kg">kg</option>
                                            <option value="gm">gm</option>
                                            <option value="pkt">pkt</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em]">Pricing & Taxation</h3></div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Purchase Price</label>
                                    <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none font-bold text-black" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Purchase Tax Mode</label>
                                    <TaxToggle value={formData.purchase_tax_inc} onSelect={(field, val) => handleInput({ target: { name: field, value: val, type: 'text' } })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">GST Rate (%)</label>
                                    <input type="number" name="gst_rate" value={formData.gst_rate} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none font-bold text-black" placeholder="18" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Purchase Price + GST</label>
                                    <div className="py-2 font-black text-slate-600 border-b border-slate-100 bg-slate-50/50 px-2 rounded">
                                        ₹ {calculatePurchaseWithTax()}
                                    </div>
                                </div>

                                <div className="md:col-span-2"></div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Sales Price</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none font-black text-black" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Sales Tax Mode</label>
                                    <div className="flex bg-slate-100 rounded-lg p-1 h-[42px] w-full border border-slate-200">
                                        {["Exclusive", "Inclusive"].map((mode) => (
                                            <button
                                                key={mode} onClick={() => handleInput({ target: { name: "sales_tax_inc", value: mode, type: "text" } })}
                                                type="button"
                                                className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                                                ${formData.sales_tax_inc === mode ? "text-white shadow-sm" : "text-black"}`}
                                                style={formData.sales_tax_inc === mode ? { backgroundColor: BRAND_COLOR } : {}}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">MRP</label>
                                    <input type="number" name="mrp" value={formData.mrp} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none font-black text-black bg-slate-50" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-[11px] uppercase tracking-widest text-black hover:text-slate-600 transition-all">Discard</button>
                            <button onClick={saveItem} disabled={loading} className="flex-[2] py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all active:scale-95 disabled:bg-slate-300" style={{ backgroundColor: BRAND_COLOR }}>
                                {loading ? 'Saving...' : 'Finalize & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CentralStockMaster;