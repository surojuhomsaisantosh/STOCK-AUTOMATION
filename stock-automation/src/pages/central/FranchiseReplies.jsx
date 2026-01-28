import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiRefreshCw, 
  FiCheckCircle, FiClock, FiList, FiX, FiRotateCcw 
} from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const FranchiseReplies = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState(null);
  
  // Modal & Selection States
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]); 
  
  const [isRange, setIsRange] = useState(false);
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const todayDisplay = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    fetchProfile();
    fetchRequests();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      setProfile(data);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedRequests = useMemo(() => {
    const groups = {};
    requests.forEach((req) => {
      const dateObj = new Date(req.created_at);
      const minuteKey = `${req.franchise_id}-${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}-${dateObj.getHours()}-${dateObj.getMinutes()}`;

      if (!groups[minuteKey]) {
        groups[minuteKey] = {
          ...req,
          displayItems: [{ id: req.id, name: req.item_name, status: req.status }],
        };
      } else {
        groups[minuteKey].displayItems.push({ id: req.id, name: req.item_name, status: req.status });
      }
    });
    return Object.values(groups);
  }, [requests]);

  const toggleItemSelection = (id) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const updateItemStatus = async (ids, newStatus) => {
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from("stock_requests")
        .update({ status: newStatus })
        .in("id", ids);

      if (error) throw error;
      
      setRequests(prev => prev.map(req => 
        ids.includes(req.id) ? { ...req, status: newStatus } : req
      ));
      
      setSelectedItemIds([]);
      if (selectedGroup) setSelectedGroup(null);
    } catch (err) {
      alert("Error updating status");
    }
  };

  // --- THIS WAS MISSING ---
  const resetFilters = () => {
    setSearchTerm("");
    setIsRange(false);
    setSingleDate(new Date().toISOString().split('T')[0]);
    setDateRange({ start: "", end: "" });
    fetchRequests();
  };
  // ------------------------

  const filteredRequests = useMemo(() => {
    return groupedRequests.filter(req => {
      const matchesSearch = req.displayItems.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            req.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const reqDate = new Date(req.created_at).toISOString().split('T')[0];
      let matchesDate = true;
      if (isRange) {
        if (dateRange.start && dateRange.end) matchesDate = reqDate >= dateRange.start && reqDate <= dateRange.end;
      } else {
        if (singleDate) matchesDate = reqDate === singleDate;
      }
      return matchesSearch && matchesDate;
    });
  }, [groupedRequests, searchTerm, isRange, singleDate, dateRange]);

  return (
    <div className="min-h-screen bg-white font-sans text-black relative">
      {/* MODAL */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b-2 border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest">Manage Items</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Franchise: {selectedGroup.franchise_id}</p>
              </div>
              <button onClick={() => {setSelectedGroup(null); setSelectedItemIds([]);}} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FiX size={20}/></button>
            </div>
            
            <div className="p-6 max-h-80 overflow-y-auto custom-scrollbar space-y-2">
              {selectedGroup.displayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-transparent">
                  <label className="flex items-center gap-4 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      disabled={item.status === 'fulfilled'}
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="w-5 h-5 rounded border-2 border-slate-300 checked:bg-black accent-black cursor-pointer disabled:opacity-20" 
                    />
                    <span className={`text-xs font-black uppercase ${item.status === 'fulfilled' ? 'text-slate-300 line-through' : 'text-black'}`}>
                      {item.name}
                    </span>
                  </label>
                  {item.status === 'fulfilled' && (
                    <button 
                      onClick={() => updateItemStatus([item.id], 'pending')}
                      className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all"
                      title="Undo Fulfillment"
                    >
                      <FiRotateCcw size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t-2 border-slate-100">
              <button 
                onClick={() => updateItemStatus(selectedItemIds, 'fulfilled')}
                disabled={selectedItemIds.length === 0}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-black/20 active:scale-95 transition-all disabled:opacity-30"
              >
                Mark Selected as Fulfilled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <nav className="border-b-2 border-slate-100 px-8 py-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:opacity-60 transition-all">
          <FiArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.3em] text-black text-center flex-1">Stock Requests</h1>
        <div className="flex items-center gap-2 font-black">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Franchise ID:</span>
          <span className="text-xs text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{profile?.franchise_id || "CENTRAL"}</span>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-8 mt-10">
        {/* TOOLBAR */}
        <div className="flex items-center gap-4 mb-8 w-full h-14">
          <div className="relative flex-1 h-full">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-black opacity-40" size={18} />
            <input placeholder="SEARCH BY ITEM OR FRANCHISE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-full pl-14 pr-6 bg-slate-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl text-xs font-black outline-none transition-all uppercase" />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-6 h-full rounded-2xl border-2 border-slate-100 font-black text-xs uppercase whitespace-nowrap">
            <FiCalendar size={16} className="text-slate-400" /> {todayDisplay}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 h-full rounded-2xl border-2 border-slate-100 whitespace-nowrap">
            <div className="flex items-center h-full border-r-2 border-slate-200 pr-1 mr-1">
              <button onClick={() => setIsRange(false)} className={`h-full px-4 rounded-xl text-[10px] font-black uppercase transition-all ${!isRange ? "bg-white shadow-sm text-black" : "text-slate-400"}`}>Single</button>
              <button onClick={() => setIsRange(true)} className={`h-full px-4 rounded-xl text-[10px] font-black uppercase transition-all ${isRange ? "bg-white shadow-sm text-black" : "text-slate-400"}`}>Range</button>
            </div>
            <div className="flex items-center px-3 gap-2 h-full">
              {!isRange ? (
                <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none cursor-pointer" />
              ) : (
                <div className="flex items-center gap-2">
                  <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-[10px] font-black outline-none w-28" />
                  <span className="text-[10px] font-black opacity-30">TO</span>
                  <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-[10px] font-black outline-none w-28" />
                </div>
              )}
            </div>
          </div>
          <button onClick={resetFilters} className="h-full aspect-square flex items-center justify-center bg-black text-white rounded-2xl hover:opacity-80 transition-all active:scale-95 flex-shrink-0 shadow-lg shadow-black/10">
            <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* TABLE */}
        <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm mb-10">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest w-20">S.No</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Company / Franchise</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Items Requested</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Date & Time</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-black">
              {filteredRequests.map((req, index) => {
                const isAllFulfilled = req.displayItems.every(i => i.status === 'fulfilled');
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-[10px] font-black text-slate-400">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase">{req.franchise_id || "GENERAL"}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{req.user_name || "N/A"}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <button onClick={() => setSelectedGroup(req)} className="bg-slate-100 hover:bg-black hover:text-white px-4 py-2 rounded-xl transition-all inline-flex items-center gap-2 group">
                        <FiList className="group-hover:scale-110 transition-transform"/>
                        <span className="text-[11px] font-black uppercase">{req.displayItems.length} Items</span>
                      </button>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black uppercase">{new Date(req.created_at).toLocaleDateString('en-GB')}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-2 ${
                        isAllFulfilled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {isAllFulfilled ? <FiCheckCircle /> : <FiClock />}
                        {isAllFulfilled ? "Fulfilled" : "Pending"}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {!isAllFulfilled ? (
                        <button 
                          onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'fulfilled')}
                          className="bg-black text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all shadow-lg shadow-black/10"
                        >
                          Fulfill All
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'pending')}
                          className="text-rose-600 bg-rose-50 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2 ml-auto"
                        >
                          <FiRotateCcw /> Undo All
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FranchiseReplies;