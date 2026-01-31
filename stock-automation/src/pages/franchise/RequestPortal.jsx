import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiRefreshCw, 
  FiCheckCircle, FiClock, FiList, FiX, FiPackage, FiAlertCircle, FiChevronRight 
} from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const RequestPortal = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState(null);
  
  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Date Filters
  const [isRange, setIsRange] = useState(false);
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
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

  const resetFilters = () => {
    setSearchTerm("");
    setIsRange(false);
    setSingleDate(new Date().toISOString().split('T')[0]);
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
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-black relative pb-20">
      
      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
            {/* Back Button */}
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors">
                <FiArrowLeft size={18} /> <span>Back</span>
            </button>
            
            {/* Mobile Title */}
            <h1 className="text-base font-black uppercase tracking-widest text-center md:hidden">My Requests</h1>
            
            {/* Mobile ID Box */}
            <div className="flex items-center gap-2 md:hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID:</span>
                <span className="text-[10px] font-black text-black bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                    {profile?.franchise_id || "..."}
                </span>
            </div>
        </div>
        
        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2">
            My Requests
        </h1>
        
        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID :</span>
            <span className="text-xs font-black text-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                {profile?.franchise_id || "..."}
            </span>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6 md:mt-8">
        
        {/* TOOLBAR (Responsive Stack) */}
        {/* UPDATED HEIGHT to h-16 (lg:h-16) for bigger elements */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6 lg:h-16">
          
          {/* Search - INCREASED SIZE */}
          <div className="relative flex-1 h-16 lg:h-full">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input 
              placeholder="SEARCH ITEMS..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              // Updated text-size to sm/base and padding
              className="w-full h-full pl-14 pr-6 bg-white border-2 border-slate-100 rounded-2xl text-sm md:text-base font-black outline-none focus:border-black transition-all uppercase shadow-sm" 
            />
          </div>

          <div className="flex gap-3 h-16 lg:h-full overflow-x-auto no-scrollbar">
            {/* Date Display */}
            <div className="flex items-center gap-2 bg-white px-4 md:px-6 h-full rounded-2xl border-2 border-slate-100 font-black text-[10px] md:text-xs uppercase whitespace-nowrap shadow-sm shrink-0">
              <FiCalendar size={18} className="text-slate-400" /> {todayDisplay}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2 bg-white p-1 h-full rounded-2xl border-2 border-slate-100 whitespace-nowrap shadow-sm shrink-0">
              <div className="flex items-center h-full border-r-2 border-slate-100 pr-1 mr-1">
                <button onClick={() => setIsRange(false)} className={`h-full px-3 md:px-5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all ${!isRange ? "bg-slate-100 text-black" : "text-slate-400 hover:text-slate-600"}`}>Single</button>
                <button onClick={() => setIsRange(true)} className={`h-full px-3 md:px-5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all ${isRange ? "bg-slate-100 text-black" : "text-slate-400 hover:text-slate-600"}`}>Range</button>
              </div>
              <div className="flex items-center px-2 gap-2 h-full">
                {!isRange ? (
                  <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[10px] md:text-xs font-black outline-none cursor-pointer uppercase" />
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-[10px] md:text-xs font-black outline-none w-24 uppercase" />
                    <span className="text-[10px] font-black text-slate-300">-</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-[10px] md:text-xs font-black outline-none w-24 uppercase" />
                  </div>
                )}
              </div>
            </div>

            {/* Reset Button */}
            <button onClick={resetFilters} className="h-full aspect-square flex items-center justify-center bg-black text-white rounded-2xl hover:opacity-80 transition-all active:scale-95 flex-shrink-0 shadow-lg shadow-black/10">
              <FiRefreshCw size={22} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          
          {/* Desktop Header */}
          <div className="hidden lg:grid grid-cols-5 p-5 border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
             <div className="col-span-1 pl-4">S.No</div>
             <div className="col-span-1">Franchise ID</div>
             <div className="col-span-1">Items</div>
             <div className="col-span-1 text-center">Date & Time</div>
             <div className="col-span-1 text-center">Status</div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <FiSearch size={48} className="opacity-20"/>
                    <p className="text-xs font-bold uppercase tracking-widest">No Requests Found</p>
                </div>
            ) : filteredRequests.map((req, index) => {
                const isAllFulfilled = req.displayItems.every(i => i.status === 'fulfilled');
                const isPartial = !isAllFulfilled && req.displayItems.some(i => i.status === 'fulfilled');

                return (
                  // RESPONSIVE ROW/CARD CONTAINER
                  <div key={index} className="group hover:bg-slate-50 transition-colors p-5 flex flex-col lg:grid lg:grid-cols-5 lg:items-center gap-4">
                    
                    {/* Mobile: Header Row (ID + Date) */}
                    <div className="flex justify-between items-start lg:hidden">
                        <div>
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase">#{index + 1}</span>
                            <div className="mt-2 text-xs font-bold text-slate-600 uppercase">{new Date(req.created_at).toLocaleDateString('en-GB')}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 border ${
                            isAllFulfilled ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                            isPartial ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                            {isAllFulfilled ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                            {isAllFulfilled ? "Completed" : "Pending"}
                        </span>
                    </div>

                    {/* Desktop Columns */}
                    <div className="hidden lg:block pl-4 text-xs font-black text-slate-400">{(index + 1).toString().padStart(2, '0')}</div>
                    <div className="hidden lg:block"><span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-600 border border-slate-200">{req.franchise_id || "N/A"}</span></div>

                    {/* Content (Items Button) */}
                    <div className="lg:col-span-1">
                        <button onClick={() => setSelectedGroup(req)} className="w-full lg:w-auto bg-black text-white hover:opacity-80 px-4 py-3 lg:py-2 rounded-xl transition-all flex items-center justify-between lg:justify-start gap-3 shadow-sm active:scale-95">
                            <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><FiList/> View {req.displayItems.length} Items</span>
                            <FiChevronRight className="lg:hidden" size={14}/>
                        </button>
                    </div>

                    {/* Desktop Date */}
                    <div className="hidden lg:flex flex-col items-center">
                        <span className="text-[11px] font-black uppercase">{new Date(req.created_at).toLocaleDateString('en-GB')}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Desktop Status */}
                    <div className="hidden lg:flex justify-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-2 border ${
                            isAllFulfilled ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
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

      {/* --- RESPONSIVE MODAL --- */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedGroup(null)} />
          
          <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black uppercase text-sm tracking-widest text-black">Request Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {new Date(selectedGroup.created_at).toLocaleDateString('en-GB')} • {new Date(selectedGroup.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><FiX size={20}/></button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {selectedGroup.displayItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FiPackage className="text-slate-400" />
                    <span className={`text-xs font-black uppercase ${item.status === 'fulfilled' ? 'text-black' : 'text-slate-600'}`}>
                      {item.name}
                    </span>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                    item.status === 'fulfilled' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {item.status === 'fulfilled' ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center shrink-0">
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
      `}</style>
    </div>
  );
};

export default RequestPortal;