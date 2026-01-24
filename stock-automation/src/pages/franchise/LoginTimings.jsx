import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, Clock, Loader2, Building2, User, RefreshCw, PowerOff, ShieldCheck
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

const PRIMARY = "#065f46";
const BLACK = "#000000"; 
const BORDER = "#e5e7eb";
const DANGER = "#ef4444";

const LoginTimings = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [companyName, setCompanyName] = useState("");
  
  // Track viewer role
  const [userRole, setUserRole] = useState(null); 
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => { 
    // Setup Realtime Listener
    const channel = supabase.channel('realtime-logs').subscribe();
    fetchInitialData(channel);
    
    return () => supabase.removeAllChannels();
  }, []);

  const setupRealtime = (fid, role, uid) => {
    supabase
      .channel('realtime-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login_logs', filter: `franchise_id=eq.${fid}` },
        () => fetchLogs(fid, role, uid, false)
      )
      .subscribe();
  };

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const [ownerCheck, staffCheck] = await Promise.all([
      supabase.from('profiles').select('franchise_id, company').eq('id', user.id).maybeSingle(),
      supabase.from('staff_profiles').select('franchise_id').eq('id', user.id).maybeSingle()
    ]);

    let fid = null;
    let role = null;
    let comp = "Your Store";

    if (ownerCheck.data) {
      fid = ownerCheck.data.franchise_id;
      comp = ownerCheck.data.company;
      role = 'owner';
    } else if (staffCheck.data) {
      fid = staffCheck.data.franchise_id;
      role = 'staff';
      const { data: compData } = await supabase.from('profiles').select('company').eq('franchise_id', fid).maybeSingle();
      if (compData) comp = compData.company;
    }

    if (fid) {
      setFranchiseId(fid);
      setCompanyName(comp);
      setUserRole(role);
      
      await fetchLogs(fid, role, user.id);
      setupRealtime(fid, role, user.id);
    }
    setLoading(false);
  };

  const fetchLogs = async (fid, role, uid, showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    let query = supabase
      .from('login_logs')
      .select(`*, staff_profiles!inner( name, staff_id )`) // !inner forces logs to ONLY exist if they have a profile
      .eq('franchise_id', fid)
      .order('login_at', { ascending: false });

    // 🔒 PRIVACY LOCK: If Staff, ONLY show their own rows
    if (role === 'staff') {
      query = query.eq('staff_id', uid);
    }

    const { data, error } = await query;

    if (error) console.error("❌ DB Error:", error.message);
    else setLogs(data || []);
    
    if (showLoading) setIsRefreshing(false);
  };

  // --- FORCE LOGOUT ---
  const handleForceLogout = async (logId) => {
    if (!window.confirm("⚠️ Force end this session?")) return;

    const { error } = await supabase
      .from('login_logs')
      .update({ logout_at: new Date().toISOString() })
      .eq('id', logId);

    if (error) alert("❌ Error: " + error.message);
  };

  const getStaffDetails = (log) => {
    let profile = log.staff_profiles;
    if (Array.isArray(profile)) profile = profile[0];
    return {
      name: profile?.name || "Unknown Staff",
      id: profile?.staff_id || "N/A"
    };
  };

  // Filter for Search Bar
  const filteredLogs = logs.filter(log => {
    const { name, id } = getStaffDetails(log);
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || id.toLowerCase().includes(search);
  });

  const calculateDuration = (start, end) => {
    if (!end) return "Active Now";
    const diff = new Date(end) - new Date(start);
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

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={18} /> BACK
            </button>
            <h1 style={styles.mainHeading}>LOGIN TIMINGS</h1>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <div style={styles.searchBox}>
                <Search size={16} color="#666" />
                <input 
                    placeholder="Search Staff..." 
                    style={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => fetchLogs(franchiseId, userRole, currentUserId)} 
                style={styles.refreshBtn}
                disabled={isRefreshing}
            >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      <div style={styles.infoBar}>
          <div style={styles.franchiseIdLabel}>
             FRANCHISE ID : <span style={{ color: PRIMARY }}>{franchiseId}</span>
          </div>
          {userRole === 'owner' && (
             <div style={styles.roleBadge}>
                <ShieldCheck size={14} /> OWNER VIEW
             </div>
          )}
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>STAFF NAME</th>
              <th style={styles.th}>STAFF ID</th>
              <th style={styles.th}>LOGIN TIME</th>
              <th style={styles.th}>LOGOUT TIME</th>
              <th style={styles.th}>DURATION</th>
              <th style={styles.th}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="7" style={{padding:'40px', textAlign:'center'}}><Loader2 className="animate-spin" style={{margin:'0 auto'}} /></td></tr>
            ) : filteredLogs.length > 0 ? filteredLogs.map((log) => {
              const isLoggedOut = !!log.logout_at;
              const { name, id } = getStaffDetails(log);

              return (
                <tr key={log.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(log.login_at).toLocaleDateString('en-GB')}</td>
                  <td style={styles.td}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'900', color:BLACK}}>
                        <div style={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
                        {name}
                    </div>
                  </td>
                  <td style={styles.td}><span style={styles.idBadge}>{id}</span></td>
                  <td style={styles.td}>
                    <div style={{color: PRIMARY, fontWeight: '900', display:'flex', gap:'5px', alignItems:'center'}}>
                      <Clock size={13}/> {formatTime(log.login_at)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {isLoggedOut ? (
                      <div style={{color: '#666', fontWeight: '800'}}>
                        {formatTime(log.logout_at)}
                      </div>
                    ) : (
                      <span style={{color:'#ccc', fontSize:'12px'}}>---</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, color: isLoggedOut ? BLACK : PRIMARY }}>
                    {calculateDuration(log.login_at, log.logout_at)}
                  </td>
                  <td style={styles.td}>
                    {isLoggedOut ? (
                      <span style={{...styles.badge, background: "#f3f4f6", color: "#6b7280", border: `1px solid ${BORDER}`}}>
                        OFF DUTY
                      </span>
                    ) : (
                      <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <span style={{...styles.badge, background: "#ecfdf5", color: PRIMARY, border: `1px solid ${PRIMARY}`}}>
                          ACTIVE
                        </span>
                        {/* Only show Force Logout if Owner */}
                        {userRole === 'owner' && (
                          <button 
                            onClick={() => handleForceLogout(log.id)} 
                            style={styles.forceBtn}
                            title="Force End Shift"
                          >
                            <PowerOff size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
                   {userRole === 'staff' ? "No history found for your account." : "No staff logs found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: "40px", background: "#f9fafb", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  backBtn: { background: 'none', border: 'none', color: BLACK, fontWeight: '900', cursor: 'pointer', display:'flex', alignItems:'center', gap:'8px' },
  mainHeading: { fontWeight: "900", margin: 0, fontSize: '28px', color: BLACK },
  
  infoBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  franchiseIdLabel: { fontWeight: '900', fontSize: '14px', color: BLACK },
  roleBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '900', background: '#e0f2fe', color: '#0284c7', padding: '6px 12px', borderRadius: '20px' },

  searchBox: { display: 'flex', alignItems: 'center', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 15px', width: '250px' },
  searchInput: { border: 'none', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px', color: BLACK },
  refreshBtn: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: BLACK, transition: 'all 0.2s' },

  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '18px 25px', fontSize: '11px', fontWeight: '900', color: BLACK, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '18px 25px', fontSize: '14px', fontWeight: '700', color: BLACK },
  
  badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },
  idBadge: { background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', color: BLACK },
  avatar: { width: '24px', height: '24px', borderRadius: '50%', background: PRIMARY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' },
  
  forceBtn: { background: '#fee2e2', border: `1px solid ${DANGER}`, borderRadius: '6px', padding: '4px 8px', color: DANGER, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default LoginTimings;