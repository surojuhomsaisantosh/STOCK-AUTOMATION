import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
    ChevronDown, Package, Edit3, Trash2, X, Plus, Search, 
    Calendar, ArrowLeft
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
    const [profile, setProfile] = useState({ franchise_id: "..." });
    const [editingId, setEditingId] = useState(null);

    const initialForm = {
        item_name: "", quantity: "0", unit: "pcs", price: "0",
        description: "", category: "", alt_unit: "", item_code: "",
        hsn_code: "", gst_rate: "0", sales_tax_inc: "Exclusive", 
        purchase_price: "0", purchase_tax_inc: "Exclusive", 
        mrp: "0", threshold: "10", item_type: "Product"
    };
    const [formData, setFormData] = useState(initialForm);

    // --- OPTIMIZED CATEGORIES (Memoized for speed) ---
    const categories = useMemo(() => {
        return ["All", ...new Set(items.map(item => item.category || "Uncategorized"))];
    }, [items]);

    // --- FETCH DATA (Optimized for speed & quantity) ---
    useEffect(() => {
        const getInitialData = async () => {
            setLoading(true);
            
            // Parallel execution for faster load
            const [profileRes, stocksRes] = await Promise.all([
                user ? supabase.from('profiles').select('franchise_id').eq('id', user.id).single() : Promise.resolve({ data: null }),
                supabase.from("stocks")
                    .select("*")
                    .order("item_name", { ascending: true }) // Alphabetical usually loads "feel" faster
                    .range(0, 999) // Force load up to 1000 items immediately
            ]);

            if (profileRes.data) setProfile(profileRes.data);
            if (stocksRes.data) {
                setItems(stocksRes.data);
                setFilteredItems(stocksRes.data);
            }
            setLoading(false);
        };
        getInitialData();
    }, [user]);

    // --- SEARCH & FILTER LOGIC (Instant Response) ---
    useEffect(() => {
        const term = searchTerm.toLowerCase();
        let results = items;

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
        setFilteredItems(results);
    }, [searchTerm, selectedCategory, items]);

    // --- ACTIONS ---
    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === "checkbox") {
            setFormData(prev => ({ ...prev, [name]: checked ? "Inclusive" : "Exclusive" }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const saveItem = async () => {
        if (!formData.item_name) return alert("Item Name is mandatory!");
        setLoading(true);
        const payload = { ...formData, 
            quantity: Number(formData.quantity) || 0, price: Number(formData.price) || 0,
            gst_rate: Number(formData.gst_rate) || 0, purchase_price: Number(formData.purchase_price) || 0,
            mrp: Number(formData.mrp) || 0, threshold: Number(formData.threshold) || 0,
            unit: formData.unit || null, alt_unit: formData.alt_unit || null
        };

        const { error } = editingId 
            ? await supabase.from("stocks").update(payload).eq('id', editingId)
            : await supabase.from("stocks").insert([payload]);

        if (error) alert("Error: " + error.message);
        else { 
            setShowModal(false); 
            // Re-fetch only stocks to keep UI snappy
            const { data } = await supabase.from("stocks").select("*").range(0, 999);
            if (data) setItems(data);
        }
        setLoading(false);
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Delete item permanently?")) return;
        await supabase.from("stocks").delete().eq("id", id);
        setItems(prev => prev.filter(i => i.id !== id)); // Instant UI update
    };

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
            
            {/* --- TOP FIXED SECTION --- */}
            <div className="flex-none bg-white shadow-sm z-30">
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <button onClick={() => navigate("/dashboard/central")} className="flex items-center gap-2 text-slate-500 hover:text-black font-bold transition">
                            <ArrowLeft size={18} /> Back
                        </button>
                        <h1 className="text-2xl font-black uppercase text-black text-center flex-1">
                            Central <span style={{ color: BRAND_COLOR }}>Stock Management</span>
                        </h1>
                        <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 text-sm font-bold">
                            <span className="text-slate-400 uppercase text-[10px] mr-2">Franchise ID</span>{profile.franchise_id}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" placeholder={`Search ${items.length} items...`} value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-2 text-slate-500 bg-slate-50 px-5 py-3 border border-slate-200 rounded-xl">
                                <Calendar size={18} style={{ color: BRAND_COLOR }} />
                                <span className="text-sm font-bold">{today}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl">
                                <Package size={18} className="text-slate-400" />
                                <span className="text-lg font-black">{items.length}</span>
                            </div>
                            <button onClick={() => {setEditingId(null); setFormData(initialForm); setShowModal(true);}} 
                                className="text-white px-8 py-3.5 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg active:scale-95"
                                style={{ backgroundColor: BRAND_COLOR }}>
                                <Plus size={18} /> Add Item
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto mt-4 pb-2 no-scrollbar">
                        {categories.map((cat) => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap
                                ${selectedCategory === cat ? "text-white" : "bg-white text-slate-500 border-slate-200"}`}
                                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SCROLLABLE TABLE AREA --- */}
            <div className="flex-grow overflow-hidden px-6 pb-6 mt-2">
                <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="overflow-auto h-full">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-slate-100">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-slate-200">S.No</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Code</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Item Name</th>
                                    <th className="px-6 py-4 border-b border-slate-200">HSN</th>
                                    <th className="px-6 py-4 border-b border-slate-200">Price/GST</th>
                                    <th className="px-6 py-4 border-b border-slate-200 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{(index + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-6 py-4 font-bold text-xs">{item.item_code || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 uppercase text-xs">{item.item_name}</div>
                                            <div className="text-[9px] text-slate-400 font-black">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs tracking-tighter">{item.hsn_code || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-xs">₹{item.price}</div>
                                            <div className="text-[9px] font-bold" style={{color: BRAND_COLOR}}>{item.gst_rate}% ({item.sales_tax_inc})</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openEdit(item)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Edit3 size={14}/></button>
                                                <button onClick={() => deleteItem(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {loading && (
                            <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Loading Items...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL - Simplified Grid */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-black p-6 text-white flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase tracking-widest">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => setShowModal(false)} className="hover:text-red-500 transition-all"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                                <div className="md:col-span-3 border-b border-slate-100 pb-2"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em]">General Information</h3></div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Item Name*</label>
                                    <input name="item_name" value={formData.item_name} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition font-bold" />
                                </div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Item Code</label><input name="item_code" value={formData.item_code} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div>
                                <div className="md:col-span-3"><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Description</label><input name="description" value={formData.description} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label><input name="category" value={formData.category} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Item Type</label><select name="item_type" value={formData.item_type} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none bg-transparent font-medium"><option value="Product">Product</option><option value="Service">Service</option></select></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">HSN Code</label><input name="hsn_code" value={formData.hsn_code} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition tracking-widest" /></div>
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em]">Inventory & Units</h3></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Unit</label><select name="unit" value={formData.unit} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none bg-transparent font-bold"><option value="">None</option><option value="pcs">pcs</option><option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option><option value="bulk">Bulk</option></select></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Alternate Unit</label><select name="alt_unit" value={formData.alt_unit} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none bg-transparent"><option value="">None</option><option value="pcs">pcs</option><option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option><option value="bulk">Bulk</option></select></div>
                                <div className="grid grid-cols-2 gap-4 col-span-1"><div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stock</label><input type="number" name="quantity" value={formData.quantity} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div><div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Limit</label><input type="number" name="threshold" value={formData.threshold} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div></div>
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em]">Pricing & Tax</h3></div>
                                <div className="md:col-span-2 flex items-end gap-6"><div className="flex-1"><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sales Price</label><input type="number" name="price" value={formData.price} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition font-bold" /></div><label className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase cursor-pointer text-slate-600 hover:text-black"><input type="checkbox" name="sales_tax_inc" checked={formData.sales_tax_inc === "Inclusive"} onChange={handleInput} className="accent-black w-4 h-4" /> {formData.sales_tax_inc}</label></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">MRP</label><input type="number" name="mrp" value={formData.mrp} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div>
                                <div className="md:col-span-2 flex items-end gap-6"><div className="flex-1"><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Purchase Price</label><input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition" /></div><label className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase cursor-pointer text-slate-600 hover:text-black"><input type="checkbox" name="purchase_tax_inc" checked={formData.purchase_tax_inc === "Inclusive"} onChange={handleInput} className="accent-black w-4 h-4" /> {formData.purchase_tax_inc}</label></div>
                                <div><label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">GST Rate (%)</label><input type="number" name="gst_rate" value={formData.gst_rate} onChange={handleInput} className="w-full border-b border-slate-200 py-2 outline-none focus:border-black transition font-bold" style={{ color: BRAND_COLOR }} /></div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Dismiss</button>
                            <button onClick={saveItem} disabled={loading} className="flex-[2] py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all active:scale-95 disabled:bg-slate-300" style={{ backgroundColor: BRAND_COLOR }}>
                                {loading ? 'Syncing...' : editingId ? 'Update Master' : 'Finalize & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CentralStockMaster;