import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft, Plus, Trash2, Edit3, X,
    Search, Package, AlertTriangle, Calendar, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";

function StockUpdate() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const BRAND_COLOR = "rgb(0, 100, 55)";

    // Data State
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [stockSort, setStockSort] = useState(null); // null | 'asc' | 'desc'
    const [loading, setLoading] = useState(false);

    // Form/UI State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const initialForm = {
        item_name: "", quantity: 0, unit: "pcs", price: 0,
        description: "", category: "", alt_unit: "", item_code: "",
        hsn_code: "", gst_rate: 0, sales_tax_inc: "Exclusive",
        purchase_price: 0, purchase_tax_inc: "Exclusive",
        mrp: 0, threshold: 10, item_type: "Product"
    };
    const [formData, setFormData] = useState(initialForm);

    const fetchItems = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("stocks")
            .select("*")
            .order("item_name", { ascending: true });
        setItems(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchItems(); }, []);

    const dynamicCategories = useMemo(() => {
        const uniqueCats = [...new Set(items.map(item => item.category).filter(Boolean))];
        return ["All", ...uniqueCats.sort()];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch =
                item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
            const isLowStock = item.quantity <= (item.threshold || 0);

            if (showLowStockOnly) return matchesSearch && matchesCategory && isLowStock;
            return matchesSearch && matchesCategory;
        });

        // Apply Sorting
        if (stockSort) {
            result.sort((a, b) => {
                return stockSort === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
            });
        }

        return result;
    }, [items, searchTerm, selectedCategory, showLowStockOnly, stockSort]);

    const lowStockCount = items.filter(i => i.quantity <= (i.threshold || 0)).length;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (checked ? "Inclusive" : "Exclusive") : value
        }));
    };

    const openAdd = () => {
        setEditingId(null);
        setFormData(initialForm);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setFormData(item);
        setShowModal(true);
    };

    const saveItem = async () => {
        if (!formData.item_name) return alert("Item Name is required");
        setLoading(true);
        const payload = {
            ...formData,
            quantity: Number(formData.quantity),
            threshold: Number(formData.threshold)
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

    const todayStr = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-black pb-24 md:pb-0">
            {/* HEADER */}
            <div className="bg-white border-b sticky top-0 z-30 px-4 md:px-8 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-black">
                    <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
                        <ArrowLeft size={16} /> Back
                    </button>

                    <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black text-center absolute left-1/2 -translate-x-1/2 w-full md:w-auto md:static md:translate-x-0 pointer-events-none md:pointer-events-auto">
                        Stock <span className="hidden md:inline">Manager</span>
                    </h1>

                    <div className="flex items-center">
                        <span className="text-[10px] md:text-xs font-black text-black uppercase bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                            ID: {user?.franchise_id || "Global"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">

                {/* ACTIONS BAR */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
                    <div className="flex flex-col gap-3 flex-1">
                        {/* Search and Date - Mobile: Stacked, Desktop: Row */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 md:py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-black transition-all text-black font-bold text-sm"
                                />
                            </div>

                            <div className="hidden md:flex items-center gap-2 text-black bg-white px-4 py-3 border-2 border-slate-200 rounded-2xl shadow-sm min-w-[170px]">
                                <Calendar size={18} style={{ color: BRAND_COLOR }} />
                                <span className="text-xs font-black whitespace-nowrap">{todayStr}</span>
                            </div>
                        </div>

                        {/* Filters - Scrollable on Mobile */}
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            <div className="flex md:hidden items-center gap-2 text-black bg-white px-3 py-2.5 border-2 border-slate-200 rounded-xl shadow-sm whitespace-nowrap">
                                <Calendar size={16} style={{ color: BRAND_COLOR }} />
                                <span className="text-[10px] font-black">{todayStr}</span>
                            </div>

                            <button
                                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black border-2 transition-all whitespace-nowrap flex-shrink-0 ${showLowStockOnly ? "bg-rose-50 border-rose-600" : "bg-white border-slate-200"
                                    }`}
                            >
                                <AlertTriangle size={16} className={showLowStockOnly ? "text-rose-600" : "text-black"} />
                                <span className={`text-[10px] uppercase tracking-widest ${showLowStockOnly ? "text-rose-600" : "text-slate-400"}`}>Low Stock</span>
                                {lowStockCount > 0 && (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ml-1 ${showLowStockOnly ? "bg-rose-600 text-white border-rose-600" : "bg-slate-100 text-black border-slate-200"
                                        }`}>
                                        {lowStockCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setStockSort(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc')}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black border-2 transition-all whitespace-nowrap flex-shrink-0 ${stockSort ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "bg-white border-slate-200 text-black"
                                    }`}
                            >
                                {stockSort === 'asc' ? <ArrowUp size={16} /> : stockSort === 'desc' ? <ArrowDown size={16} /> : <ArrowUpDown size={16} />}
                                <span className="text-[10px] uppercase tracking-widest">Stock Level</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={openAdd}
                        className="text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all w-full md:w-auto sticky bottom-24 md:static z-20 md:z-0"
                        style={{ backgroundColor: BRAND_COLOR }}
                    >
                        <Plus size={20} /> <span className="md:hidden">Add New Item</span><span className="hidden md:inline">Add Item</span>
                    </button>
                </div>

                {/* CATEGORY FILTER */}
                <div className="mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {dynamicCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black border-2 transition-all whitespace-nowrap flex-shrink-0 ${selectedCategory === cat ? "text-white border-transparent" : "bg-white text-black border-slate-200"
                                    }`}
                                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- MOBILE CARD VIEW (md:hidden) --- */}
                <div className="md:hidden space-y-4 mb-20">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Inventory Items</h2>
                        <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {filteredItems.length} Total
                        </span>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold text-sm bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-3">
                            <Package size={32} className="opacity-20" />
                            <span>No items found matching your filters.</span>
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 active:scale-[0.98] transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.category || "General"}</span>
                                            {item.item_code && <span className="text-[10px] font-mono text-slate-400 italic">#{item.item_code}</span>}
                                        </div>
                                        <h3 className="text-sm font-black uppercase text-black leading-tight">{item.item_name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-black">₹{item.price}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Per {item.unit}</div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 w-full" />

                                <div className="flex items-center justify-between">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${item.quantity <= (item.threshold || 0)
                                        ? "bg-rose-50 text-rose-600 border-rose-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}>
                                        {item.quantity <= (item.threshold || 0) ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                        {item.quantity} {item.unit} Available
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="p-2 bg-white text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>


                {/* --- DESKTOP TABLE VIEW (hidden md:block) --- */}
                <div className="hidden md:flex bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden flex-col">
                    <div className="px-8 py-5 border-b-2 border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: BRAND_COLOR }}></div>
                            <h2 className="font-black text-xs uppercase tracking-[0.2em] text-black">Inventory Master</h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Items:</span>
                            <span className="text-xs font-black text-black uppercase bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                                <Package size={14} className="text-black" />
                                {filteredItems.length}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-slate-100 bg-slate-50">
                                    <th className="px-8 py-5">S.No</th>
                                    <th className="px-6 py-5">Item Name</th>
                                    <th className="px-6 py-5">Item Code</th>
                                    <th className="px-6 py-5">Price</th>
                                    <th className="px-6 py-5">Stock Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                                            No items found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 text-xs font-black text-black">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-black text-black text-sm uppercase">{item.item_name}</div>
                                                <div className="text-[10px] text-black font-bold uppercase opacity-60">{item.category || "General"}</div>
                                            </td>
                                            <td className="px-6 py-5 font-black text-black font-mono text-xs italic">
                                                {item.item_code || "---"}
                                            </td>
                                            <td className="px-6 py-5 font-black text-black text-sm">₹{item.price}</td>
                                            <td className="px-6 py-5">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${item.quantity <= (item.threshold || 0)
                                                    ? "bg-rose-50 text-rose-600 border-rose-600 animate-pulse"
                                                    : "bg-white text-black border-black"
                                                    }`}>
                                                    {item.quantity <= (item.threshold || 0) ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                                    {item.quantity} {item.unit}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEdit(item)} className="px-4 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
                                                        UPDATE
                                                    </button>
                                                    <button onClick={() => deleteItem(item.id)} className="p-2.5 bg-white text-rose-600 border-2 border-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in duration-150">
                        <div className="bg-white w-full max-w-4xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:max-h-[90vh] md:h-auto border-t-4 md:border-4 border-black">
                            <div className="bg-black p-4 md:p-6 text-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="md:w-6 md:h-6" />
                                    <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">{editingId ? "Update Product" : "New Entry"}</h2>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:opacity-60 transition bg-white/10 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="p-6 md:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-black pb-24 md:pb-8">

                                {/* --- Reordered for Quick Update --- */}
                                <div className="md:col-span-3 border-b-2 border-black pb-2 text-black font-black uppercase tracking-widest text-xs">Quick Update</div>
                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                                    <div className="col-span-1 md:col-span-1">
                                        <label className="text-[10px] uppercase opacity-70">Current Stock *</label>
                                        <div className="flex items-center gap-3 mt-1">
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleInputChange}
                                                autoFocus
                                                className="w-full flex-1 bg-white border-2 border-black rounded-xl py-3 px-4 outline-none focus:ring-4 ring-black/10 font-black text-3xl transition-all"
                                            />
                                            <div className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 flex flex-col items-center justify-center min-w-[80px]">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Unit</span>
                                                <span className="text-lg font-black uppercase text-black">{formData.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Alert Limit</label>
                                        <input
                                            type="number"
                                            name="threshold"
                                            value={formData.threshold}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border-b-2 border-slate-200 py-4 outline-none focus:border-black font-black text-xl text-rose-600"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-3 border-b-2 border-black pb-2 text-black font-black uppercase tracking-widest text-xs mt-2">Product Details</div>
                                <div className="md:col-span-2 space-y-4 font-black">
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Item Name *</label>
                                        <input name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black transition-all font-black text-lg uppercase" placeholder="E.g. COFFEE BEANS" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Description</label>
                                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black text-sm font-bold" rows="2" placeholder="Brief description..." />
                                    </div>
                                </div>
                                <div className="space-y-4 font-black">
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Category</label>
                                        <input name="category" value={formData.category} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" placeholder="E.g. RAW MATERIAL" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Item Type</label>
                                        <select name="item_type" value={formData.item_type} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none bg-transparent font-black uppercase">
                                            <option value="Product">Product</option>
                                            <option value="Service">Service</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-3 border-b-2 border-black pb-2 mt-2 font-black uppercase tracking-widest text-xs">Technical Specs</div>
                                <div className="font-black">
                                    <label className="text-[10px] uppercase opacity-70">Item Code</label>
                                    <input name="item_code" value={formData.item_code} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" placeholder="CODE-001" />
                                </div>
                                <div className="font-black">
                                    <label className="text-[10px] uppercase opacity-70">Unit</label>
                                    <select name="unit" value={formData.unit} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none bg-transparent font-black">
                                        <option value="pcs">pcs</option><option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option><option value="ml">ml</option>
                                    </select>
                                </div>

                                <div className="md:col-span-3 border-b-2 border-black pb-2 mt-4 font-black uppercase tracking-widest text-xs">Pricing Strategy (Editable)</div>
                                <div className="space-y-4 font-black">
                                    <div>
                                        <label className="text-[10px] uppercase opacity-70">Sales Price</label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="sales_tax_inc" checked={formData.sales_tax_inc === "Inclusive"} onChange={handleInputChange} className="accent-black w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase">Tax Inclusive</span>
                                    </label>
                                </div>
                                <div className="font-black">
                                    <label className="text-[10px] uppercase opacity-70">GST (%)</label>
                                    <input type="number" name="gst_rate" value={formData.gst_rate} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
                                </div>
                                <div className="font-black">
                                    <label className="text-[10px] uppercase opacity-70">MRP</label>
                                    <input type="number" name="mrp" value={formData.mrp} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
                                </div>
                            </div>

                            <div className="p-4 md:p-8 bg-slate-50 border-t-2 border-black flex gap-4 shrink-0 absolute bottom-0 left-0 w-full md:relative">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-black hover:bg-white border-2 border-black rounded-2xl transition-all">Cancel</button>
                                <button onClick={saveItem} className="flex-[2] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all" style={{ backgroundColor: BRAND_COLOR }}>
                                    {loading ? "Processing..." : editingId ? "Update Item" : "Finalize & Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default StockUpdate;