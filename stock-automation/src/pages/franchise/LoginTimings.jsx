import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Search, Clock, Loader2, RefreshCw, PowerOff,
  Calendar, Timer, User, Hash, ChevronRight, ChevronDown, AlertCircle
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

// --- DESIGN TOKENS ---
const THEME_GREEN = "rgb(0, 100, 55)";
const BG_GRAY = "#f8fafc";
const TEXT_DARK = "#1e293b";
const BORDER_COLOR = "#e2e8f0";

const LoginTimings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Optional params passed from previous screen
  const { targetUserId, targetName } = location.state || {};

  // --- STATE ---
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [processingLogoutId, setProcessingLogoutId] = useState(null); // Track specific row loading

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("date");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Context
  const [franchiseId, setFranchiseId] = useState("...");
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Refs
  const channelRef = useRef(null);

  // --- LIFECYCLE ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // Initial Load
    fetchInitialData();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [targetUserId]);

  // --- HELPERS ---
  const getStaffDetails = useCallback((log) => {
    // Handle array or object response from Supabase joins
    const profile = Array.isArray(log.staff_profiles) ? log.staff_profiles[0] : log.staff_profiles;
    return {
      name: profile?.name || "Unknown Staff",
      id: profile?.staff_id || "N/A"
    };
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const calculateDurationDisplay = (startStr, endStr) => {
    if (!endStr) return "Active";
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diff = Math.max(0, end - start);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0 && mins === 0) return "< 1m";
    return `${hours}h ${mins}m`;
  };

  // --- ACTIONS ---
  const handleForceLogout = async (logId) => {
    if (!window.confirm("Are you sure you want to force logout this user?")) return;

    setProcessingLogoutId(logId);
    try {
      const { error } = await supabase
        .from('login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('id', logId);

      if (error) throw error;

      // Optimistic Update
      setLogs(prev => prev.map(log =>
        log.id === logId
          ? { ...log, logout_at: new Date().toISOString() }
          : log
      ));
    } catch (err) {
      alert("Action Failed: " + err.message);
    } finally {
      setProcessingLogoutId(null);
    }
  };

  // --- DATA FETCHING ---
  const setupRealtime = (fid, role, uid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`realtime-logs-${fid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'login_logs',
          filter: `franchise_id=eq.${fid}`
        },
        (payload) => {
          // Re-fetch only if necessary, or just prepend/update local state
          // For simplicity and accuracy, we re-fetch the latest batch
          fetchLogs(fid, role, uid, targetUserId, false);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Determine Role
      const [ownerCheck, staffCheck] = await Promise.all([
        supabase.from('profiles').select('franchise_id').eq('id', user.id).maybeSingle(),
        supabase.from('staff_profiles').select('franchise_id').eq('id', user.id).maybeSingle()
      ]);

      let fid = null;
      let role = null;

      if (ownerCheck.data) {
        fid = ownerCheck.data.franchise_id;
        role = 'owner';
      } else if (staffCheck.data) {
        fid = staffCheck.data.franchise_id;
        role = 'staff';
      }

      if (fid) {
        setFranchiseId(fid);
        setUserRole(role);
        await fetchLogs(fid, role, user.id, targetUserId);
        setupRealtime(fid, role, user.id);
      }
    } catch (e) {
      console.error("Init Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = useCallback(async (fid, role, uid, specificTargetId, showLoading = true) => {
    if (showLoading) setIsRefreshing(true);

    try {
      let query = supabase
        .from('login_logs')
        .select(`
            *,
            staff_profiles!inner ( name, staff_id )
        `)
        .eq('franchise_id', fid)
        .order('login_at', { ascending: false })
        .limit(200); // Optimization: Limit to last 200 records to prevent crash

      if (specificTargetId) {
        query = query.eq('staff_id', specificTargetId);
      } else if (role === 'staff') {
        query = query.eq('staff_id', uid);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Fetch Logs Error:", err);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, []);

  // --- FILTERING & STATS (MEMOIZED) ---
  const finalLogs = useMemo(() => {
    return logs.filter(log => {
      const { name, id } = getStaffDetails(log);
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower);

      // Date Conversion logic handling timezone offsets simply
      const logDate = new Date(log.login_at).toISOString().split('T')[0];

      let matchesDate = true;
      if (filterType === 'date') {
        matchesDate = logDate === selectedDate;
      } else {
        matchesDate = logDate >= startDate && logDate <= endDate;
      }
      return matchesSearch && matchesDate;
    });
  }, [logs, searchTerm, filterType, selectedDate, startDate, endDate, getStaffDetails]);

  const stats = useMemo(() => {
    let totalSeconds = 0;
    finalLogs.forEach(log => {
      const start = new Date(log.login_at).getTime();
      let diff = 0;
      if (log.logout_at) {
        diff = (new Date(log.logout_at).getTime() - start) / 1000;
      } else {
        const currentDiff = (Date.now() - start) / 1000;
        // Ignore if active for > 24 hours (ghost session)
        if (currentDiff < 86400) diff = currentDiff;
      }
      if (diff > 0) totalSeconds += diff;
    });
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return { totalDuration: `${h}h ${m}m` };
  }, [finalLogs]);

  // --- EXPAND STATE FOR MOBILE CARDS ---
  const [expandedCardId, setExpandedCardId] = useState(null);

  // --- RENDER ---
  return (
    <div style={styles.page}>

      {/* --- NEW HEADER INTEGRATED FROM POS MANAGEMENT --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            Login <span style={{ color: THEME_GREEN }}>Timings</span>
          </h1>

          <div style={styles.idBox}>
            ID : {franchiseId || "---"}
          </div>
        </div>
      </header>

      {/* --- CONTENT WRAPPER WITH PADDING --- */}
      <main style={{ ...styles.mainContent, padding: isMobile ? "0 15px 20px 15px" : "0 40px 20px 40px" }}>

        {/* CONTROLS */}
        <div style={{ ...styles.controlsRow, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Search */}
          <div style={{ ...styles.searchContainer, width: isMobile ? '100%' : '320px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              placeholder="Search Staff Name or ID..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ ...styles.filterGroup, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            <div style={styles.toggleContainer}>
              <button style={filterType === 'date' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('date')}>Date</button>
              <button style={filterType === 'range' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('range')}>Range</button>
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {filterType === 'date' ? (
                <input type="date" style={styles.dateInput} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              ) : (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input type="date" style={{ ...styles.dateInput, width: isMobile ? '95px' : 'auto' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span style={{ color: '#94a3b8' }}>-</span>
                  <input type="date" style={{ ...styles.dateInput, width: isMobile ? '95px' : 'auto' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>

            <button onClick={() => fetchLogs(franchiseId, userRole, currentUserId, targetUserId)} style={styles.refreshBtn} disabled={isRefreshing}>
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* STATS CARD */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, width: isMobile ? '100%' : 'auto' }}>
            <div style={styles.statIconBox}><Timer size={20} color="white" /></div>
            <div>
              <div style={styles.statLabel}>Total Login Hours</div>
              <div style={styles.statValue}>{stats.totalDuration}</div>
            </div>
          </div>
        </div>

        {/* DATA DISPLAY */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><Loader2 className="animate-spin" size={30} style={{ margin: '0 auto', color: THEME_GREEN }} /></div>
        ) : finalLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertCircle size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p>No records found for this period.</p>
          </div>
        ) : isMobile ? (
          // --- MOBILE CARD VIEW ---
          <div style={styles.mobileList}>
            {finalLogs.map(log => {
              const { name, id } = getStaffDetails(log);
              const isLoggedOut = !!log.logout_at;
              const isProcessing = processingLogoutId === log.id;

              return (
                <div key={log.id} style={styles.mobileCard}>
                  <div
                    style={styles.cardHeader}
                    onClick={() => setExpandedCardId(expandedCardId === log.id ? null : log.id)}
                  >
                    <div style={styles.cardUser}>
                      <div style={styles.userAvatar}><User size={16} /></div>
                      <div>
                        <div style={styles.cardName}>{name}</div>
                        <div style={styles.cardId}>ID: {id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isLoggedOut ? (
                        <span style={styles.badgeInactive}>Done</span>
                      ) : (
                        <span style={styles.badgeActive}>Active</span>
                      )}
                      {expandedCardId === log.id ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                    </div>
                  </div>

                  {expandedCardId === log.id && (
                    <div style={styles.cardBody}>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}><Calendar size={12} /> Date</span>
                        <span style={styles.cardValue}>{new Date(log.login_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}><Clock size={12} /> In - Out</span>
                        <span style={styles.cardValue}>
                          <span style={{ color: THEME_GREEN }}>{formatTime(log.login_at)}</span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>➜</span>
                          <span style={{ color: isLoggedOut ? '#ef4444' : '#cbd5e1' }}>{isLoggedOut ? formatTime(log.logout_at) : '...'}</span>
                        </span>
                      </div>
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}><Timer size={12} /> Duration</span>
                        <span style={{ ...styles.cardValue, fontWeight: '800' }}>{calculateDurationDisplay(log.login_at, log.logout_at)}</span>
                      </div>

                      {!isLoggedOut && userRole === 'owner' && (
                        <button
                          onClick={() => handleForceLogout(log.id)}
                          style={styles.mobileForceBtn}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="animate-spin" size={12} /> : <PowerOff size={12} />}
                          {isProcessing ? "Processing..." : "Force Logout"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          // --- DESKTOP TABLE VIEW ---
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>DATE</th>
                  <th style={styles.th}>STAFF NAME</th>
                  <th style={styles.th}>STAFF ID</th>
                  <th style={styles.th}>LOGIN TIME</th>
                  <th style={styles.th}>LOGOUT TIME</th>
                  <th style={styles.th}>DURATION</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {finalLogs.map((log) => {
                  const isLoggedOut = !!log.logout_at;
                  const { name, id } = getStaffDetails(log);
                  const isProcessing = processingLogoutId === log.id;

                  return (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} color="#64748b" />
                          {new Date(log.login_at).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700', color: TEXT_DARK }}>{name}</td>
                      <td style={styles.td}><span style={styles.monoBadge}>{id}</span></td>
                      <td style={{ ...styles.td, color: THEME_GREEN, fontWeight: '700' }}>
                        {formatTime(log.login_at)}
                      </td>
                      <td style={{ ...styles.td, color: '#ef4444' }}>
                        {isLoggedOut ? formatTime(log.logout_at) : '-- : --'}
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>
                        {calculateDurationDisplay(log.login_at, log.logout_at)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isLoggedOut ? (
                          <span style={styles.badgeInactive}>Completed</span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span style={styles.badgeActive}>Active</span>
                            {userRole === 'owner' && (
                              <button
                                onClick={() => handleForceLogout(log.id)}
                                style={styles.forceBtn}
                                title="Force Logout"
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="animate-spin" size={12} /> : <PowerOff size={12} />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

// --- STYLES ---
const styles = {
  page: { background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: TEXT_DARK }, // Removed padding from page wrapper

  // --- INTEGRATED HEADER STYLES ---
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 },
  mainContent: { width: "100%", display: "flex", flexDirection: "column", gap: "10px", boxSizing: 'border-box' },

  // Controls
  controlsRow: { display: 'flex', gap: '15px', marginBottom: '20px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '12px', padding: '10px 15px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: TEXT_DARK },

  filterGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  toggleContainer: { display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' },
  toggleBtn: { padding: '6px 12px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '600', color: '#64748b', cursor: 'pointer', borderRadius: '6px' },
  toggleBtnActive: { padding: '6px 12px', border: 'none', background: 'white', fontSize: '12px', fontWeight: '700', color: THEME_GREEN, cursor: 'pointer', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

  dateInput: { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BORDER_COLOR}`, outline: 'none', fontSize: '12px', color: TEXT_DARK, fontWeight: '600', background: 'white' },
  refreshBtn: { width: '36px', height: '36px', borderRadius: '10px', background: THEME_GREEN, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Stats
  statsRow: { marginBottom: '20px' },
  statCard: { background: 'white', padding: '15px', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  statIconBox: { width: '40px', height: '40px', borderRadius: '10px', background: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '11px', fontWeight: '700', color: '#64748b' },
  statValue: { fontSize: '18px', fontWeight: '900', color: TEXT_DARK },

  // Empty State
  emptyState: { padding: '60px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

  // Desktop Table
  tableCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '14px 20px', background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER_COLOR}`, transition: 'background 0.2s' },
  td: { padding: '14px 20px', fontSize: '13px', color: '#475569', fontWeight: '500' },

  // Mobile Cards
  mobileList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  mobileCard: { background: 'white', borderRadius: '14px', border: `1px solid ${BORDER_COLOR}`, padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  cardUser: { display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: { width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: '13px', fontWeight: '800', color: TEXT_DARK },
  cardId: { fontSize: '11px', fontWeight: '600', color: '#94a3b8' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${BORDER_COLOR}` },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' },
  cardLabel: { display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: '600' },
  cardValue: { color: TEXT_DARK, fontWeight: '500' },
  mobileForceBtn: { marginTop: '12px', width: '100%', padding: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },

  // Badges
  monoBadge: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: TEXT_DARK },
  badgeActive: { background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  badgeInactive: { background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  forceBtn: { background: '#fee2e2', border: '1px solid #fca5a5', width: '24px', height: '24px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default LoginTimings;