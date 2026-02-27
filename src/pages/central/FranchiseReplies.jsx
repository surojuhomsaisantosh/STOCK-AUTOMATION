import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiCheckCircle, FiClock, FiList, FiX, FiInbox
} from "react-icons/fi";
import { ArrowLeft, Search, Calendar, RotateCcw } from "lucide-react";

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

  // Filter States
  const [isRange, setIsRange] = useState(false);
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    fetchProfile();
    fetchRequests();

    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_requests',
        },
        (payload) => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        setProfile(data);
      }
    } catch (e) {
      console.error("Profile fetch error", e);
    }
  };

  const fetchRequests = async () => {
    if (requests.length === 0) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("stock_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedRequests = useMemo(() => {
    const groups = {};
    if (!requests) return [];

    requests.forEach((req) => {
      if (!req.created_at) return;

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

    const previousRequests = [...requests];

    setRequests(prev => prev.map(req =>
      ids.includes(req.id) ? { ...req, status: newStatus } : req
    ));

    setSelectedItemIds([]);
    if (selectedGroup) setSelectedGroup(null);

    try {
      const { error } = await supabase
        .from("stock_requests")
        .update({ status: newStatus })
        .in("id", ids);

      if (error) throw error;

    } catch (err) {
      setRequests(previousRequests);
      alert("Failed to update status. Please try again.");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setIsRange(false);
    setSingleDate(new Date().toISOString().split('T')[0]);
    setDateRange({ start: "", end: "" });
    fetchRequests();
  };

  const filteredRequests = useMemo(() => {
    return groupedRequests.filter(req => {
      const matchesSearch = req.displayItems.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        req.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const reqDate = new Date(req.created_at).toISOString().split('T')[0];
      let matchesDate = true;

      if (isRange) {
        if (dateRange.start && dateRange.end) {
          matchesDate = reqDate >= dateRange.start && reqDate <= dateRange.end;
        }
      } else {
        if (singleDate) matchesDate = reqDate === singleDate;
      }
      return matchesSearch && matchesDate;
    });
  }, [groupedRequests, searchTerm, isRange, singleDate, dateRange]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-black relative selection:bg-black selection:text-white pb-20">
      {/* MODAL */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b-2 border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest">Manage Items</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Franchise: {selectedGroup.franchise_id}</p>
              </div>
              <button onClick={() => { setSelectedGroup(null); setSelectedItemIds([]); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FiX size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-2">
              {selectedGroup.displayItems.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedItemIds.includes(item.id) ? 'border-black bg-slate-50' : 'border-transparent bg-slate-50'}`}>
                  <label className="flex items-center gap-4 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      disabled={item.status === 'fulfilled'}
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="w-5 h-5 rounded border-2 border-slate-300 checked:bg-black accent-black cursor-pointer disabled:opacity-20 shrink-0 transition-all"
                    />
                    <span className={`text-xs font-black uppercase truncate ${item.status === 'fulfilled' ? 'text-slate-300 line-through' : 'text-black'}`}>
                      {item.name}
                    </span>
                  </label>
                  {item.status === 'fulfilled' && (
                    <button
                      onClick={() => updateItemStatus([item.id], 'pending')}
                      className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all"
                      title="Undo Fulfillment"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t-2 border-slate-100 pb-10 sm:pb-6">
              <button
                onClick={() => updateItemStatus(selectedItemIds, 'fulfilled')}
                disabled={selectedItemIds.length === 0}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-black/20 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
              >
                Mark Selected as Fulfilled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:text-black/70 transition-colors">
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden text-black">Stock Requests</h1>
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">ID:</span>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">{profile?.franchise_id || "CENTRAL"}</span>
            </div>
          </div>
        </div>
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Stock <span style={{ color: BRAND_COLOR }}>Requests</span></h1>
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{profile?.franchise_id || "CENTRAL"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6 md:mt-8">

        {/* ---- UPDATED TOOLBAR (GRID LAYOUT) ---- */}
        <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">

          {/* 1. Search Bar (Flex Grow) */}
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 h-12 md:h-14 border-2 border-slate-200 hover:border-black transition-colors w-full lg:flex-1">
            <Search size={18} className="text-black shrink-0" />
            <input
              placeholder="SEARCH BY ITEM OR FRANCHISE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] md:text-xs font-black w-full placeholder:text-slate-300 text-black uppercase"
            />
          </div>

          {/* 2. Controls Grid */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

            {/* A. Date Toggle */}
            <div className="bg-slate-100 p-1 rounded-2xl flex shrink-0 h-12 md:h-14 items-center w-full sm:w-auto">
              <button
                onClick={() => setIsRange(false)}
                className={`flex-1 sm:flex-none px-4 h-full rounded-xl text-[9px] font-black uppercase transition-all ${!isRange ? "bg-white shadow-sm text-black" : "text-slate-400 hover:text-slate-600"}`}
              >
                Single
              </button>
              <button
                onClick={() => setIsRange(true)}
                className={`flex-1 sm:flex-none px-4 h-full rounded-xl text-[9px] font-black uppercase transition-all ${isRange ? "bg-white shadow-sm text-black" : "text-slate-400 hover:text-slate-600"}`}
              >
                Range
              </button>
            </div>

            {/* B. Date Inputs (Moved BEFORE Reset) */}
            <div className="flex items-center gap-2 h-12 md:h-14 bg-white border-2 border-slate-200 rounded-2xl px-4 flex-1 min-w-[200px] hover:border-black transition-colors">
              <Calendar size={18} className="text-black shrink-0" />
              {!isRange ? (
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black outline-none cursor-pointer uppercase w-full text-center tracking-wider text-black"
                />
              ) : (
                <div className="flex items-center gap-1 w-full justify-center">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase tracking-tighter text-black text-center"
                  />
                  <span className="text-[9px] font-black text-slate-300">-</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="bg-transparent text-[9px] font-black outline-none w-full min-w-0 uppercase tracking-tighter text-black text-center"
                  />
                </div>
              )}
            </div>

            {/* C. Reset Button (Moved AFTER Date Inputs) */}
            <button
              onClick={resetFilters}
              className="h-12 md:h-14 w-12 md:w-14 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-2xl border border-slate-200 transition-all active:scale-95 shrink-0"
              title="Reset Filters"
            >
              <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>

          </div>
        </div>
        {/* ---- END TOOLBAR ---- */}

        {/* LOADING & EMPTY STATES */}
        {loading && requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <RotateCcw className="animate-spin" size={30} />
            <p className="text-[10px] font-black uppercase tracking-widest">Loading Requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
            <FiInbox size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest">No Requests Found</p>
            <button onClick={resetFilters} className="text-black underline text-[10px] font-bold uppercase">Clear Filters</button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block border-2 border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-sm mb-10">
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
                            <FiList className="group-hover:scale-110 transition-transform" />
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
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-2 ${isAllFulfilled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                            {isAllFulfilled ? <FiCheckCircle /> : <FiClock />}
                            {isAllFulfilled ? "Fulfilled" : "Pending"}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          {!isAllFulfilled ? (
                            <button onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'fulfilled')} className="bg-black text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all shadow-lg shadow-black/10 active:scale-95">Fulfill All</button>
                          ) : (
                            <button onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'pending')} className="text-rose-600 bg-rose-50 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto hover:bg-rose-100 transition-colors active:scale-95"><RotateCcw size={14} /> Undo All</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="lg:hidden flex flex-col gap-4 mb-20">
              {filteredRequests.map((req, index) => {
                const isAllFulfilled = req.displayItems.every(i => i.status === 'fulfilled');
                return (
                  <div key={index} className="bg-white border-2 border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-1">REQ #{(index + 1).toString().padStart(2, '0')}</span>
                        <span className="text-sm font-black uppercase">{req.franchise_id || "GENERAL"}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{req.user_name || "N/A"}</span>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-2 ${isAllFulfilled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                        {isAllFulfilled ? <FiCheckCircle /> : <FiClock />}
                        {isAllFulfilled ? "Fulfilled" : "Pending"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y-2 border-slate-50">
                      <div>
                        <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Requested Date</p>
                        <p className="text-[10px] font-black uppercase">{new Date(req.created_at).toLocaleDateString('en-GB')}</p>
                        <p className="text-[9px] font-bold text-slate-400">{new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Item Count</p>
                        <button onClick={() => setSelectedGroup(req)} className="bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-2 border border-slate-200">
                          <FiList size={12} /> {req.displayItems.length} ITEMS
                        </button>
                      </div>
                    </div>

                    <div className="w-full">
                      {!isAllFulfilled ? (
                        <button
                          onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'fulfilled')}
                          className="w-full bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-black/10"
                        >
                          Fulfill All Items
                        </button>
                      ) : (
                        <button
                          onClick={() => updateItemStatus(req.displayItems.map(i => i.id), 'pending')}
                          className="w-full text-rose-600 bg-rose-50 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-rose-100"
                        >
                          <RotateCcw size={14} /> Undo Fulfillment
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FranchiseReplies;