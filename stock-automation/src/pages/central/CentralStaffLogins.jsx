import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Search, Clock, Loader2, RefreshCw, PowerOff,
  Calendar, Timer, ShieldCheck, ChevronRight
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

const THEME_GREEN = "rgb(0, 100, 55)";
const BG_GRAY = "#f8fafc";
const TEXT_DARK = "#1e293b";
const BORDER_COLOR = "#e2e8f0";

const CentralStaffLogins = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { targetUserId, targetName, franchiseId } = location.state || {};

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Date Filters
  const [filterType, setFilterType] = useState("date");
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  const channelRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    if (franchiseId) {
      fetchLogs(franchiseId, targetUserId);
      setupRealtime(franchiseId);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [targetUserId, franchiseId]);

  // --- LOGIC PRESERVATION ---
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
        .from('login_logs')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs', filter: `franchise_id=eq.${fid}` },
        () => fetchLogs(fid, targetUserId, false)
      ).subscribe();
    channelRef.current = channel;
  };

  const fetchLogs = async (fid, specificTargetId, showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    let query = supabase.from('login_logs').select(`*, staff_profiles!inner( name, staff_id )`).eq('franchise_id', fid).order('login_at', { ascending: false });
    if (specificTargetId) query = query.eq('staff_id', specificTargetId);
    const { data, error } = await query;
    if (!error) setLogs(data || []);
    if (showLoading) setIsRefreshing(false);
    setLoading(false);
  };

  const finalLogs = logs.filter(log => {
    const { name, id } = getStaffDetails(log);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const logDate = new Date(log.login_at).toLocaleDateString('en-CA');
    return filterType === 'date' ? logDate === selectedDate : (logDate >= startDate && logDate <= endDate);
  });

  const stats = (() => {
    let totalSeconds = 0;
    finalLogs.forEach(log => {
      const start = new Date(log.login_at);
      let diff = log.logout_at ? (new Date(log.logout_at) - start) : (new Date() - start);
      if (diff > 0 && diff < 86400000) totalSeconds += diff / 1000;
    });
    return { totalDuration: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m` };
  })();

  if (!franchiseId) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>No Franchise Context Found</h2>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? "15px" : "30px 40px" }}>

      {/* HEADER */}
      <div style={{ ...styles.headerRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '15px' : '0' }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /> {!isMobile && "Back"}</button>
        <h1 style={{ ...styles.pageTitle, fontSize: isMobile ? '20px' : '24px', flex: isMobile ? 'none' : 2, textAlign: isMobile ? 'left' : 'center' }}>
          {targetName ? `${targetName}` : "Staff Logins"}
        </h1>
        <div style={{ ...styles.franchiseBadge, width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>ID : {franchiseId}</div>
      </div>

      {/* CONTROLS */}
      <div style={{ ...styles.controlsRow, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
        <div style={{ ...styles.searchContainer, width: '100%' }}>
          <Search size={18} color="#94a3b8" />
          <input placeholder="Search Staff..." style={styles.searchInput} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div style={{ ...styles.filterGroup, flexDirection: isMobile ? 'column' : 'row', width: '100%' }}>
          <div style={{ ...styles.toggleContainer, width: isMobile ? '100%' : 'auto' }}>
            <button style={filterType === 'date' ? { ...styles.toggleBtnActive, flex: 1 } : { ...styles.toggleBtn, flex: 1 }} onClick={() => setFilterType('date')}>Date</button>
            <button style={filterType === 'range' ? { ...styles.toggleBtnActive, flex: 1 } : { ...styles.toggleBtn, flex: 1 }} onClick={() => setFilterType('range')}>Range</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            {filterType === 'date' ? (
              <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" style={{ ...styles.dateInput, flex: 1 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
            <button onClick={() => fetchLogs(franchiseId, targetUserId)} style={styles.refreshBtn} disabled={isRefreshing}><RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /></button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ ...styles.statsRow, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ ...styles.statCard, width: '100%' }}>
          <div style={styles.statIconBox}><Timer size={20} color="white" /></div>
          <div>
            <div style={styles.statLabel}>Total Login Hours</div>
            <div style={styles.statValue}>{stats.totalDuration}</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, width: '100%', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ ...styles.statIconBox, background: '#3b82f6' }}><ShieldCheck size={20} color="white" /></div>
          <div>
            <div style={{ ...styles.statLabel, color: '#1e40af' }}>Central Admin</div>
            <div style={{ ...styles.statValue, color: '#1e3a8a', fontSize: '14px' }}>Full Access</div>
          </div>
        </div>
      </div>

      {/* DATA VIEW */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
          {finalLogs.map((log) => {
            const { name, id } = getStaffDetails(log);
            const isLoggedOut = !!log.logout_at;
            return (
              <div key={log.id} style={styles.mobileCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={{ fontWeight: '800', color: TEXT_DARK }}>{name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: {id}</div>
                  </div>
                  <span style={isLoggedOut ? styles.badgeInactive : styles.badgeActive}>{isLoggedOut ? "Closed" : "Active"}</span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardRow}><span><Calendar size={12} /> Date</span> <strong>{new Date(log.login_at).toLocaleDateString('en-GB')}</strong></div>
                  <div style={styles.cardRow}><span><Clock size={12} /> Session</span> <strong>{formatTime(log.login_at)} - {isLoggedOut ? formatTime(log.logout_at) : 'Live'}</strong></div>
                  <div style={{ ...styles.cardRow, marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${BORDER_COLOR}` }}>
                    <span><Timer size={12} /> Duration</span> <strong style={{ color: THEME_GREEN }}>{calculateDurationDisplay(log.login_at, log.logout_at)}</strong>
                  </div>
                </div>
                {!isLoggedOut && <button onClick={() => handleForceLogout(log.id)} style={styles.mobileForceBtn}>FORCE LOGOUT</button>}
              </div>
            );
          })}
        </div>
      ) : (
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
                <th style={{ ...styles.th, textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center' }}><Loader2 className="animate-spin" size={30} style={{ margin: '0 auto', color: THEME_GREEN }} /></td></tr>
              ) : finalLogs.length > 0 ? (
                finalLogs.map((log) => {
                  const isLoggedOut = !!log.logout_at;
                  const { name, id } = getStaffDetails(log);
                  return (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="#64748b" />{new Date(log.login_at).toLocaleDateString('en-GB')}</div></td>
                      <td style={{ ...styles.td, fontWeight: '700', color: TEXT_DARK }}>{name}</td>
                      <td style={styles.td}><span style={styles.monoBadge}>{id}</span></td>
                      <td style={{ ...styles.td, color: THEME_GREEN, fontWeight: '700' }}>{formatTime(log.login_at)}</td>
                      <td style={{ ...styles.td, color: '#ef4444' }}>{isLoggedOut ? formatTime(log.logout_at) : '-- : --'}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{calculateDurationDisplay(log.login_at, log.logout_at)}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={isLoggedOut ? styles.badgeInactive : styles.badgeActive}>{isLoggedOut ? "Completed" : "Active"}</span>
                          {!isLoggedOut && <button onClick={() => handleForceLogout(log.id)} style={styles.forceBtn}><PowerOff size={12} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: TEXT_DARK },
  headerRow: { display: 'flex', alignItems: 'center', marginBottom: '30px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', fontSize: '15px', fontWeight: '700', color: TEXT_DARK, cursor: 'pointer' },
  pageTitle: { margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.5px', color: TEXT_DARK },
  franchiseBadge: { padding: '8px 16px', background: '#e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#475569' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', gap: '15px', marginBottom: '25px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '10px 15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  filterGroup: { display: 'flex', gap: '10px' },
  toggleContainer: { display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' },
  toggleBtn: { padding: '6px 12px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '600', color: '#64748b', borderRadius: '6px' },
  toggleBtnActive: { padding: '6px 12px', border: 'none', background: 'white', fontSize: '12px', fontWeight: '700', color: THEME_GREEN, borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  dateInput: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER_COLOR}`, fontSize: '12px', fontWeight: '600' },
  refreshBtn: { width: '40px', height: '40px', background: THEME_GREEN, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statsRow: { display: 'flex', gap: '15px', marginBottom: '25px' },
  statCard: { background: 'white', padding: '15px', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  statIconBox: { width: '40px', height: '40px', borderRadius: '10px', background: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '11px', fontWeight: '700', color: '#64748b' },
  statValue: { fontSize: '18px', fontWeight: '800' },
  statSub: { fontSize: '10px', color: '#94a3b8' },
  tableCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 24px', background: THEME_GREEN, color: 'white', fontSize: '12px', fontWeight: '700' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: `1px solid ${BORDER_COLOR}` },
  tr: { transition: 'background 0.2s' },
  monoBadge: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' },
  badgeActive: { background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  badgeInactive: { background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  forceBtn: { background: '#fee2e2', border: '1px solid #fca5a5', width: '24px', height: '24px', borderRadius: '6px', color: '#dc2626' },
  // MOBILE CARD STYLES
  mobileCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' },
  cardHeader: { padding: '15px', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' },
  cardBody: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' },
  mobileForceBtn: { width: '100%', padding: '14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderTop: `1px solid #fca5a5`, fontWeight: '900', fontSize: '11px', letterSpacing: '1px' }
};

export default CentralStaffLogins;