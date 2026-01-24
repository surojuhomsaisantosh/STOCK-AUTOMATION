import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Search, Clock, Loader2, RefreshCw, PowerOff, 
  Calendar, Timer, ShieldCheck 
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

const THEME_GREEN = "rgb(0, 100, 55)";
const BG_GRAY = "#f8fafc";
const TEXT_DARK = "#1e293b";
const BORDER_COLOR = "#e2e8f0";

const CentralStaffLogins = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { targetUserId, targetName, franchiseId } = location.state || {}; // Received from Profiles page

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Date Filters
  const [filterType, setFilterType] = useState("date"); 
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  const channelRef = useRef(null);

  useEffect(() => { 
    if (!franchiseId) return; // Guard clause
    fetchLogs(franchiseId, targetUserId);
    setupRealtime(franchiseId);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [targetUserId, franchiseId]); 

  // --- UTILS ---
  const getStaffDetails = (log) => {
    let profile = log.staff_profiles;
    if (Array.isArray(profile)) profile = profile[0];
    return { name: profile?.name || "Unknown", id: profile?.staff_id || "N/A" };
  };

  const calculateDurationDisplay = (startStr, endStr) => {
    if (!endStr) return "Active Now";
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = Math.max(0, end - start); 
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0 && mins === 0) return "< 1m";
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const handleForceLogout = async (logId) => {
    if (!window.confirm("⚠️ Force end this session?")) return;
    try {
        const { error } = await supabase
        .from('login_logs') // Ensure your table name matches this
        .update({ logout_at: new Date().toISOString() })
        .eq('id', logId);
        if (error) throw error;
        alert("✅ Session ended.");
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
  };

  const setupRealtime = (fid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`central-logs-${fid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login_logs', filter: `franchise_id=eq.${fid}` },
        () => fetchLogs(fid, targetUserId, false) 
      )
      .subscribe();
    channelRef.current = channel;
  };

  const fetchLogs = async (fid, specificTargetId, showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    // NOTE: 'staff_profiles' must be the exact name of the foreign key relationship in Supabase
    let query = supabase
      .from('login_logs') // Ensure your table name matches this
      .select(`*, staff_profiles!inner( name, staff_id )`) 
      .eq('franchise_id', fid)
      .order('login_at', { ascending: false });

    if (specificTargetId) {
        query = query.eq('staff_id', specificTargetId);
    }

    const { data, error } = await query;
    if (error) console.error("❌ DB Error:", error.message);
    else setLogs(data || []);
    
    if (showLoading) setIsRefreshing(false);
    setLoading(false);
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const { name, id } = getStaffDetails(log);
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const logDate = new Date(log.login_at).toLocaleDateString('en-CA'); 
      if (filterType === 'date') return logDate === selectedDate;
      else return logDate >= startDate && logDate <= endDate;
    });
  };

  const finalLogs = getFilteredLogs();

  const calculateStats = () => {
    let totalSeconds = 0;
    finalLogs.forEach(log => {
      const start = new Date(log.login_at);
      let diffInSeconds = 0;
      if (log.logout_at) {
        const end = new Date(log.logout_at);
        diffInSeconds = (end - start) / 1000;
      } else {
        const end = new Date();
        diffInSeconds = (end - start) / 1000;
        if (diffInSeconds > 86400) diffInSeconds = 0;
      }
      if (diffInSeconds > 0) totalSeconds += diffInSeconds;
    });
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { totalDuration: `${hours}h ${minutes}m` };
  };

  const stats = calculateStats();

  if (!franchiseId) {
      return (
          <div style={{...styles.page, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{textAlign:'center'}}>
                  <h2>No Franchise Context Found</h2>
                  <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
              </div>
          </div>
      );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={{flex: 1}}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /> Back</button>
        </div>
        <div style={{flex: 2, textAlign: 'center'}}>
           <h1 style={styles.pageTitle}>{targetName ? `${targetName}'s Timings` : "Staff Logins"}</h1>
        </div>
        <div style={{flex: 1, textAlign: 'right'}}>
          <div style={styles.franchiseBadge}>ID : <span>{franchiseId}</span></div>
        </div>
      </div>

      <div style={styles.controlsRow}>
        <div style={styles.searchContainer}>
          <Search size={18} color="#94a3b8" />
          <input placeholder="Search Staff Name or ID..." style={styles.searchInput} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div style={styles.filterGroup}>
          <div style={styles.toggleContainer}>
             <button style={filterType === 'date' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('date')}>Date</button>
             <button style={filterType === 'range' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('range')}>Range</button>
          </div>
          {filterType === 'date' ? (
             <input type="date" style={styles.dateInput} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          ) : (
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
               <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
               <span style={{color:'#94a3b8'}}>-</span>
               <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
          <button onClick={() => fetchLogs(franchiseId, targetUserId)} style={styles.refreshBtn} disabled={isRefreshing}>
             <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
           <div style={styles.statIconBox}><Timer size={20} color="white" /></div>
           <div>
              <div style={styles.statLabel}>Total Login Hours</div>
              <div style={styles.statValue}>{stats.totalDuration}</div>
              <div style={styles.statSub}>For selected period</div>
           </div>
        </div>
        {/* Central Admin Badge */}
        <div style={{...styles.statCard, border: '1px solid #bfdbfe', background:'#eff6ff'}}>
           <div style={{...styles.statIconBox, background: '#3b82f6'}}><ShieldCheck size={20} color="white" /></div>
           <div>
              <div style={{...styles.statLabel, color: '#1e40af'}}>Central Admin</div>
              <div style={{...styles.statValue, color:'#1e3a8a', fontSize:'14px'}}>Full Access</div>
           </div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>NAME</th>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>LOGIN</th>
              <th style={styles.th}>LOGOUT</th>
              <th style={styles.th}>DURATION</th>
              <th style={{...styles.th, textAlign: 'center'}}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="7" style={{padding:'60px', textAlign:'center'}}><Loader2 className="animate-spin" size={30} style={{margin:'0 auto', color: THEME_GREEN}} /></td></tr>
            ) : finalLogs.length > 0 ? (
               finalLogs.map((log) => {
                  const isLoggedOut = !!log.logout_at;
                  const { name, id } = getStaffDetails(log);
                  return (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>
                         <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Calendar size={14} color="#64748b"/>{new Date(log.login_at).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td style={{...styles.td, fontWeight: '700', color: TEXT_DARK}}>{name}</td>
                      <td style={styles.td}><span style={styles.monoBadge}>{id}</span></td>
                      <td style={{...styles.td, color: THEME_GREEN, fontWeight:'700'}}>{formatTime(log.login_at)}</td>
                      <td style={{...styles.td, color: '#ef4444'}}>{isLoggedOut ? formatTime(log.logout_at) : '-- : --'}</td>
                      <td style={{...styles.td, fontWeight: '700'}}>{calculateDurationDisplay(log.login_at, log.logout_at)}</td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        {isLoggedOut ? <span style={styles.badgeInactive}>Completed</span> : (
                           <div style={{display:'inline-flex', alignItems:'center', gap:'8px'}}>
                              <span style={styles.badgeActive}>Active</span>
                              <button onClick={() => handleForceLogout(log.id)} style={styles.forceBtn} title="Force Logout"><PowerOff size={12} /></button>
                           </div>
                        )}
                      </td>
                    </tr>
                  );
               })
            ) : (
               <tr><td colSpan="7" style={{padding:'40px', textAlign:'center', color:'#64748b'}}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: "30px 40px", background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: TEXT_DARK },
  headerRow: { display: 'flex', alignItems: 'center', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', fontSize: '15px', fontWeight: '700', color: TEXT_DARK, cursor: 'pointer' },
  pageTitle: { margin: 0, fontSize: '24px', fontWeight: '800', color: TEXT_DARK, textTransform: 'uppercase', letterSpacing: '-0.5px' },
  franchiseBadge: { display: 'inline-block', padding: '8px 16px', background: '#e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#475569' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '20px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '10px 15px', width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: TEXT_DARK },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  toggleContainer: { display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' },
  toggleBtn: { padding: '6px 16px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer', borderRadius: '6px' },
  toggleBtnActive: { padding: '6px 16px', border: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: THEME_GREEN, cursor: 'pointer', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  dateInput: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${BORDER_COLOR}`, outline: 'none', fontSize: '13px', color: TEXT_DARK, fontWeight: '600' },
  refreshBtn: { width: '38px', height: '38px', borderRadius: '8px', background: THEME_GREEN, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '25px' },
  statCard: { minWidth: '240px', background: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.03)' },
  statIconBox: { width: '45px', height: '45px', borderRadius: '12px', background: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '2px' },
  statValue: { fontSize: '20px', fontWeight: '800', color: TEXT_DARK },
  statSub: { fontSize: '11px', color: '#94a3b8' },
  tableCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 24px', background: THEME_GREEN, color: 'white', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER_COLOR}`, transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: '14px', color: '#475569', fontWeight: '500' },
  monoBadge: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', color: TEXT_DARK },
  badgeActive: { background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  badgeInactive: { background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  forceBtn: { background: '#fee2e2', border: '1px solid #fca5a5', width: '24px', height: '24px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default CentralStaffLogins;