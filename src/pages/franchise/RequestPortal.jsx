import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiRefreshCw,
  FiCheckCircle, FiClock, FiList, FiX, FiPackage, FiAlertCircle, FiChevronRight,
  FiPlus
} from "react-icons/fi";
import { headerStyles } from "../../utils/headerStyles";

const BRAND_GREEN = "rgb(0, 100, 55)";

const RequestPortal = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState(null);

  // Viewing Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);

  // --- NEW: Add Request Modal State ---
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date Filters
  const [isRange, setIsRange] = useState(false);
  const [singleDate, setSingleDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const todayDisplay = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    fetchProfile();
    fetchMyRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        setProfile(data);
      }
    } catch (e) { console.error(e) }
  };

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("stock_requests")
        .select("*")
        .eq('user_id', user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Submit Request Handler ---
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("stock_requests")
        .insert([{
          user_id: user.id,
          franchise_id: profile?.franchise_id || "UNKNOWN",
          item_name: newItemName.trim(),
          status: "pending"
        }]);

      if (error) throw error;

      setNewItemName("");
      setIsNewRequestOpen(false);
      fetchMyRequests(); // Refresh the list immediately
    } catch (error) {
      console.error("Error submitting request:", error.message);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setIsRange(false);
    setSingleDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    setDateRange({ start: "", end: "" });
    fetchMyRequests();
  };

  // Grouping Logic
  const groupedRequests = useMemo(() => {
    const groups = {};
    requests.forEach((req) => {
      const dateObj = new Date(req.created_at);
      const minuteKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}-${dateObj.getHours()}-${dateObj.getMinutes()}`;

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

  const filteredRequests = useMemo(() => {
    return groupedRequests.filter(req => {
      const matchesSearch = req.displayItems.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const reqDate = new Date(req.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

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
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-black relative pb-20">

      {/* --- NEW HEADER INTEGRATED --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <FiArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            My <span style={{ color: BRAND_GREEN }}>Requests</span>
          </h1>

          <div style={styles.idBox}>
            ID : {profile?.franchise_id || "---"}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* --- TOOLBAR --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-6 items-center">

          {/* 1. Search Bar */}
          <div className="xl:col-span-5 relative h-12 md:h-14">
            <FiSearch className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              placeholder="SEARCH ITEMS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-12 md:pl-14 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-xs md:text-sm font-black outline-none focus:border-[rgb(0,100,55)] transition-all uppercase shadow-sm placeholder:text-slate-300"
            />
          </div>

          {/* 2. Filters & Actions */}
          <div className="xl:col-span-7 h-12 md:h-14 flex items-center justify-end gap-2 md:gap-3 overflow-x-auto no-scrollbar min-w-0">

            {/* Date Display Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-white px-5 h-full rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase whitespace-nowrap shadow-sm shrink-0 text-slate-500">
              <FiCalendar size={16} className="text-[rgb(0,100,55)]" /> {todayDisplay}
            </div>

            {/* Controls Container (Toggle + Inputs) */}
            <div className="flex flex-1 xl:flex-none items-center justify-between gap-2 bg-white p-1.5 h-full rounded-2xl border-2 border-slate-100 shadow-sm min-w-max">
              <div className="flex items-center h-full bg-slate-50 rounded-xl p-1 shrink-0">
                <button onClick={() => setIsRange(false)} className={`h-full px-3 md:px-4 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${!isRange ? "bg-[rgb(0,100,55)] text-white shadow-sm" : "text-slate-400 hover:text-[rgb(0,100,55)]"}`}>
                  Single
                </button>
                <button onClick={() => setIsRange(true)} className={`h-full px-3 md:px-4 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${isRange ? "bg-[rgb(0,100,55)] text-white shadow-sm" : "text-slate-400 hover:text-[rgb(0,100,55)]"}`}>
                  Range
                </button>
              </div>

              <div className="flex items-center px-1 lg:px-2 h-full flex-grow justify-center border-l border-slate-100 ml-1">
                {!isRange ? (
                  <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[10px] md:text-xs font-black outline-none cursor-pointer uppercase text-center w-28 md:w-32 h-full" />
                ) : (
                  <div className="flex items-center gap-1 md:gap-2 h-full">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-transparent text-[10px] md:text-xs font-black outline-none w-20 md:w-24 uppercase h-full text-center" />
                    <span className="text-[10px] text-slate-300">-</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-transparent text-[10px] md:text-xs font-black outline-none w-20 md:w-24 uppercase h-full text-center" />
                  </div>
                )}
              </div>
            </div>

            {/* Reset Button */}
            <button onClick={resetFilters} className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center bg-white border-2 border-slate-100 text-slate-500 rounded-xl hover:text-black transition-all active:scale-95 flex-shrink-0 shadow-sm">
              <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>

            {/* NEW: Add Request Button */}
            <button onClick={() => setIsNewRequestOpen(true)} className="h-10 px-4 md:h-12 md:px-6 flex items-center justify-center gap-2 bg-[rgb(0,100,55)] text-white rounded-xl hover:opacity-90 transition-all active:scale-95 flex-shrink-0 shadow-md whitespace-nowrap">
              <FiPlus size={18} /> <span className="text-[10px] md:text-xs font-black uppercase">New Request</span>
            </button>

          </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

          <div className="hidden md:grid grid-cols-5 p-5 border-b border-slate-100 bg-slate-50 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-slate-500">
            <div className="col-span-1 pl-4">S.No</div>
            <div className="col-span-1">Franchise ID</div>
            <div className="col-span-1">Items</div>
            <div className="col-span-1 text-center">Date & Time</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0,100,55)]"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Loading Requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <FiSearch size={40} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Requests Found</p>
              </div>
            ) : filteredRequests.map((req, index) => {
              const isAllFulfilled = req.displayItems.every(i => i.status === 'fulfilled');
              const isPartial = !isAllFulfilled && req.displayItems.some(i => i.status === 'fulfilled');

              return (
                <div key={index} className="group hover:bg-slate-50 transition-colors p-4 md:p-5 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 md:gap-4">

                  <div className="flex justify-between items-start md:hidden mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase">#{index + 1}</span>
                      <span className="text-xs font-black text-black">{req.franchise_id || "N/A"}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 border ${isAllFulfilled ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      isPartial ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                      {isAllFulfilled ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                      {isAllFulfilled ? "Done" : "Pending"}
                    </span>
                  </div>

                  <div className="hidden md:block pl-4 text-xs font-black text-slate-400">{(index + 1).toString().padStart(2, '0')}</div>
                  <div className="hidden md:block"><span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-600 border border-slate-200">{req.franchise_id || "N/A"}</span></div>

                  <div className="md:col-span-1">
                    <button onClick={() => setSelectedGroup(req)} className="w-full md:w-auto bg-black text-white hover:opacity-80 px-4 py-3 md:py-2 rounded-xl transition-all flex items-center justify-between md:justify-start gap-3 shadow-sm active:scale-95">
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><FiList className="md:hidden lg:block" /> {req.displayItems.length} Items</span>
                      <FiChevronRight className="md:hidden" size={14} />
                    </button>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:justify-center md:items-center items-end border-t border-slate-50 pt-3 md:border-0 md:pt-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Created At</span>

                    <div className="text-right md:text-center">
                      <div className="text-[11px] font-black uppercase text-black md:text-slate-800">{new Date(req.created_at).toLocaleDateString('en-GB')}</div>
                      <div className="text-[10px] font-bold text-slate-400">{new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  <div className="hidden md:flex justify-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-2 border ${isAllFulfilled ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      isPartial ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                      {isAllFulfilled ? <FiCheckCircle /> : isPartial ? <FiRefreshCw /> : <FiClock />}
                      {isAllFulfilled ? "Completed" : isPartial ? "In Progress" : "Pending"}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- NEW: ADD REQUEST MODAL --- */}
      {isNewRequestOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsNewRequestOpen(false)} />

          <div className="relative bg-white w-full max-w-md rounded-t-[2rem] md:rounded-[2.5rem] border-t-2 md:border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">

            <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-black uppercase text-sm tracking-widest text-black flex items-center gap-2">
                <FiPlus className="text-[rgb(0,100,55)]" /> Raise New Request
              </h3>
              <button onClick={() => !isSubmitting && setIsNewRequestOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black bg-slate-50 md:bg-transparent">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 md:p-6 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Item / Request Details</label>
                <input
                  autoFocus
                  required
                  placeholder="e.g., Need 50 boxes of tea powder..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs md:text-sm font-bold outline-none focus:border-[rgb(0,100,55)] transition-colors placeholder:text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newItemName.trim()}
                className="w-full mt-2 bg-[rgb(0,100,55)] text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-md hover:opacity-90 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none text-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><FiRefreshCw className="animate-spin" size={16} /> Submitting...</>
                ) : (
                  <><FiCheckCircle size={16} /> Submit Request</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW REQUEST DETAILS MODAL --- */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedGroup(null)} />

          <div className="relative bg-white w-full max-w-md rounded-t-[2rem] md:rounded-[2.5rem] border-t-2 md:border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">

            <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest text-black">Request Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {new Date(selectedGroup.created_at).toLocaleDateString('en-GB')} • {new Date(selectedGroup.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black bg-slate-50 md:bg-transparent"><FiX size={20} /></button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {selectedGroup.displayItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FiPackage className="text-slate-400 shrink-0" />
                    <span className={`text-xs font-black uppercase leading-tight ${item.status === 'fulfilled' ? 'text-black' : 'text-slate-600'}`}>
                      {item.name}
                    </span>
                  </div>

                  <span className={`px-2 md:px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border shrink-0 ${item.status === 'fulfilled' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}>
                    {item.status === 'fulfilled' ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center shrink-0 safe-area-bottom">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center gap-2">
                <FiAlertCircle /> Contact Admin for inquiries
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 24px); }
      `}</style>
    </div>
  );
};

// --- STYLES ---
const styles = headerStyles;

export default RequestPortal;