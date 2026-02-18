import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Edit2, Trash2, X, Users, RefreshCw, Layers, Filter, AlertCircle
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

// --- THEME ---
const BRAND_COLOR = "#065f46";

// --- UTILITY STYLES (Injected for Scrollbar Hiding) ---
const CustomStyles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const CentralVendors = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [franchiseId, setFranchiseId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    phone: "",
    address: "",
    gst: ""
  });

  // --- LIFECYCLE ---
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (franchiseId) {
      fetchVendors();
    }
  }, [franchiseId]);

  // --- DATA FETCHING ---
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Security Check: Redirect if no user
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('franchise_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setFranchiseId(profile?.franchise_id || "CENTRAL");
    } catch (err) {
      console.error("User fetch error:", err);
      setError("Failed to load user profile.");
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error("Fetch Error:", err.message);
      setError("Could not load vendors. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: "", category: "", phone: "", address: "", gst: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingId(vendor.id);
    setFormData({
      name: vendor.name,
      category: vendor.category || "",
      phone: vendor.phone,
      address: vendor.address || "",
      gst: vendor.gst || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setFormData({ ...formData, phone: val });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!franchiseId) return alert("System Error: Franchise ID missing.");

    if (formData.phone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        gst: formData.gst.trim().toUpperCase(),
        franchise_id: franchiseId
      };

      if (!payload.name || !payload.phone) {
        throw new Error("Name and Phone are required.");
      }

      if (editingId) {
        const { error } = await supabase
          .from('vendors')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = (phone) => {
    if (!phone) return alert("No phone number available");
    let cleanNumber = phone.replace(/[^0-9]/g, '');

    // Fix iOS missing country code issue 
    // Usually required for API links to format correctly. Assuming India (+91) if 10 digits
    if (cleanNumber.length === 10) {
      cleanNumber = "91" + cleanNumber;
    }

    // api.whatsapp.com is more universally reliable on iOS webviews/Safari than wa.me
    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // --- MEMOIZED DATA ---
  const uniqueCategories = useMemo(() => {
    if (!vendors) return ["All"];
    const cats = new Set(vendors.map(v => v.category).filter(c => c && c.trim() !== ""));
    return ["All", ...Array.from(cats).sort()];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const vendorCat = v.category || "";

      // 1. Category Filter
      if (selectedCategory !== "All" && vendorCat !== selectedCategory) return false;

      // 2. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchText = v.name.toLowerCase().includes(searchLower) ||
        vendorCat.toLowerCase().includes(searchLower) ||
        (v.phone && v.phone.includes(searchTerm));
      if (!matchText) return false;

      return true;
    });
  }, [vendors, searchTerm, selectedCategory]);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-black overflow-hidden relative">
      <CustomStyles />

      {/* --- HEADER --- */}
      <div className="flex-none bg-white shadow-sm z-30 pt-safe-top">
        <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
          <div className="w-full flex items-center justify-between gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base flex-shrink-0">
              <ArrowLeft size={18} /> <span>Back</span>
            </button>
            <h1 className="text-xs md:text-2xl font-black uppercase text-black text-center flex-1 truncate px-2">
              Vendor <span style={{ color: BRAND_COLOR }}>List</span>
            </h1>

            <div className="flex items-center flex-shrink-0">
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-wider">ID :</span>
                <span className="text-[10px] md:text-sm font-bold text-slate-700 font-mono">
                  {franchiseId || "..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- SEARCH & ACTIONS --- */}
        <div className="w-full px-4 md:px-6 py-4 pb-0">
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#065f46] text-sm font-semibold shadow-sm transition-all"
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-end overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <button onClick={handleOpenAdd}
                className="h-[46px] text-white px-4 md:px-5 rounded-xl font-bold uppercase text-[10px] md:text-xs flex items-center gap-2 shadow-md flex-shrink-0 whitespace-nowrap transition-transform active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}>
                <span>Add Vendor</span>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-3 border-t border-slate-100 pt-3 no-scrollbar touch-pan-x">
            {uniqueCategories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1
                    ${selectedCategory === cat ? "text-white shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}>
                {selectedCategory === cat && <Layers size={12} />}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- CONTENT LIST --- */}
      <div className="flex-grow overflow-hidden relative bg-slate-50">
        <div className="absolute inset-0 overflow-y-auto px-4 md:px-6 pb-24 pt-2 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 animate-pulse">
              <RefreshCw className="animate-spin" size={32} />
              <span className="text-xs font-bold uppercase tracking-wider">Syncing Vendors...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-3">
              <AlertCircle size={32} />
              <span className="text-sm font-bold">{error}</span>
              <button onClick={fetchVendors} className="text-xs underline">Try Again</button>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <div className="bg-slate-100 p-4 rounded-full">
                <Filter size={32} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">No vendors found</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-[#065f46]/30 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold flex-shrink-0 text-sm">
                        {vendor.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm text-black truncate" title={vendor.name}>{vendor.name}</div>
                        <div className="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-500 font-bold uppercase mt-1 truncate max-w-full">
                          {vendor.category || "No Category"}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => openWhatsApp(vendor.phone)} className="p-2 bg-[#25D366] text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity flex-shrink-0 flex items-center justify-center w-[36px] h-[36px]">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-t border-slate-50 pt-3 mt-auto">
                    <span className="text-slate-400 uppercase truncate mr-2">Contact: {vendor.phone}</span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(vendor)} className="p-2 text-slate-600 hover:text-[#065f46] hover:bg-slate-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(vendor.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

          {/* Content */}
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-black uppercase tracking-widest text-black flex items-center gap-2 text-sm md:text-base">
                <Users size={18} />
                {editingId ? "Edit Vendor" : "Add New Vendor"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-black">
                <X size={20} />
              </button>
            </div>
            {/* Made form scrollable in case it exceeds screen height on mobile */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh] no-scrollbar">
              <div>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vendor Name*"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] font-bold text-sm transition-all"
                />
              </div>
              <div>
                <input
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Category (e.g. Tea Powder)"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] text-sm transition-all"
                />
              </div>
              <div>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  placeholder="Mobile Number (10 digits)*"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] font-mono text-sm transition-all"
                />
              </div>

              {/* NEW OPTIONAL FIELDS */}
              <div>
                <input
                  value={formData.gst}
                  onChange={e => setFormData({ ...formData, gst: e.target.value })}
                  placeholder="Vendor GST (Optional)"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] text-sm transition-all uppercase"
                />
              </div>
              <div>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address (Optional)"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] text-sm transition-all resize-none h-24"
                />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-4 text-white font-black uppercase rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:bg-slate-300 disabled:scale-100 disabled:shadow-none mt-2 text-sm tracking-wide" style={{ backgroundColor: BRAND_COLOR }}>
                {submitting ? 'Saving...' : 'Save Vendor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralVendors;