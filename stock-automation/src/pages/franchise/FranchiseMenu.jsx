import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Plus, Trash2, Edit2, 
  Search, Calendar, X, Filter, ChevronDown, ChevronUp 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function FranchiseMenu() {
  const navigate = useNavigate();
  const brandGreen = "rgb(0, 100, 55)";
  
  // State
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [franchiseId, setFranchiseId] = useState("Loading...");
  
  // Track which item is expanded on mobile
  const [expandedId, setExpandedId] = useState(null);
  
  // Initialize category from Session Storage or default to ALL
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return sessionStorage.getItem("franchise_menu_category") || "ALL";
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    price: "",
    category: "GENERAL",
    is_active: true
  });

  // Derived & Sorted Categories
  const dynamicCategories = ["ALL", ...[...new Set(menuItems.map(item => item.category.toUpperCase()))].sort()];

  // Filter Logic
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Effects ---

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    sessionStorage.setItem("franchise_menu_category", selectedCategory);
  }, [selectedCategory]);

  // --- Handlers ---

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      
      if (profile?.franchise_id) {
        setFranchiseId(profile.franchise_id);
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .eq("franchise_id", profile.franchise_id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setMenuItems(data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ 
        item_name: item.item_name, 
        price: item.price, 
        category: item.category, 
        is_active: item.is_active 
      });
    } else {
      setEditingId(null);
      setFormData({ item_name: "", price: "", category: "GENERAL", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        item_name: formData.item_name,
        price: parseFloat(formData.price),
        category: formData.category.toUpperCase().trim(),
        is_active: formData.is_active,
        franchise_id: franchiseId 
      };

      if (editingId) {
        await supabase.from("menus").update(payload).eq("id", editingId);
      } else {
        await supabase.from("menus").insert([payload]);
      }

      setIsModalOpen(false);
      fetchMenu();
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item? This cannot be undone.")) {
      await supabase.from("menus").delete().eq("id", id);
      fetchMenu();
    }
  };

  // Toggle function for mobile expansion
  const toggleItem = (id) => {
    if (expandedId === id) {
      setExpandedId(null); // Collapse if already open
    } else {
      setExpandedId(id); // Expand clicked item
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans p-3 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6">

        {/* --- ROW 1: HEADER --- */}
        <div className="flex flex-row items-center justify-between gap-2 md:gap-4 relative w-full">
          {/* Back Button: Added -ml-2 to pull it towards the left edge */}
          <div className="flex-none -ml-2 md:-ml-3">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-2 text-[10px] md:text-sm font-bold uppercase tracking-wider hover:bg-gray-200 rounded-lg transition-colors text-black border border-transparent hover:border-black/5"
              style={{ color: brandGreen }}
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" /> Back
            </button>
          </div>

          <div className="flex-1 text-center min-w-0">
            <h1 className="text-lg md:text-3xl font-black uppercase tracking-tight text-black truncate">Manage Menu</h1>
          </div>

          <div className="flex-none">
            <div className="bg-white border border-black/10 shadow-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-1 md:gap-2">
              <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-black/60">ID:</span>
              <span className="font-mono text-xs md:text-sm font-bold text-black">{franchiseId}</span>
            </div>
          </div>
        </div>

        {/* --- ROW 2: CONTROLS --- */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch mt-2">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-black group-focus-within:text-emerald-600 transition-colors" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 md:h-14 pl-10 md:pl-12 pr-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-medium text-black shadow-sm placeholder:text-black/40 uppercase tracking-wide text-sm md:text-base"
            />
          </div>

          <div className="hidden md:flex items-center gap-3 bg-white border border-black/10 px-6 rounded-xl shadow-sm min-w-fit">
            <Calendar className="text-black" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-black uppercase tracking-widest">Today</span>
              <span className="font-bold text-black text-sm">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <button 
            onClick={() => handleOpenModal()}
            className="h-12 md:h-14 px-6 md:px-8 rounded-xl text-white font-bold uppercase tracking-widest text-[10px] md:text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: brandGreen }}
          >
            <Plus size={18} strokeWidth={3} /> Add Item
          </button>
        </div>

        {/* --- ROW 3: CATEGORIES --- */}
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 md:px-6 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
                  selectedCategory === cat
                    ? 'text-white border-transparent shadow-md'
                    : 'bg-white text-black border-black/10 hover:border-black hover:text-black'
                }`}
                style={{ backgroundColor: selectedCategory === cat ? brandGreen : 'white' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- ROW 4: TOTAL ITEMS CARD (Small & Right Aligned) --- */}
        <div className="flex justify-end">
            <div className="inline-flex items-center gap-3 bg-white border border-black/10 rounded-lg px-4 py-2 shadow-sm">
               <span className="text-[10px] font-black text-black/50 uppercase tracking-widest">
                 {selectedCategory === 'ALL' ? 'Total Inventory' : `${selectedCategory}`}
               </span>
               <div className="w-px h-3 bg-black/10"></div>
               <span className="font-mono text-sm font-black text-black">
                 {filteredItems.length.toString().padStart(2, '0')}
               </span>
            </div>
        </div>

        {/* --- DATA DISPLAY --- */}
        <div className="bg-transparent md:bg-white md:rounded-xl md:border md:border-black/10 md:shadow-sm overflow-hidden flex flex-col">
          
          {/* DESKTOP VIEW: TABLE (Hidden on Mobile) */}
          <div className="hidden md:block w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: brandGreen }}>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-24 text-center border-r border-white/10">S/N</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] border-r border-white/10">Item Description</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-48 border-r border-white/10">Price (₹)</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-48 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr><td colSpan="4" className="py-20 text-center text-black font-medium animate-pulse uppercase tracking-widest">Loading...</td></tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-sm font-bold text-black text-center border-r border-black/5">{(index + 1).toString().padStart(2, '0')}</td>
                      <td className="px-6 py-5 border-r border-black/5">
                        <div className="flex flex-col">
                          <span className="font-bold text-black uppercase tracking-tight text-base">{item.item_name}</span>
                          <span className="text-[10px] font-bold text-black uppercase tracking-wider mt-1 bg-black/5 self-start px-2 py-0.5 rounded">{item.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 border-r border-black/5 font-mono font-bold text-black text-lg">₹{parseFloat(item.price).toFixed(2)}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-2 rounded-lg text-green-600 hover:bg-green-50"><Edit2 size={18} /></button>
                          <div className="w-px h-4 bg-black/10"></div>
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-24 text-center text-black font-bold uppercase tracking-widest opacity-50">No Items Found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW: EXPANDABLE LIST (Visible on Mobile) */}
          <div className="md:hidden flex flex-col gap-3">
            {loading ? (
               <div className="py-20 text-center text-black font-medium animate-pulse uppercase tracking-widest">Loading...</div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isExpanded = expandedId === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleItem(item.id)}
                    className={`bg-white border border-black/10 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-md ring-1 ring-black/5' : 'shadow-sm'}`}
                  >
                    {/* Header Row (Always Visible) */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* S/N Badge */}
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 text-[10px] font-black text-black/60">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                        
                        {/* Item Details */}
                        <div className="flex flex-col">
                          <span className="font-black text-black uppercase text-sm leading-tight">{item.item_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{item.category}</span>
                            <span className="w-1 h-1 rounded-full bg-black/20"></span>
                            <span className="font-mono font-bold text-black text-xs">₹{parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chevron Indicator */}
                      <div className="text-black/30">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {/* Expandable Action Row */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                          className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                          className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
               <div className="py-20 text-center text-black font-bold uppercase tracking-widest opacity-50">No Items Found</div>
            )}
          </div>
          
        </div>

      </div>

      {/* --- MODAL (Overlay) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-black/10 overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-5 md:px-8 md:py-6 border-b border-black/10 flex justify-between items-center" style={{ backgroundColor: brandGreen }}>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white">
                {editingId ? 'Edit Item' : 'New Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black">Item Name</label>
                <input required type="text" value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black uppercase" placeholder="e.g. Cheese Burger" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Price (₹)</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Category</label>
                  <input required type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black uppercase" placeholder="e.g. Sides" />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 md:py-4 rounded-xl text-white font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg" style={{ backgroundColor: brandGreen }}>
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseMenu;