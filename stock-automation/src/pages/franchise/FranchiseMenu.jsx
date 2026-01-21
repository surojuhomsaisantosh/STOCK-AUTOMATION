import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, Plus, Trash2, Edit2, 
  Search, UtensilsCrossed, X, Calendar 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function FranchiseMenu() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [franchiseId, setFranchiseId] = useState("...");
  
  const brandGreen = "rgb(0, 100, 55)";

  // Derived categories from fetched data
  const dynamicCategories = ["ALL", ...new Set(menuItems.map(item => item.category.toUpperCase()))];

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    price: "",
    category: "GENERAL",
    is_active: true
  });

  useEffect(() => {
    fetchMenu();
  }, []);

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
      setEditingId(null);
      setFormData({ item_name: "", price: "", category: "GENERAL", is_active: true });
      fetchMenu();
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Delete this item permanently?")) {
      await supabase.from("menus").delete().eq("id", id);
      fetchMenu();
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category.toUpperCase() === selectedCategory;
    return searchQuery.length > 0 ? matchesSearch : matchesCategory;
  });

  return (
    <div className="min-h-screen w-full bg-white p-6 md:p-12 font-sans antialiased text-black">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER AREA */}
        <div className="flex items-center justify-between mb-16">
          {/* UPDATED: Navigates specifically to settings and matches brandGreen styling */}
          <button 
            onClick={() => navigate("/franchise/settings")} 
            className="group flex items-center gap-3 text-[14px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-60"
            style={{ color: brandGreen }}
          >
            <ArrowLeft size={20} strokeWidth={3} /> BACK
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-black">MANAGE MENU</h1>
            <p className="text-[11px] font-bold text-black uppercase tracking-[0.4em] mt-3 opacity-40 text-center">STORE INVENTORY CONTROL</p>
          </div>

          <div className="hidden sm:flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-black shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">FRANCHISE ID</span>
            <span className="font-mono text-base font-black">{franchiseId}</span>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="bg-white border border-black rounded-3xl mb-12 flex flex-col lg:flex-row items-stretch overflow-hidden">
          <div className="relative flex-[2] w-full flex items-center px-8 py-6">
            <Search className="text-black mr-5 opacity-20" size={24} />
            <input 
              type="text" 
              placeholder="SEARCH CATALOG..." 
              className="w-full bg-transparent text-lg font-black focus:outline-none placeholder:text-black/30 text-black uppercase tracking-tight"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hidden lg:flex flex-1 items-center justify-center px-10 py-6 border-l border-black/10">
            <Calendar size={20} className="text-black mr-4 opacity-20"/>
            <p className="text-[13px] font-black text-black uppercase tracking-tighter">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="w-full lg:w-auto p-1.5 border-l border-black/10">
            <button 
              onClick={() => { setIsModalOpen(true); setEditingId(null); }} 
              className="w-full lg:w-auto flex items-center justify-center gap-4 px-10 py-4 rounded-2xl text-white font-black text-[12px] uppercase tracking-[0.2em] transition-all hover:brightness-125 active:scale-95" 
              style={{ backgroundColor: brandGreen }}
            >
              <Plus size={18} strokeWidth={4} /> ADD ITEM
            </button>
          </div>
        </div>

        {/* CATEGORY SECTION + GLOBAL TOTAL COUNT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar flex-1">
              {dynamicCategories.map((cat) => (
                  <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all border whitespace-nowrap ${
                      selectedCategory === cat 
                      ? 'text-white border-black bg-black' 
                      : 'bg-white text-black border-black/10 hover:border-black'
                  }`}
                  >
                  {cat}
                  </button>
              ))}
            </div>

            <div 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full shadow-sm self-start md:self-auto border border-black/10 shrink-0"
              style={{ backgroundColor: brandGreen }}
            >
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Total Items :</p>
                <p className="text-sm font-black text-white">{menuItems.length.toString().padStart(2, '0')}</p>
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-[32px] border border-black overflow-hidden mb-20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: brandGreen }}>
                <th className="px-10 py-7 text-[11px] font-black text-white uppercase tracking-[0.3em] w-24 text-center border-r border-white/10">S/N</th>
                <th className="px-8 py-7 text-[11px] font-black text-white uppercase tracking-[0.3em] border-r border-white/10">ITEM DESCRIPTION</th>
                <th className="px-8 py-7 text-[11px] font-black text-white uppercase tracking-[0.3em] border-r border-white/10">PRICE</th>
                <th className="px-10 py-7 text-[11px] font-black text-white uppercase tracking-[0.3em] text-center">MANAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan="4" className="py-32 text-center font-black text-black uppercase text-[12px] tracking-[0.6em] animate-pulse">SYNCING DATA...</td></tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="transition-all hover:bg-slate-50 text-black">
                    <td className="px-10 py-7 text-sm font-black text-black text-center border-r border-black/5">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-7 border-r border-black/5">
                      <p className="text-lg font-black uppercase tracking-tighter leading-tight">{item.item_name}</p>
                      <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">{item.category}</p>
                    </td>
                    <td className="px-8 py-7 font-mono text-base font-black border-r border-black/5">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-10 py-7">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => { 
                            setEditingId(item.id); 
                            setFormData({ item_name: item.item_name, price: item.price, category: item.category, is_active: item.is_active }); 
                            setIsModalOpen(true); 
                          }} 
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black hover:bg-black hover:text-white transition-all border border-black"
                        >
                          <Edit2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-wider">EDIT</span>
                        </button>
                        <button 
                          onClick={() => deleteItem(item.id)} 
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-600/20"
                        >
                          <Trash2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-wider">DELETE</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-40 text-center">
                    <UtensilsCrossed size={48} className="mx-auto mb-6 text-black opacity-10" />
                    <p className="font-black uppercase text-xs tracking-[0.4em] text-black opacity-20">NO RECORDS IDENTIFIED</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md transition-all text-black">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl border border-black overflow-hidden">
            <div className="p-10">
              <div className="flex justify-between items-center mb-12 border-b border-black/5 pb-8">
                <h2 className="text-3xl font-black uppercase tracking-tighter">{editingId ? 'EDIT ITEM' : 'NEW ITEM'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] block opacity-40">ITEM IDENTITY</label>
                  <input required type="text" value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-white border border-black focus:ring-4 focus:ring-black/5 outline-none font-black text-lg uppercase transition-all" placeholder="E.G. CLASSIC BURGER" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] block opacity-40">VALUE (₹)</label>
                    <input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-white border border-black focus:ring-4 focus:ring-black/5 outline-none font-black text-lg transition-all" placeholder="0.00" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] block opacity-40">CLASSIFICATION</label>
                    <input required type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-6 py-5 rounded-2xl bg-white border border-black focus:ring-4 focus:ring-black/5 outline-none font-black text-lg uppercase transition-all" placeholder="E.G. SIDES" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-8 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl transition-all hover:brightness-125 active:scale-[0.98]" style={{ backgroundColor: brandGreen }}>
                  {editingId ? 'CONFIRM CHANGES' : 'PUBLISH TO MENU'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseMenu;