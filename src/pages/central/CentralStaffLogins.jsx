import React, { useState, useEffect, useRef, useMemo } from "react";
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
const ITEMS_PER_INVOICE_PAGE = 15;

// --- HELPERS ---
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  return dateStr.includes('Z') || dateStr.includes('+')
    ? new Date(dateStr)
    : new Date(dateStr.replace(' ', 'T') + "Z");
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const amountToWords = (price) => {
  if (!price) return "";
  const num = Math.round(price);
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return;
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  }
  return inWords(num) + " Rupees Only";
};

// --- INVOICE PRINT COMPONENT ---
const FullPageInvoice = ({ order, companyDetails, pageIndex, totalPages, itemsChunk }) => {
  if (!order) return null;
  const companyName = companyDetails?.company_name || "";
  // LOGO FETCHED DYNAMICALLY FROM BUCKET URL
  const currentLogo = companyDetails?.logo_url || null;

  const invDate = new Date(order.login_at).toLocaleDateString('en-GB');
  const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'LOG-DATA';
  const emptyRowsCount = Math.max(0, ITEMS_PER_INVOICE_PAGE - itemsChunk.length);

  return (
    <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
      <div className="w-full border-2 border-black flex flex-col relative flex-1">
        <div className="p-3 border-b-2 border-black relative">
          <div className="absolute top-2 left-0 w-full text-center pointer-events-none">
            <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4 text-black">STAFF SESSION LOG</h1>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3">
            <div className="text-left z-10 w-[55%]">
              <span className="uppercase underline mb-1 block text-black font-black text-[10px]">Registered Office:</span>
              <p className="whitespace-pre-wrap text-black text-[10px] leading-tight">{companyDetails?.company_address || ""}</p>
              <div className="mt-1 space-y-0.5 text-[10px]">
                {companyDetails?.company_gst && <p className="text-black">GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
                {companyDetails?.company_email && <p className="text-black">Email: {companyDetails.company_email}</p>}
              </div>
            </div>
            <div className="z-10 flex flex-col items-center text-center max-w-[40%]">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Logo"
                  crossOrigin="anonymous"
                  className="h-12 w-auto object-contain mb-1"
                />
              ) : (
                <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black mb-1">NO LOGO</div>
              )}
              <h2 className="text-base font-black uppercase text-black leading-tight">{companyName}</h2>
            </div>
          </div>
        </div>

        <div className="flex border-b-2 border-black bg-slate-50 text-black">
          <div className="w-1/2 border-r-2 border-black py-1 px-3">
            <span className="font-bold text-black uppercase text-[9px]">Log Ref:</span>
            <p className="font-black text-sm text-black">#{orderId}</p>
          </div>
          <div className="w-1/2 py-1 px-3">
            <span className="font-bold text-black uppercase text-[9px]">Log Date:</span>
            <p className="font-black text-sm text-black">{invDate}</p>
          </div>
        </div>
        {/* Simplified log table for printing session details */}
        <div className="flex-1 border-b-2 border-black">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-[10px] border-b-2 border-black font-black">
              <tr><th className="p-2 border-r border-black/10">Type</th><th className="p-2 border-r border-black/10">Time</th><th className="p-2">Location / IP</th></tr>
            </thead>
            <tbody className="text-[10px] font-bold">
              <tr className="h-[26px] border-b border-black/10">
                <td className="p-2 border-r border-black/10 uppercase">LOGIN</td>
                <td className="p-2 border-r border-black/10">{new Date(order.login_at).toLocaleTimeString()}</td>
                <td className="p-2">{order.franchise_id}</td>
              </tr>
              {order.logout_at && (
                <tr className="h-[26px] border-b border-black/10">
                  <td className="p-2 border-r border-black/10 uppercase">LOGOUT</td>
                  <td className="p-2 border-r border-black/10">{new Date(order.logout_at).toLocaleTimeString()}</td>
                  <td className="p-2">Session Ended</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CentralStaffLogins = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { targetUserId, franchiseId, isOwner } = location.state || {};
  const getCacheKey = () => `logs_${franchiseId}_${targetUserId || 'all'}`;

  const [logs, setLogs] = useState(() => {
    if (!franchiseId) return [];
    const cached = sessionStorage.getItem(getCacheKey());
    return cached ? JSON.parse(cached) : [];
  });

  const [loading, setLoading] = useState(() => !sessionStorage.getItem(getCacheKey()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [companyDetails, setCompanyDetails] = useState(null);
  const isMobile = windowWidth < 768;

  const [filterType, setFilterType] = useState("date");
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  const channelRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    if (!franchiseId) return;

    fetchLogs(franchiseId, targetUserId);
    setupRealtime(franchiseId);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [targetUserId, franchiseId, isOwner]);

  const getStaffDetails = (log) => {
    let profile = log.staff_profiles;
    if (Array.isArray(profile)) profile = profile[0];
    if (profile) return { name: String(profile.name || "Unknown"), id: String(profile.staff_id || "N/A"), isOwner: false };
    return { name: "Owner / Admin", id: String(log.franchise_id || franchiseId || "ADMIN"), isOwner: true };
  };

  const calculateDurationDisplay = (startStr, endStr) => {
    if (!endStr) return "Active";
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = Math.max(0, end - start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleForceLogout = async (logId) => {
    if (!window.confirm("⚠️ Force end this session?")) return;
    try {
      const { error } = await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).eq('id', logId);
      if (error) throw error;
      alert("✅ Session ended.");
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  const setupRealtime = (fid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`central-logs-${fid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs', filter: `franchise_id=eq.${fid}` }, () => fetchLogs(fid, targetUserId, false))
      .subscribe();
    channelRef.current = channel;
  };

  const fetchLogs = async (fid, specificTargetId, showLoading = true) => {
    if (showLoading && !(Array.isArray(logs) && logs.length)) setLoading(true);
    if (showLoading) setIsRefreshing(true);

    try {
      // DYNAMIC COMPANY RESOLUTION
      const { data: branchProfile } = await supabase.from('profiles').select('company').eq('franchise_id', fid).single();
      if (branchProfile?.company) {
        const { data: compData } = await supabase.from('companies').select('*').eq('company_name', branchProfile.company).single();
        setCompanyDetails(compData);
      }

      let resolvedIsOwner = isOwner;
      if (specificTargetId && resolvedIsOwner === undefined && specificTargetId !== "ADMIN") {
        const { data: staffData } = await supabase.from('staff_profiles').select('id').eq('id', specificTargetId).maybeSingle();
        resolvedIsOwner = !staffData;
      }

      let query = supabase.from('login_logs').select(`*, staff_profiles( name, staff_id )`).eq('franchise_id', fid).order('login_at', { ascending: false });
      if (specificTargetId) {
        if (resolvedIsOwner || specificTargetId === "ADMIN") query = query.or(`staff_id.is.null,staff_id.eq.${specificTargetId}`);
        else query = query.eq('staff_id', specificTargetId);
      }

      const { data, error } = await query;
      console.log("Fetched logs data:", data, "Error:", error);

      if (!error) {
        const safeData = Array.isArray(data) ? data : [];
        setLogs(safeData);
        sessionStorage.setItem(getCacheKey(), JSON.stringify(safeData));
      } else {
        console.error("Supabase Fetch Error:", error);
        alert("Failed to fetch logs: " + error.message);
      }
    } catch (err) {
      console.error("Fetch Exception:", err);
      alert("Error: " + err.message);
    } finally {
      if (showLoading) setIsRefreshing(false);
      setLoading(false);
    }
  };

  const finalLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    const filtered = logs.filter(log => {
      const { name, id } = getStaffDetails(log);
      const safeSearch = String(searchTerm || "").toLowerCase();
      const matchesSearch = String(name || "").toLowerCase().includes(safeSearch) || String(id || "").toLowerCase().includes(safeSearch);
      if (!matchesSearch) return false;

      if (!log.login_at) return true; // Include if no date

      // Fix date filtering using actual local date fields to ensure exact match avoiding timezone shift comparisons
      const logDateObj = new Date(log.login_at);
      const year = logDateObj.getFullYear();
      const month = String(logDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(logDateObj.getDate()).padStart(2, '0');
      const logDate = `${year}-${month}-${day}`;

      if (filterType === 'date') {
        if (!selectedDate) return true;
        return logDate === selectedDate;
      } else {
        if (!startDate && !endDate) return true;
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
      }
    });
    console.log("Filtered logs (showing on screen):", filtered);
    return filtered;
  }, [logs, searchTerm, filterType, selectedDate, startDate, endDate]);

  const stats = useMemo(() => {
    let totalSeconds = 0;
    finalLogs.forEach(log => {
      const start = new Date(log.login_at);
      const end = log.logout_at ? new Date(log.logout_at) : new Date();
      const diff = (end - start) / 1000;
      if (diff > 0 && diff < 86400) totalSeconds += diff;
    });
    return { totalDuration: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m` };
  }, [finalLogs]);

  if (!franchiseId) return <div className="p-20 text-center"><h2>No Franchise Context Found</h2><button onClick={() => navigate(-1)} className="mt-4 p-2 bg-black text-white rounded">Go Back</button></div>;

  return (
    <div style={styles.page}>
      <style>{`
        @media print { 
            .no-print { display: none !important; } 
            .print-only { display: block !important; width: 100%; } 
            body { background: white; margin: 0; padding: 0; } 
            @page { margin: 0; size: A4; } 
            .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; }
            .a4-page:last-child { page-break-after: auto; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* --- PRINT ONLY LAYER --- */}
      <div className="print-only hidden print:block bg-white">
        {finalLogs.length > 0 && finalLogs.slice(0, 1).map((log, index) => (
          <FullPageInvoice
            key={index}
            order={log}
            companyDetails={companyDetails}
            pageIndex={0}
            totalPages={1}
            itemsChunk={[]} // Items not needed for login logs
          />
        ))}
      </div>

      <header className="no-print" style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={18} /> <span>Back</span></button>
          <h1 style={styles.heading}>User <span style={{ color: THEME_GREEN }}>Timings</span></h1>
          <div style={styles.idBox}>ID : {franchiseId}</div>
        </div>
      </header>

      <div className="no-print" style={{ ...styles.container, padding: isMobile ? '20px 15px' : '20px' }}>
        <div style={{ ...styles.controlsRow, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px' }}>
          <div style={{ ...styles.searchContainer, width: isMobile ? '100%' : '300px' }}>
            <Search size={18} color="#94a3b8" /><input placeholder="Search Name or ID..." style={styles.searchInput} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ ...styles.filterGroup, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ ...styles.toggleContainer, width: isMobile ? '100%' : 'auto', display: 'flex' }}>
              <button style={filterType === 'date' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('date')}>Date</button>
              <button style={filterType === 'range' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setFilterType('range')}>Range</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
              {filterType === 'date' ? (
                <input type="date" style={{ ...styles.dateInput, width: '100%' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              ) : (
                <><input type="date" style={{ ...styles.dateInput, flex: 1 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} /><span className="self-center">-</span><input type="date" style={{ ...styles.dateInput, flex: 1 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></>
              )}
              <button onClick={() => fetchLogs(franchiseId, targetUserId)} style={styles.refreshBtn}><RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /></button>
            </div>
          </div>
        </div>

        <div style={{ ...styles.statsRow, flexDirection: 'row' }}>
          <div style={{ ...styles.statCard, flex: 1 }}><div style={styles.statIconBox}><Timer size={20} color="white" /></div><div><div style={styles.statLabel}>Total Hours</div><div style={styles.statValue}>{stats.totalDuration}</div></div></div>
        </div>

        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin inline" size={32} color={THEME_GREEN} /></div> : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {finalLogs.map((log) => {
                const isLoggedOut = !!log.logout_at;
                const { name, id, isOwner } = getStaffDetails(log);
                return (
                  <div key={log.id} style={{ ...styles.mobileCard, borderLeft: isOwner ? `4px solid ${THEME_GREEN}` : `1px solid ${BORDER_COLOR}` }}>
                    <div style={styles.mobileCardHeader}>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Calendar size={12} /> {new Date(log.login_at).toLocaleDateString('en-GB')}</div>
                      <span style={isLoggedOut ? styles.badgeInactive : styles.badgeActive}>{isLoggedOut ? "Completed" : "Active"}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div><div className="font-black uppercase text-sm">{name}</div><div className="text-[10px] font-bold text-slate-400">ID: {id}</div></div>
                        {!isLoggedOut && <button onClick={() => handleForceLogout(log.id)} style={styles.mobileForceBtn}><PowerOff size={12} /> End</button>}
                      </div>
                      <div style={styles.mobileTimeGrid}>
                        <div className="text-center"><span className="block text-[8px] text-slate-400">LOGIN</span><span className="font-bold text-xs">{formatTime(log.login_at)}</span></div>
                        <div className="text-center"><span className="block text-[8px] text-slate-400">LOGOUT</span><span className="font-bold text-xs">{isLoggedOut ? formatTime(log.logout_at) : '--:--'}</span></div>
                        <div className="text-center"><span className="block text-[8px] text-slate-400">DURATION</span><span className="font-bold text-xs">{calculateDurationDisplay(log.login_at, log.logout_at)}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>DATE</th><th style={styles.th}>TYPE</th><th style={styles.th}>NAME</th><th style={styles.th}>ID</th><th style={styles.th}>LOGIN</th><th style={styles.th}>LOGOUT</th><th style={styles.th}>DURATION</th><th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th></tr></thead>
                <tbody>
                  {finalLogs.map((log) => {
                    const isLoggedOut = !!log.logout_at;
                    const { name, id, isOwner } = getStaffDetails(log);
                    return (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(log.login_at).toLocaleDateString('en-GB')}</td>
                        <td style={styles.td}><span className="font-black text-[10px]" style={{ color: isOwner ? THEME_GREEN : '#64748b' }}>{isOwner ? "OWNER" : "STAFF"}</span></td>
                        <td style={{ ...styles.td, fontWeight: '800' }}>{name}</td>
                        <td style={styles.td}><span style={styles.monoBadge}>{id}</span></td>
                        <td style={{ ...styles.td, color: THEME_GREEN }}>{formatTime(log.login_at)}</td>
                        <td style={{ ...styles.td, color: '#ef4444' }}>{isLoggedOut ? formatTime(log.logout_at) : '-- : --'}</td>
                        <td style={styles.td}>{calculateDurationDisplay(log.login_at, log.logout_at)}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {!isLoggedOut && <button onClick={() => handleForceLogout(log.id)} style={styles.forceBtn}><PowerOff size={12} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { background: BG_GRAY, minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: TEXT_DARK },
  container: { maxWidth: "1400px", margin: "0 auto" },
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px' },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '10px 15px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%', background: 'transparent' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  toggleContainer: { background: '#e2e8f0', padding: '4px', borderRadius: '8px' },
  toggleBtn: { padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: '800', color: '#64748b', cursor: 'pointer' },
  toggleBtnActive: { padding: '8px 12px', border: 'none', background: 'white', fontSize: '11px', fontWeight: '800', color: THEME_GREEN, borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  dateInput: { padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER_COLOR}`, fontSize: '12px', fontWeight: '800' },
  refreshBtn: { width: '36px', height: '36px', borderRadius: '8px', background: THEME_GREEN, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', padding: '16px', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', gap: '12px' },
  statIconBox: { width: '40px', height: '40px', borderRadius: '10px', background: THEME_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: '18px', fontWeight: '900' },
  tableCard: { background: 'white', borderRadius: '16px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', background: THEME_GREEN, color: 'white', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' },
  tr: { borderBottom: `1px solid ${BORDER_COLOR}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '13px', fontWeight: '700' },
  monoBadge: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #e2e8f0' },
  mobileCard: { background: 'white', borderRadius: '12px', border: `1px solid ${BORDER_COLOR}`, overflow: 'hidden', marginBottom: '10px' },
  mobileCardHeader: { padding: '10px 16px', background: '#f8fafc', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between' },
  mobileForceBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' },
  mobileTimeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginTop: '12px' },
  badgeActive: { color: '#166534', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },
  badgeInactive: { color: '#64748b', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },
  forceBtn: { background: '#fee2e2', border: '1px solid #fca5a5', width: '24px', height: '24px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default CentralStaffLogins;