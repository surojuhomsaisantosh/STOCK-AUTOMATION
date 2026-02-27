import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Search, Loader2, RefreshCw, PowerOff,
  Calendar, Timer, LogIn, LogOut, Hourglass
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

const THEME_GREEN = "rgb(0, 100, 55)";
const BG_GRAY = "#f8fafc";
const TEXT_DARK = "#1e293b";
const BORDER_COLOR = "#e2e8f0";

const LoginTimings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { targetUserId } = location.state || {};

  const CACHE_KEY_LOGS = `logs_${targetUserId || 'all'}`;
  const CACHE_KEY_CONTEXT = `user_context`;

  const [logs, setLogs] = useState(() => {
    const cached = sessionStorage.getItem(CACHE_KEY_LOGS);
    return cached ? JSON.parse(cached) : [];
  });

  const [loading, setLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY_LOGS));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Responsive State - Upgraded to 1024 for Tablet Support
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 1024;

  const [franchiseId, setFranchiseId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("date");
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  const channelRef = useRef(null);
  const isMounted = useRef(true);

  // --- SCROLL TO TOP ON LOAD ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cleanupRealtime = useCallback(async () => {
    if (channelRef.current) {
      const channel = channelRef.current;
      channelRef.current = null;
      try {
        await supabase.removeChannel(channel);
      } catch (err) {
        // Quietly handle websocket closure during unmount
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    initFlow();

    return () => {
      isMounted.current = false;
      window.removeEventListener('resize', handleResize);
      cleanupRealtime();
    };
  }, [targetUserId, cleanupRealtime]);

  const initFlow = async () => {
    try {
      let fid = "";
      let role = "";
      let userId = "";

      const cachedContext = sessionStorage.getItem(CACHE_KEY_CONTEXT);
      if (cachedContext) {
        const parsed = JSON.parse(cachedContext);
        fid = parsed.fid;
        role = parsed.role;
        userId = parsed.userId;
        if (isMounted.current) setFranchiseId(fid);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;

        const [ownerCheck, staffCheck] = await Promise.all([
          supabase.from('profiles').select('franchise_id').eq('id', user.id).maybeSingle(),
          supabase.from('staff_profiles').select('franchise_id').eq('id', user.id).maybeSingle()
        ]);

        fid = ownerCheck.data?.franchise_id || staffCheck.data?.franchise_id;
        role = ownerCheck.data ? 'owner' : 'staff';

        if (fid && isMounted.current) {
          setFranchiseId(fid);
          sessionStorage.setItem(CACHE_KEY_CONTEXT, JSON.stringify({ fid, role, userId }));
        }
      }

      if (fid && isMounted.current) {
        fetchLogs(fid, role, userId, logs.length > 0);
        setupRealtime(fid, role, userId);
      }
    } catch (e) {
      if (isMounted.current) setLoading(false);
    }
  };

  const fetchLogs = async (fid, role, uid, silent = false) => {
    if (!isMounted.current) return;
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      let query = supabase
        .from('login_logs')
        .select(`
          *,
          staff_profiles!login_logs_staff_profile_id_fkey (name, staff_id),
          profiles!login_logs_owner_profile_id_fkey (name, company)
        `)
        .eq('franchise_id', fid)
        .order('login_at', { ascending: false })
        .limit(100);

      if (targetUserId) {
        query = query.or(`staff_profile_id.eq.${targetUserId},owner_profile_id.eq.${targetUserId}`);
      } else if (role === 'staff') {
        query = query.eq('staff_id', uid);
      }

      const { data, error } = await query;

      if (!error && isMounted.current) {
        setLogs(data || []);
        sessionStorage.setItem(CACHE_KEY_LOGS, JSON.stringify(data || []));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const setupRealtime = (fid, role, uid) => {
    if (channelRef.current) return;

    const channel = supabase
      .channel(`logs-${fid}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs', filter: `franchise_id=eq.${fid}` },
        () => {
          if (isMounted.current) fetchLogs(fid, role, uid, true);
        })
      .subscribe();

    channelRef.current = channel;
  };

  const handleForceLogout = async (logId) => {
    if (!window.confirm("⚠️ Force end this session?")) return;
    try {
      const { error } = await supabase
        .from('login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('id', logId);
      if (error) throw error;
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const getLogDetails = useCallback((log) => {
    let isOwner = false;
    let name = "Unknown";
    let id = "N/A";

    if (log.owner_profile_id) {
      isOwner = true;
      name = log.profiles?.name || log.profiles?.company || "Owner";
      id = "OWNER";
    }
    else if (log.staff_profile_id) {
      isOwner = false;
      name = log.staff_profiles?.name || "Staff Member";
      id = log.staff_profiles?.staff_id || "N/A";
    }

    const actualMode = log.login_mode ? log.login_mode.toUpperCase() : "STORE";

    return { name, id, isOwner, actualMode };
  }, []);

  const calculateDurationDisplay = (startStr, endStr) => {
    if (!endStr) return "Active";
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

  const finalLogs = useMemo(() => {
    return logs.filter(log => {
      const { name, id } = getLogDetails(log);
      const matchesSearch = (name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (id || "").toLowerCase().includes(searchTerm.toLowerCase());

      const logDate = new Date(log.login_at).toLocaleDateString('en-CA');
      return matchesSearch && (filterType === 'date' ? logDate === selectedDate : (logDate >= startDate && logDate <= endDate));
    });
  }, [logs, searchTerm, filterType, selectedDate, startDate, endDate, getLogDetails]);

  const stats = useMemo(() => {
    let totalSeconds = 0;
    finalLogs.forEach(log => {
      const start = new Date(log.login_at).getTime();
      let diffInSeconds = 0;
      if (log.logout_at) {
        const end = new Date(log.logout_at).getTime();
        diffInSeconds = (end - start) / 1000;
      } else {
        const end = Date.now();
        diffInSeconds = (end - start) / 1000;
        if (diffInSeconds > 86400) diffInSeconds = 0;
      }
      if (diffInSeconds > 0) totalSeconds += diffInSeconds;
    });
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { totalDuration: `${hours}h ${minutes}m` };
  }, [finalLogs]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            User <span style={{ color: THEME_GREEN }}>Timings</span>
          </h1>

          <div style={styles.topRightActions}>
            <div style={styles.idBox}>
              ID: {franchiseId || "---"}
            </div>
          </div>
        </div>
      </header>

      <div style={{ ...styles.container, padding: isMobile ? '16px' : '20px' }}>
        <div style={{
          ...styles.controlsRow,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px'
        }}>
          <div style={{ ...styles.searchContainer, width: isMobile ? '100%' : '300px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              placeholder="Search Name or ID..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{
            ...styles.filterGroup,
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <div style={{
              ...styles.toggleContainer,
              width: isMobile ? '100%' : 'auto',
              display: 'flex'
            }}>
              <button
                style={{
                  ...(filterType === 'date' ? styles.toggleBtnActive : styles.toggleBtn),
                  flex: 1,
                  textAlign: 'center'
                }}
                onClick={() => setFilterType('date')}
              >
                Date
              </button>
              <button
                style={{
                  ...(filterType === 'range' ? styles.toggleBtnActive : styles.toggleBtn),
                  flex: 1,
                  textAlign: 'center'
                }}
                onClick={() => setFilterType('range')}
              >
                Range
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }}>
              {filterType === 'date' ? (
                <input
                  type="date"
                  style={{ ...styles.dateInput, width: '100%' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              ) : (
                <>
                  <input
                    type="date"
                    style={{ ...styles.dateInput, flex: 1, minWidth: 0 }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span style={{ color: '#94a3b8', flexShrink: 0 }}>-</span>
                  <input
                    type="date"
                    style={{ ...styles.dateInput, flex: 1, minWidth: 0 }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </>
              )}
              <button onClick={() => initFlow()} style={styles.refreshBtn} disabled={isRefreshing}>
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        <div style={{
          ...styles.statsRow,
          flexDirection: 'row',
        }}>
          <div style={{ ...styles.statCard, flex: 1 }}>
            <div style={styles.statIconBox}><Timer size={20} color="white" /></div>
            <div>
              <div style={styles.statLabel}>Total Hours</div>
              <div style={styles.statValue}>{stats.totalDuration}</div>
              <div style={styles.statSub}>Selected Period</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: THEME_GREEN }} />
          </div>
        ) : finalLogs.length > 0 ? (
          isMobile ? (
            <div style={styles.cardGrid}>
              {finalLogs.map((log) => {
                const isLoggedOut = !!log.logout_at;
                const { name, id, isOwner, actualMode } = getLogDetails(log);

                return (
                  <div key={log.id} style={{ ...styles.mobileCard, borderLeft: isOwner ? `4px solid ${THEME_GREEN}` : `1px solid ${BORDER_COLOR}` }}>
                    <div style={styles.mobileCardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                        <Calendar size={14} /> {new Date(log.login_at).toLocaleDateString('en-GB')}
                      </div>
                      {isLoggedOut ? (
                        <span style={styles.badgeInactive}>Completed</span>
                      ) : (
                        <span style={styles.badgeActive}>Active Now</span>
                      )}
                    </div>
                    <div style={styles.mobileCardBody}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: TEXT_DARK }}>{name}</div>
                            <span style={actualMode === "ADMIN" ? styles.modeAdmin : styles.modeStore}>
                              {actualMode}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>ID: {id}</div>
                        </div>
                        {!isLoggedOut && (
                          <button onClick={() => handleForceLogout(log.id)} style={styles.mobileForceBtn}>
                            <PowerOff size={14} /> <span style={styles.hideOnVerySmall}>End</span>
                          </button>
                        )}
                      </div>
                      <div style={styles.mobileTimeGrid}>
                        <div style={styles.mobileTimeItem}>
                          <span style={styles.mobileTimeLabel}><LogIn size={10} /> Login</span>
                          <span style={{ color: THEME_GREEN, fontWeight: '700' }}>{formatTime(log.login_at)}</span>
                        </div>
                        <div style={styles.mobileTimeItem}>
                          <span style={styles.mobileTimeLabel}><LogOut size={10} /> Logout</span>
                          <span style={{ color: '#ef4444', fontWeight: '700' }}>{isLoggedOut ? formatTime(log.logout_at) : '-- : --'}</span>
                        </div>
                        <div style={styles.mobileTimeItem}>
                          <span style={styles.mobileTimeLabel}><Hourglass size={10} /> Dur</span>
                          <span style={{ fontWeight: '700' }}>{calculateDurationDisplay(log.login_at, log.logout_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.tableCard}>
              <div style={styles.tableResponsiveWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>DATE</th>
                      <th style={styles.th}>TYPE</th>
                      <th style={styles.th}>NAME</th>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>LOGIN</th>
                      <th style={styles.th}>LOGOUT</th>
                      <th style={styles.th}>DURATION</th>
                      <th style={styles.th}>MODE</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalLogs.map((log) => {
                      const isLoggedOut = !!log.logout_at;
                      const { name, id, isOwner, actualMode } = getLogDetails(log);

                      return (
                        <tr key={log.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="#64748b" />{new Date(log.login_at).toLocaleDateString('en-GB')}</div>
                          </td>
                          <td style={styles.td}>
                            <span style={{ color: isOwner ? THEME_GREEN : '#64748b', fontWeight: '800', fontSize: '11px' }}>
                              {isOwner ? "OWNER" : "STAFF"}
                            </span>
                          </td>
                          <td style={{ ...styles.td, fontWeight: '700', color: TEXT_DARK }}>{name}</td>
                          <td style={styles.td}><span style={styles.monoBadge}>{id}</span></td>
                          <td style={{ ...styles.td, color: THEME_GREEN, fontWeight: '700' }}>{formatTime(log.login_at)}</td>
                          <td style={{ ...styles.td, color: '#ef4444' }}>{isLoggedOut ? formatTime(log.logout_at) : '-- : --'}</td>
                          <td style={{ ...styles.td, fontWeight: '700' }}>{calculateDurationDisplay(log.login_at, log.logout_at)}</td>
                          <td style={styles.td}>
                            <span style={actualMode === "ADMIN" ? styles.modeAdmin : styles.modeStore}>
                              {actualMode}
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {isLoggedOut ? <span style={styles.badgeInactive}>Completed</span> : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <span style={styles.badgeActive}>Active</span>
                                <button onClick={() => handleForceLogout(log.id)} style={styles.forceBtn} title="Force Logout"><PowerOff size={12} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px', border: `1px dashed ${BORDER_COLOR}` }}>
            No records found for this period.
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: TEXT_DARK, boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  container: { maxWidth: "1400px", margin: "0 auto", boxSizing: 'border-box' },
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' },
  headerInner: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: 'clamp(16px, 4vw, 20px)', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  topRightActions: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', color: '#334155', fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%', boxSizing: 'border-box' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '10px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', boxSizing: 'border-box' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: TEXT_DARK, background: 'transparent' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '12px', boxSizing: 'border-box' },
  toggleContainer: { background: '#e2e8f0', padding: '4px', borderRadius: '8px', boxSizing: 'border-box' },
  toggleBtn: { padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer', borderRadius: '6px', boxSizing: 'border-box', whiteSpace: 'nowrap' },
  toggleBtnActive: { padding: '8px 12px', border: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: THEME_GREEN, cursor: 'pointer', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', boxSizing: 'border-box', whiteSpace: 'nowrap' },
  dateInput: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER_COLOR}`, outline: 'none', fontSize: '13px', color: TEXT_DARK, fontWeight: '600', background: 'white', boxSizing: 'border-box' },
  refreshBtn: { width: '36px', height: '36px', borderRadius: '8px', background: THEME_GREEN, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', width: '100%', boxSizing: 'border-box' },
  statCard: { minWidth: '0', background: 'white', padding: '16px', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.03)', boxSizing: 'border-box' },
  statIconBox: { width: '40px', height: '40px', borderRadius: '10px', background: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' },
  statValue: { fontSize: '18px', fontWeight: '800', color: TEXT_DARK, lineHeight: 1 },
  statSub: { fontSize: '10px', color: '#94a3b8', marginTop: '2px' },

  // Table fixes
  tableCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', width: '100%', boxSizing: 'border-box' },
  tableResponsiveWrapper: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }, // min-width ensures it doesn't squish contents, relies on wrapper to scroll
  th: { padding: '16px 20px', background: THEME_GREEN, color: 'white', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  tr: { borderBottom: `1px solid ${BORDER_COLOR}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '14px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' },

  // Card Grid fixes (Allows side-by-side cards on tablets)
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%', boxSizing: 'border-box' },

  monoBadge: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: TEXT_DARK, border: '1px solid #e2e8f0' },
  mobileCard: { background: 'white', borderRadius: '12px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' },
  mobileCardHeader: { padding: '12px', background: '#f8fafc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mobileCardBody: { padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 },
  mobileForceBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
  mobileTimeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginTop: 'auto' },
  mobileTimeItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', textAlign: 'center' },
  mobileTimeLabel: { fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'flex', gap: '2px', alignItems: 'center' },
  badgeActive: { background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  badgeInactive: { background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  forceBtn: { background: '#fee2e2', border: '1px solid #fca5a5', width: '24px', height: '24px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modeAdmin: { background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' },
  modeStore: { background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' },
  hideOnVerySmall: { '@media (max-width: 360px)': { display: 'none' } }
};

export default LoginTimings;