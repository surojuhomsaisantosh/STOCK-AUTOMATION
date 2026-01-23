import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Plus, Trash2, Edit3, X,
  Search, Package, AlertTriangle, Calendar, CheckCircle, Minus as FiMinus, Plus as FiPlus
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
  }, [items, searchTerm, selectedCategory, showLowStockOnly]);

  const lowStockCount = items.filter(i => i.quantity <= (i.threshold || 0)).length;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? "Inclusive" : "Exclusive") : value
    }));
  };

  const adjustStock = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(0, Number(prev.quantity || 0) + delta)
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
    <div className="min-h-screen bg-[#f8fafc] font-sans text-black">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-20 px-8 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-black">
          <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
            <ArrowLeft size={18} /> Back
          </button>

          <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black">Stock</h1>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>
            <span className="text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {user?.franchise_id || "Global"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">

        {/* ACTIONS BAR */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-5xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-black transition-all text-black font-bold"
              />
            </div>

            <div className="flex items-center gap-2 text-black bg-white px-4 py-3 border-2 border-slate-200 rounded-2xl shadow-sm min-w-[170px]">
              <Calendar size={18} style={{ color: BRAND_COLOR }} />
              <span className="text-xs font-black whitespace-nowrap">{todayStr}</span>
            </div>

            {/* UPDATED LOW STOCK BUTTON STYLE */}
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black border-2 transition-all ${showLowStockOnly ? "bg-rose-50 border-rose-600" : "bg-white border-slate-200"
                }`}
            >
              <AlertTriangle size={18} className={showLowStockOnly ? "text-rose-600" : "text-black"} />
              <span className={`text-[10px] uppercase tracking-widest ${showLowStockOnly ? "text-rose-600" : "text-slate-400"}`}>Low Stock:</span>
              <span className={`text-xs font-black px-3 py-1 rounded-lg border ${showLowStockOnly ? "bg-rose-600 text-white border-rose-600" : "bg-slate-100 text-black border-slate-200"
                }`}>
                {lowStockCount}
              </span>
            </button>
          </div>

          <button
            onClick={openAdd}
            className="text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <Plus size={20} /> Add Item
          </button>
        </div>

        {/* CATEGORY FILTER */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black border-2 transition-all whitespace-nowrap ${selectedCategory === cat ? "text-white border-transparent" : "bg-white text-black border-slate-200"
                  }`}
                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE SECTION (Desktop) */}
        <div className="hidden md:flex bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden flex-col">
          <div className="px-8 py-5 border-b-2 border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: BRAND_COLOR }}></div>
              <h2 className="font-black text-xs uppercase tracking-[0.2em] text-black">Inventory Master</h2>
            </div>

            {/* UPDATED TOTAL ITEMS PILL STYLE */}
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
                {filteredItems.map((item, index) => (
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
                        <button onClick={() => openEdit(item)} className="p-2.5 bg-white text-black border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-2.5 bg-white text-rose-600 border-2 border-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* MOBILE CARDS (Mobile) */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inventory List</span>
            <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-black">{filteredItems.length} ITEMS</span>
          </div>
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-sm uppercase text-black">{item.item_name}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.item_code || "No Code"}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-black">₹{item.price}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Per {item.unit}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-black text-slate-500">Stock Level</span>
                <div className={`flex items-center gap-2 text-xs font-black ${item.quantity <= (item.threshold || 0) ? "text-rose-600" : "text-black"}`}>
                  {item.quantity <= (item.threshold || 0) && <AlertTriangle size={12} />}
                  {item.quantity} {item.unit}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-black text-[10px] uppercase hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => deleteItem(item.id)} className="px-4 py-3 rounded-xl border-2 border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL REMAINS SAME */}
      {
        showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-black animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="bg-black p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-xl"><Package size={24} className="text-white" /></div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight leading-none">{editingId ? "Update Product" : "New Inventory Entry"}</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Stock Management Console</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="p-8 overflow-y-auto bg-[#F8FAFC]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* SECTION 1: CORE IDENTIFIERS */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-black"></span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Core Details</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Item Name <span className="text-rose-500">*</span></label>
                          <input name="item_name" value={formData.item_name} onChange={handleInputChange} placeholder="ENTER PRODUCT NAME" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-black text-lg text-black placeholder:text-slate-300 uppercase" />
                        </div>

                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Category</label>
                          <div className="relative">
                            <input name="category" value={formData.category} onChange={handleInputChange} placeholder="SELECT OR TYPE" list="categories" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-bold text-sm text-black uppercase" />
                            <datalist id="categories">
                              {dynamicCategories.filter(c => c !== "All").map(c => <option key={c} value={c} />)}
                            </datalist>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Item Type</label>
                          <select name="item_type" value={formData.item_type} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-bold text-sm text-black uppercase appearance-none cursor-pointer">
                            <option value="Product">Physical Product</option>
                            <option value="Service">Service / Labor</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Description</label>
                          <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="OPTIONAL DETAILS..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-bold text-sm text-black min-h-[80px]" />
                        </div>
                      </div>
                    </div>

                    {/* STOCK CONTROL */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Stock Contol</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Current Stock <span className="text-rose-500">*</span></label>
                          <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-xl overflow-hidden">
                            <button onClick={() => adjustStock(-1)} className="p-3 hover:bg-slate-200 text-black transition-colors"><FiMinus size={16} /></button>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full text-center bg-transparent outline-none font-black text-lg text-black" />
                            <button onClick={() => adjustStock(1)} className="p-3 hover:bg-slate-200 text-black transition-colors"><FiPlus size={16} /></button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Unit</label>
                          <select name="unit" value={formData.unit} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 outline-none focus:border-black transition-all font-bold text-sm text-black uppercase appearance-none cursor-pointer">
                            {["pcs", "kg", "g", "litre", "ml", "box", "meter"].map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 mb-1.5 block">Low Stock Alert</label>
                          <div className="relative">
                            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" size={16} />
                            <input type="number" name="threshold" value={formData.threshold} onChange={handleInputChange} className="w-full bg-rose-50 border-2 border-rose-100/50 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-rose-400 text-rose-700 font-black text-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: READ ONLY & CODES */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200 space-y-6 lg:h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Technical & Pricing</h3>
                      </div>

                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 mb-1.5 block">Item Code / SKU</label>
                        <div className="relative">
                          <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input name="item_code" value={formData.item_code} onChange={handleInputChange} placeholder="AUTO-GEN IF EMPTY" className="w-full bg-white border-2 border-slate-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-black transition-all font-mono font-bold text-sm text-black uppercase" />
                        </div>
                      </div>

                      {/* READ ONLY PRICING BLOCKS */}
                      <div className="space-y-3 pt-4 border-t-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Managed by Central Admin</p>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 opacity-70">
                          <label className="text-[9px] font-black uppercase text-slate-400">Base Price</label>
                          <p className="text-xl font-black text-black">₹{formData.price}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 opacity-70">
                          <div className="flex justify-between items-center">
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400">GST Rate</label>
                              <p className="text-lg font-black text-black">{formData.gst_rate}%</p>
                            </div>
                            <div className="text-right">
                              <label className="text-[9px] font-black uppercase text-slate-400">Type</label>
                              <p className="text-xs font-black text-black uppercase">{formData.sales_tax_inc || 'Exclusive'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-200 p-4 rounded-2xl border border-slate-300 opacity-70">
                          <label className="text-[9px] font-black uppercase text-slate-500">MRP (Max Retail Price)</label>
                          <p className="text-xl font-black text-slate-600">₹{formData.mrp}</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              <div className="p-6 bg-white border-t-2 border-slate-100 flex gap-4 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-black hover:bg-slate-50 border-2 border-slate-200 rounded-2xl transition-all">Cancel Adjustment</button>
                <button onClick={saveItem} className="flex-[2] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:opacity-90 flex items-center justify-center gap-3" style={{ backgroundColor: BRAND_COLOR }}>
                  <CheckCircle size={18} />
                  {loading ? "Saving..." : editingId ? "Save Changes" : "Add to Inventory"}
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