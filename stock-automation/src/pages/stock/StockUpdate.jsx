import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Plus, Trash2, Edit3, X,
  Search, Package, AlertTriangle, Calendar, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight
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

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchItems();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stocks")
      .select("*")
      .order("item_name", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  const dynamicCategories = useMemo(() => {
    const uniqueCats = [...new Set(items.map(item => item.category).filter(Boolean))];
    return ["All", ...uniqueCats.sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch =
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const isLowStock = item.quantity <= (item.threshold || 0);

      if (showLowStockOnly) return matchesSearch && matchesCategory && isLowStock;
      return matchesSearch && matchesCategory;
    });

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
    <div className="min-h-screen bg-[#f8fafc] font-sans text-black pb-20">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className={`max-w-7xl mx-auto flex justify-between items-center text-black ${isMobile ? 'px-4 py-4' : 'px-8 py-5'}`}>
          <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black">
            <ArrowLeft size={18} /> {!isMobile && "Back"}
          </button>

          <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black uppercase tracking-widest text-black`}>Stock Hub</h1>

          <div className="flex items-center gap-2">
            {!isMobile && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise:</span>}
            <span className="text-[10px] md:text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {user?.franchise_id || "Global"}
            </span>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
        {/* ACTIONS BAR */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black opacity-40" size={18} />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-black font-bold uppercase text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black border-2 transition-all ${showLowStockOnly ? "bg-rose-50 border-rose-600 text-rose-600" : "bg-white border-slate-200 text-slate-400"}`}
              >
                <AlertTriangle size={16} />
                <span className="text-[10px] uppercase">{isMobile ? lowStockCount : `Low: ${lowStockCount}`}</span>
              </button>

              <button
                onClick={() => setStockSort(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black border-2 transition-all ${stockSort ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "bg-white border-slate-200 text-black"}`}
              >
                {stockSort === 'asc' ? <ArrowUp size={16} /> : stockSort === 'desc' ? <ArrowDown size={16} /> : <ArrowUpDown size={16} />}
                <span className="text-[10px] uppercase">Sort</span>
              </button>
            </div>
          </div>

          <button
            onClick={openAdd}
            className="text-white w-full lg:w-auto px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <Plus size={20} /> Add Item
          </button>
        </div>

        {/* CATEGORY FILTER */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all whitespace-nowrap uppercase ${selectedCategory === cat ? "text-white border-transparent" : "bg-white text-black border-slate-200"}`}
              style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* DATA SECTION */}
        {isMobile ? (
          /* MOBILE CARD LIST */
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ID: {item.item_code || '---'}</p>
                    <h3 className="font-black text-sm uppercase text-black leading-tight">{item.item_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.category || "General"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg">₹{item.price}</p>
                    <span className="text-[8px] font-black opacity-30 uppercase">{item.unit}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black border ${item.quantity <= (item.threshold || 0) ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {item.quantity} {item.unit}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="p-2.5 bg-black text-white rounded-xl"><Edit3 size={16} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-2.5 border-2 border-rose-100 text-rose-600 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ORIGINAL DESKTOP TABLE */
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
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
                    <td className="px-8 py-5 text-xs font-black text-black">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="px-6 py-5">
                      <div className="font-black text-black text-sm uppercase">{item.item_name}</div>
                      <div className="text-[10px] text-black font-bold uppercase opacity-60">{item.category || "General"}</div>
                    </td>
                    <td className="px-6 py-5 font-black text-black font-mono text-xs italic">{item.item_code || "---"}</td>
                    <td className="px-6 py-5 font-black text-black text-sm">₹{item.price}</td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border-2 ${item.quantity <= (item.threshold || 0) ? "bg-rose-50 text-rose-600 border-rose-600 animate-pulse" : "bg-white text-black border-black"}`}>
                        {item.quantity <= (item.threshold || 0) ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                        {item.quantity} {item.unit}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="px-4 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">UPDATE</button>
                        <button onClick={() => deleteItem(item.id)} className="p-2.5 bg-white text-rose-600 border-2 border-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
          <div className={`bg-white shadow-2xl flex flex-col border-black ${isMobile ? 'w-full h-full' : 'w-full max-w-4xl rounded-[2.5rem] max-h-[90vh] border-4'}`}>
            <div className="bg-black p-6 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Package size={24} />
                <h2 className="text-lg font-black uppercase tracking-tight">{editingId ? "Update Product" : "New Entry"}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:opacity-60 transition"><X size={24} /></button>
            </div>

            <div className={`p-6 md:p-8 overflow-y-auto flex-1 grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <div className="md:col-span-3 border-b-2 border-black pb-1 text-black font-black uppercase tracking-widest text-[10px]">Quick Inventory</div>
              <div className="md:col-span-3 grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[9px] uppercase font-black opacity-40">Current Qty *</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full bg-white border-2 border-black rounded-xl py-3 px-4 outline-none font-black text-2xl" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black opacity-40">Alert Threshold</label>
                  <input type="number" name="threshold" value={formData.threshold} onChange={handleInputChange} className="w-full bg-white border-2 border-rose-600 rounded-xl py-3 px-4 outline-none font-black text-2xl text-rose-600" />
                </div>
              </div>

              <div className="md:col-span-3 border-b-2 border-black pb-1 font-black uppercase tracking-widest text-[10px]">General Info</div>
              <div className="md:col-span-2 space-y-4">
                <div><label className="text-[9px] uppercase font-black opacity-40">Item Name</label><input name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black uppercase" /></div>
                <div><label className="text-[9px] uppercase font-black opacity-40">Category</label><input name="category" value={formData.category} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black uppercase" /></div>
              </div>
              <div className="space-y-4">
                <div><label className="text-[9px] uppercase font-black opacity-40">Code</label><input name="item_code" value={formData.item_code} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none focus:border-black font-black" /></div>
                <div><label className="text-[9px] uppercase font-black opacity-40">Unit</label>
                  <select name="unit" value={formData.unit} onChange={handleInputChange} className="w-full border-b-2 border-slate-200 py-2 outline-none bg-transparent font-black uppercase">
                    <option value="pcs">pcs</option><option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option><option value="ml">ml</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={`p-6 bg-slate-50 border-t-2 border-black flex gap-3 ${isMobile ? 'pb-10' : ''}`}>
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-black border-2 border-black rounded-xl">Cancel</button>
              <button onClick={saveItem} disabled={loading} className="flex-[2] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl" style={{ backgroundColor: BRAND_COLOR }}>
                {loading ? "SAVING..." : "COMMIT CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Scroll Control */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default StockUpdate;