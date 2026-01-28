import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import {
  ArrowLeft, Plus, Trash2, Edit2,
  Search, UtensilsCrossed, X, Calendar, ChevronRight
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const brandGreen = "rgb(0, 100, 55)";
  const dynamicCategories = ["ALL", ...new Set(menuItems.map(item => item.category.toUpperCase()))];
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ item_name: "", price: "", category: "GENERAL", is_active: true });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchMenu();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (profile?.franchise_id) {
        setFranchiseId(profile.franchise_id);
        const { data } = await supabase.from("menus").select("*").eq("franchise_id", profile.franchise_id).order("created_at", { ascending: false });
        setMenuItems(data || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, price: parseFloat(formData.price), category: formData.category.toUpperCase().trim(), franchise_id: franchiseId };
    if (editingId) await supabase.from("menus").update(payload).eq("id", editingId);
    else await supabase.from("menus").insert([payload]);
    setIsModalOpen(false); setEditingId(null); setFormData({ item_name: "", price: "", category: "GENERAL", is_active: true }); fetchMenu();
  };

  const deleteItem = async (id) => {
    if (window.confirm("Delete item?")) { await supabase.from("menus").delete().eq("id", id); fetchMenu(); }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category.toUpperCase() === selectedCategory;
    return searchQuery.length > 0 ? matchesSearch : matchesCategory;
  });

  return (
    <div className="min-h-screen w-full bg-white p-4 md:p-12 font-sans text-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 md:mb-16">
          <button onClick={() => navigate("/franchise/settings")} className="font-black text-xs uppercase flex items-center gap-2" style={{ color: brandGreen }}><ArrowLeft size={18} /> BACK</button>
          <div className="text-center">
            <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tighter">Manage Menu</h1>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.3em]">{franchiseId}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 border border-black rounded-xl text-[10px] font-black">ID: {franchiseId}</div>
        </div>

        <div className="bg-white border border-black rounded-2xl md:rounded-3xl mb-8 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-[2] flex items-center px-6 py-4 md:py-6 border-b md:border-b-0 md:border-r border-black/10">
            <Search size={20} className="opacity-20 mr-3" /><input type="text" placeholder="SEARCH..." className="w-full outline-none font-black uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => { setIsModalOpen(true); setEditingId(null); }} className="p-4 md:px-10 text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all" style={{ backgroundColor: brandGreen }}>+ ADD ITEM</button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {dynamicCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${selectedCategory === cat ? 'bg-black text-white border-black' : 'bg-white border-black/10'}`}>{cat}</button>
          ))}
        </div>

        {isMobile ? (
          <div className="space-y-4 pb-20">
            {loading ? <div className="text-center py-10 animate-pulse font-black">SYNCING...</div> :
              filteredItems.map((item) => (
                <div key={item.id} className="border border-black/10 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-black uppercase">{item.item_name}</p>
                    <p className="text-[10px] font-bold opacity-30 uppercase">{item.category}</p>
                    <p className="text-emerald-700 font-black text-sm mt-2">₹{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="p-2 border border-black rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 border border-rose-600 rounded-lg text-rose-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-black overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead><tr style={{ backgroundColor: brandGreen }} className="text-white text-[11px] font-black uppercase tracking-widest"><th className="px-8 py-6">S/N</th><th className="px-8 py-6">Item Description</th><th className="px-8 py-6">Price</th><th className="px-8 py-6 text-center">Manage</th></tr></thead>
              <tbody className="divide-y divide-black/5">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-6 font-black text-xs">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6"><p className="text-lg font-black uppercase tracking-tighter">{item.item_name}</p><p className="text-[10px] font-bold opacity-30 uppercase">{item.category}</p></td>
                    <td className="px-8 py-6 font-mono font-black text-base">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-8 py-6 flex justify-center gap-3"><button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="px-4 py-2 border border-black rounded-xl text-[10px] font-black hover:bg-black hover:text-white transition-all">EDIT</button><button onClick={() => deleteItem(item.id)} className="px-4 py-2 border border-rose-600/20 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all">DELETE</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[32px] md:rounded-[40px] w-full max-w-lg shadow-2xl border border-black overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black uppercase">{editingId ? 'Edit' : 'New'} Item</h2><button onClick={() => setIsModalOpen(false)}><X size={28} /></button></div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div><label className="text-[10px] font-black uppercase opacity-40 mb-2 block">Item Name</label><input required type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} className="w-full px-5 py-4 rounded-xl border border-black font-black uppercase outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase opacity-40 mb-2 block">Price (₹)</label><input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-5 py-4 rounded-xl border border-black font-black outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase opacity-40 mb-2 block">Category</label><input required type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-5 py-4 rounded-xl border border-black font-black uppercase outline-none" /></div>
                </div>
                <button type="submit" className="w-full py-5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all" style={{ backgroundColor: brandGreen }}>{editingId ? 'UPDATE' : 'PUBLISH'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default FranchiseMenu;