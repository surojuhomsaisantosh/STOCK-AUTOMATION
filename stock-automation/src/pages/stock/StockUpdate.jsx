import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Plus, Trash2, Edit3, X, 
  Search, Package, AlertTriangle, Calendar, CheckCircle, Layers
} from "lucide-react";

function StockUpdate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const BRAND_COLOR = "rgb(0, 100, 55)"; // YOUR BRAND COLOR

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

  // Pull Categories
  const dynamicCategories = useMemo(() => {
    const uniqueCats = [...new Set(items.map(item => item.category).filter(Boolean))];
    return ["All", ...uniqueCats.sort()];
  }, [items]);

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

  // Filter Logic
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
      <div className="bg-white border-b sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-black">
          <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-2 font-bold hover:opacity-70 transition">
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">Stock Inventory</h1>
          <div className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
            ID: {user?.franchise_id || "Global"}
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

            {/* DATE SECTION */}
            <div className="flex items-center gap-2 text-black bg-white px-4 py-3 border-2 border-slate-200 rounded-2xl shadow-sm min-w-[170px]">
              <Calendar size={18} style={{ color: BRAND_COLOR }} />
              <span className="text-xs font-black whitespace-nowrap">{todayStr}</span>
            </div>

            <button 
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-black border-2 transition-all ${
                showLowStockOnly ? "bg-rose-600 text-white border-rose-600" : "bg-white text-black border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <span className="text-xs">Low Stock</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${showLowStockOnly ? "bg-white text-rose-600" : "bg-black text-white"}`}>
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
                className={`px-5 py-2.5 rounded-xl text-xs font-black border-2 transition-all whitespace-nowrap ${
                  selectedCategory === cat ? "text-white border-transparent" : "bg-white text-black border-slate-200"
                }`}
                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-5 border-b-2 border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: BRAND_COLOR }}></div>
              <h2 className="font-black text-xs uppercase tracking-[0.2em] text-black">Inventory Master</h2>
            </div>
            {/* TOTAL ITEMS BOX */}
            <div className="flex items-center gap-2 bg-black px-4 py-1.5 rounded-full">
                <Package size={14} className="text-white" />
                <span className="text-[10px] font-black uppercase text-slate-300">Total Items:</span>
                <span className="text-xs font-black text-white">{filteredItems.length}</span>
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
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${
                        item.quantity <= (item.threshold || 0) 
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
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-black">
            <div className="bg-black p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Package size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">{editingId ? "Update Product" : "New Inventory Entry"}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:opacity-60 transition"><X size={24}/></button>
            </div>

            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* SECTION HEADINGS */}
              <div className="md:col-span-3 border-b-2 border-black pb-2 text-black font-black uppercase tracking-widest text-xs">General Information</div>
              <div className="md:col-span-2 space-y-4 text-black font-black">
                <div>
                  <label className="text-[10px] uppercase opacity-70">Item Name *</label>
                  <input name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black transition-all font-black text-lg uppercase" />
                </div>
                <div>
                  <label className="text-[10px] uppercase opacity-70">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black text-sm font-bold" rows="2" />
                </div>
              </div>
              <div className="space-y-4 text-black font-black">
                <div>
                  <label className="text-[10px] uppercase opacity-70">Category</label>
                  <input name="category" value={formData.category} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
                </div>
                <div>
                  <label className="text-[10px] uppercase opacity-70">Item Type</label>
                  <select name="item_type" value={formData.item_type} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none bg-transparent font-black uppercase">
                    <option value="Product">Product</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-3 border-b-2 border-black pb-2 mt-4 text-black font-black uppercase tracking-widest text-xs">Stock & Compliance</div>
              <div className="text-black font-black">
                <label className="text-[10px] uppercase opacity-70">Item Code</label>
                <input name="item_code" value={formData.item_code} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
              </div>
              <div className="text-black font-black">
                <label className="text-[10px] uppercase opacity-70">Unit</label>
                <select name="unit" value={formData.unit} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none bg-transparent font-black">
                  <option value="pcs">pcs</option><option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option><option value="ml">ml</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-black font-black">
                <div>
                    <label className="text-[10px] uppercase opacity-70">Stock *</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" />
                </div>
                <div>
                    <label className="text-[10px] uppercase opacity-70">Alert Limit</label>
                    <input type="number" name="threshold" value={formData.threshold} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black text-rose-600" />
                </div>
              </div>

              <div className="md:col-span-3 border-b-2 border-black pb-2 mt-4 text-black font-black uppercase tracking-widest text-xs">Pricing Strategy (View Only)</div>
              <div className="space-y-4 text-black font-black opacity-60">
                <div>
                  <label className="text-[10px] uppercase">Sales Price</label>
                  <input type="number" name="price" value={formData.price} disabled className="w-full border-b-2 border-slate-200 py-2 outline-none bg-slate-50 font-black cursor-not-allowed" />
                </div>
                <label className="flex items-center gap-2 cursor-not-allowed">
                   <input type="checkbox" name="sales_tax_inc" checked={formData.sales_tax_inc === "Inclusive"} disabled className="accent-black" />
                   <span className="text-[10px] font-black uppercase">Tax Inclusive</span>
                </label>
              </div>
              <div className="text-black font-black opacity-60">
                <label className="text-[10px] uppercase">GST (%)</label>
                <input type="number" value={formData.gst_rate} disabled className="w-full border-b-2 border-slate-200 py-2 outline-none bg-slate-50 font-black cursor-not-allowed" />
              </div>
              <div className="text-black font-black opacity-60">
                <label className="text-[10px] uppercase">MRP</label>
                <input type="number" value={formData.mrp} disabled className="w-full border-b-2 border-slate-200 py-2 outline-none bg-slate-50 font-black cursor-not-allowed" />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t-2 border-black flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-black hover:bg-white border-2 border-black rounded-2xl transition-all">Cancel</button>
              <button onClick={saveItem} className="flex-[2] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all" style={{ backgroundColor: BRAND_COLOR }}>
                {loading ? "Processing..." : editingId ? "Update Item" : "Finalize & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockUpdate;