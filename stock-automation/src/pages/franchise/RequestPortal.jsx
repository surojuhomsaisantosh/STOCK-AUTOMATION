import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, SendHorizontal, User, Headphones, Loader2, Package, Wrench, 
  ReceiptText, MessageSquare, CheckCircle2, RotateCcw, History, X, Clock, Store, Calendar
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const WHITE = "#ffffff";

function RequestPortal() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pastTickets, setPastTickets] = useState([]);
  const [franchiseId, setFranchiseId] = useState("...");
  
  const [chatHistory, setChatHistory] = useState([
    { 
      role: "bot", 
      content: "Hello! I am your Support Assistant. Please select a category to begin your request.",
      isMenu: true,
      time: new Date()
    }
  ]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchFranchiseId();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFranchiseId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        if (data) setFranchiseId(data.franchise_id);
      }
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPastTickets(data || []);
  };

  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory, loading]);

  const menuOptions = [
    { label: "Stock Issue", icon: <Package size={18} />, value: "STOCK" },
    { label: "Technical Fault", icon: <Wrench size={18} />, value: "TECH" },
    { label: "Billing Query", icon: <ReceiptText size={18} />, value: "BILLING" },
    { label: "Other", icon: <MessageSquare size={18} />, value: "OTHER" },
  ];

  const logRequest = async (content, category, ticketId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("requests").insert([{
          user_id: user.id,
          franchise_id: franchiseId || "N/A",
          ticket_id: `#${ticketId}`, 
          message: content,
          status: 'pending'
      }]);
      return !error;
    } catch (err) { return false; }
  };

  const handleOptionClick = (opt) => {
    setActiveCategory(opt.label);
    setChatHistory(prev => [...prev, { role: "user", content: opt.label, time: new Date() }]);
    setLoading(true);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        role: "bot", 
        content: `Got it. You've selected "${opt.label}". Now, please describe your problem below.`,
        isReset: true, 
        time: new Date()
      }]);
      setLoading(false);
    }, 600);
  };

  const resetCategory = () => {
    setActiveCategory(null);
    setChatHistory(prev => [...prev, { 
        role: "bot", 
        content: "Understood. Please select a different category:",
        isMenu: true,
        time: new Date() 
    }]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    const userMsg = message;
    const ticketId = Math.floor(Math.random() * 89999 + 10000); 
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg, time: new Date() }]);
    setMessage("");
    setLoading(true);
    const success = await logRequest(userMsg, activeCategory || "GENERAL", ticketId);
    setTimeout(() => {
      setChatHistory((prev) => [...prev, { 
        role: "bot", 
        content: success ? `Success! Your request logged as Ticket #${ticketId}.` : "Error. Try again.",
        isSuccess: success,
        time: new Date()
      }]);
      setLoading(false);
      setActiveCategory(null); 
    }, 1000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.mainWrapper}>
        
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={20} /> {!isMobile && <span> Back</span>}
            </button>
          </div>
          
          <div style={styles.headerCenter}>
            <h1 style={styles.headerTitle}>Support Portal</h1>
          </div>

          <div style={styles.headerRight}>
             {!isMobile && (
               <>
                 <div style={styles.dateCard}>
                    <Calendar size={14} color="#64748b" />
                    <div style={styles.dateTextGroup}>
                        <span style={styles.dateLabel}>TODAY</span>
                        <span style={styles.dateVal}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                    </div>
                 </div>

                 <div style={styles.idBadge}>
                    <Store size={14} />
                    <span>Franchise ID : <span style={{fontWeight: 900}}>{franchiseId}</span></span>
                 </div>
               </>
             )}
             <button onClick={() => setShowHistory(true)} style={styles.historyBtn} title="View History">
               <History size={20} />
             </button>
          </div>
        </header>

        <main ref={scrollRef} style={styles.chatArea}>
          <div style={styles.messageContainer}>
            {chatHistory.map((chat, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: chat.role === "user" ? "flex-end" : "flex-start", alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                {chat.role === "bot" && <div style={styles.botAvatar}><Headphones size={18} /></div>}
                <div style={{maxWidth: '75%'}}>
                  <div style={{ ...styles.bubble, backgroundColor: chat.role === "user" ? PRIMARY : "#f3f5f4", color: chat.role === "user" ? WHITE : "#1a1a1a", borderRadius: chat.role === "user" ? '18px 18px 2px 18px' : '2px 18px 18px 18px', border: chat.isSuccess ? `1.5px solid ${PRIMARY}` : 'none' }}>
                    {chat.isSuccess && <CheckCircle2 size={16} style={{marginBottom: '8px', color: PRIMARY}} />}
                    <p style={{margin: 0, fontSize: '15px', lineHeight: '1.5'}}>{chat.content}</p>
                    {chat.isMenu && (
                      <div style={{...styles.menuGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
                        {menuOptions.map((opt) => (
                          <button key={opt.value} onClick={() => handleOptionClick(opt)} style={styles.menuBtn}>
                            <span style={{color: PRIMARY}}>{opt.icon}</span><span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {chat.isReset && (
                        <button onClick={resetCategory} style={styles.resetBtn}>
                            <RotateCcw size={14} /> Change Category
                        </button>
                    )}
                  </div>
                  <span style={{...styles.timestamp, textAlign: chat.role === "user" ? 'right' : 'left'}}>{chat.role === "user" ? "You" : "Support"} • {chat.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {chat.role === "user" && <div style={styles.userAvatar}><User size={18} /></div>}
              </div>
            ))}
            {loading && <div style={styles.loadingState}><Loader2 size={16} className="animate-spin" /><span>Processing Request...</span></div>}
          </div>
        </main>

        <footer style={styles.footer}>
          <form onSubmit={handleSendMessage} style={styles.form}>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={activeCategory ? `Describe your ${activeCategory}...` : "Select a category first..."} style={styles.input} disabled={loading || !activeCategory} />
            <button type="submit" disabled={loading || !message.trim() || !activeCategory} style={{ ...styles.sendBtn, backgroundColor: (loading || !message.trim() || !activeCategory) ? '#f0f0f0' : PRIMARY }}>
              <SendHorizontal size={22} color={WHITE} />
            </button>
          </form>
        </footer>
      </div>

      {/* HISTORY DRAWER */}
      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={styles.historyDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
                <h2 style={{margin:0, fontSize: '18px', fontWeight: '800'}}>Support History</h2>
                <button onClick={() => setShowHistory(false)} style={styles.closeBtn}><X size={24} /></button>
            </div>
            <div style={styles.drawerBody}>
                {pastTickets.length === 0 ? (
                    <div style={{textAlign:'center', padding: '40px', color: '#94a3b8'}}>No request history found.</div>
                ) : pastTickets.map((t) => (
                    <div key={t.id} style={{...styles.ticketCard, borderLeft: `4px solid ${t.status === 'Closed' ? PRIMARY : '#f59e0b'}`}}>
                        <div style={{display:'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                            <span style={styles.ticketId}>{t.ticket_id}</span>
                            <span style={{...styles.statusBadgeInner, backgroundColor: t.status === 'Closed' ? '#f0fdf4' : '#fffbeb', color: t.status === 'Closed' ? PRIMARY : '#d97706'}}>
                                {t.status.toUpperCase()}
                            </span>
                        </div>
                        <div style={{marginBottom: '12px'}}>
                            <label style={styles.miniLabel}>QUERY:</label>
                            <p style={styles.ticketMsg}>{t.message}</p>
                        </div>
                        {t.reply_message && (
                            <div style={styles.replyBox}>
                                <div style={styles.replyHeader}><Headphones size={12} /><span>RESPONSE:</span></div>
                                <p style={styles.replyText}>{t.reply_message}</p>
                            </div>
                        )}
                        <div style={styles.ticketDate}>{new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { display: 'flex', height: '100vh', width: '100vw', fontFamily: '"Inter", sans-serif', backgroundColor: WHITE, overflow: 'hidden' },
  mainWrapper: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
  header: { height: '80px', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', backgroundColor: WHITE, zIndex: 10 },
  headerLeft: { width: '200px' },
  headerRight: { width: 'fit-content', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' },
  headerCenter: { flex: 1, textAlign: 'center' },
  backBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#64748b' },
  historyBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: PRIMARY },
  headerTitle: { fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  
  dateCard: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  dateTextGroup: { display: 'flex', flexDirection: 'column', lineHeight: 1 },
  dateLabel: { fontSize: '8px', fontWeight: '800', color: '#94a3b8' },
  dateVal: { fontSize: '12px', fontWeight: '900', color: '#1e293b' },

  idBadge: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', color: '#166534', border: '1px solid #dcfce7' },

  chatArea: { flex: 1, overflowY: 'auto', padding: '20px 16px 40px 16px', backgroundColor: '#fff' },
  messageContainer: { maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' },
  botAvatar: { width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f1f5f9', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatar: { width: '40px', height: '40px', borderRadius: '14px', border: `2px solid ${PRIMARY}`, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { padding: '16px 20px', fontWeight: '500', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
  timestamp: { fontSize: '10px', fontWeight: '700', color: '#cbd5e1', marginTop: '8px', display: 'block', padding: '0 4px' },
  menuGrid: { display: 'grid', gap: '10px', marginTop: '16px' },
  menuBtn: { backgroundColor: WHITE, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#334155', transition: '0.2s' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', color: PRIMARY, fontSize: '11px', fontWeight: '800', marginTop: '12px', cursor: 'pointer' },
  footer: { padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: WHITE },
  form: { maxWidth: '750px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' },
  input: { flex: 1, background: '#f8fafc', padding: '18px 24px', borderRadius: '18px', border: '1px solid #f1f5f9', outline: 'none', fontSize: '15px', fontWeight: '500', color: '#1e293b' },
  sendBtn: { width: '56px', height: '56px', border: 'none', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  loadingState: { display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginLeft: '52px' },
  
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' },
  historyDrawer: { width: 'min(480px, 95vw)', backgroundColor: WHITE, height: '100%', boxShadow: '-20px 0 50px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' },
  drawerHeader: { padding: '28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' },
  drawerBody: { flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' },
  ticketCard: { padding: '20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '20px' },
  ticketId: { fontSize: '11px', fontWeight: '900', color: '#1e293b' },
  statusBadgeInner: { padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900' },
  miniLabel: { fontSize: '9px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px' },
  ticketMsg: { fontSize: '15px', color: '#334155', margin: '6px 0', fontWeight: '600', lineHeight: 1.5 },
  replyBox: { marginTop: '16px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' },
  replyHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: PRIMARY, marginBottom: '6px' },
  replyText: { fontSize: '14px', color: '#064e3b', margin: 0, lineHeight: '1.6', fontWeight: '600' },
  ticketDate: { fontSize: '10px', color: '#94a3b8', marginTop: '16px', textAlign: 'right', fontWeight: '700' }
};

export default RequestPortal;