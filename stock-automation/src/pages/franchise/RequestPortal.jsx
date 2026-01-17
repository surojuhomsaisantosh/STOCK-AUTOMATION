import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  SendHorizontal, 
  User, 
  Headphones,
  Loader2,
  Package,
  Wrench, 
  ReceiptText,
  MessageSquare,
  Activity,
  CheckCircle2,
  RotateCcw,
  History,
  X,
  Clock,
  ChevronRight
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const WHITE = "#ffffff";

function RequestPortal() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  // UI States
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pastTickets, setPastTickets] = useState([]);
  
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
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch history including admin replies
  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("requests")
      .select("*") // Ensure reply_message is selected
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPastTickets(data || []);
  };

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
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
      const { data: profile } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      
      const { error } = await supabase.from("requests").insert([{
          user_id: user.id,
          franchise_id: profile?.franchise_id || "N/A",
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
            <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /> {!isMobile && <span>Exit</span>}</button>
          </div>
          <div style={styles.headerCenter}>
            <h1 style={styles.headerTitle}>Support Portal</h1>
            <div style={styles.statusBadge}><div style={styles.pulse}></div><span>Agent Online</span></div>
          </div>
          <div style={styles.headerRight}>
             <button onClick={() => setShowHistory(true)} style={styles.historyBtn}><History size={20} /></button>
          </div>
        </header>

        {/* CHAT AREA */}
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
                  <span style={{...styles.timestamp, textAlign: chat.role === "user" ? 'right' : 'left'}}>{chat.role === "user" ? "You" : "Bot"} • {chat.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {chat.role === "user" && <div style={styles.userAvatar}><User size={18} /></div>}
              </div>
            ))}
            {loading && <div style={styles.loadingState}><Loader2 size={16} className="animate-spin" /><span>Syncing...</span></div>}
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
                <h2 style={{margin:0, fontSize: '18px', fontWeight: '800'}}>Your Request History</h2>
                <button onClick={() => setShowHistory(false)} style={styles.closeBtn}><X size={24} /></button>
            </div>
            <div style={styles.drawerBody}>
                {pastTickets.length === 0 ? (
                    <div style={{textAlign:'center', padding: '40px', color: '#999'}}>No past tickets found.</div>
                ) : pastTickets.map((t) => (
                    <div key={t.id} style={{
                        ...styles.ticketCard,
                        borderLeft: `4px solid ${t.status === 'Closed' ? PRIMARY : '#f59e0b'}`
                    }}>
                        <div style={{display:'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                            <span style={styles.ticketId}>{t.ticket_id}</span>
                            <span style={{
                                ...styles.statusBadgeInner, 
                                backgroundColor: t.status === 'Closed' ? '#f0fdf4' : '#fffbeb', 
                                color: t.status === 'Closed' ? PRIMARY : '#d97706'
                            }}>
                                {t.status.toUpperCase()}
                            </span>
                        </div>
                        
                        <div style={{marginBottom: '12px'}}>
                            <label style={styles.miniLabel}>YOUR REQUEST:</label>
                            <p style={styles.ticketMsg}>{t.message}</p>
                        </div>

                        {/* ✅ ADMIN REPLY SECTION */}
                        {t.reply_message && (
                            <div style={styles.replyBox}>
                                <div style={styles.replyHeader}>
                                    <Headphones size={12} />
                                    <span>ADMIN RESPONSE:</span>
                                </div>
                                <p style={styles.replyText}>{t.reply_message}</p>
                            </div>
                        )}

                        {!t.reply_message && t.status === 'pending' && (
                            <div style={styles.pendingHint}>
                                <Clock size={12} />
                                <span>Awaiting admin response...</span>
                            </div>
                        )}

                        <div style={styles.ticketDate}>
                            {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        main::-webkit-scrollbar { display: none; }
        main { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

const styles = {
  page: { display: 'flex', height: '100vh', width: '100vw', fontFamily: '"Inter", sans-serif', backgroundColor: WHITE, overflow: 'hidden' },
  mainWrapper: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
  header: { height: '80px', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', backgroundColor: WHITE, zIndex: 10 },
  headerLeft: { width: '100px' },
  headerRight: { width: '100px', display: 'flex', justifyContent: 'flex-end' },
  headerCenter: { flex: 1, textAlign: 'center' },
  backBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#666' },
  historyBtn: { background: '#f3f5f4', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: PRIMARY },
  headerTitle: { fontSize: '18px', fontWeight: '800', color: '#000', margin: 0 },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: PRIMARY, marginTop: '2px' },
  pulse: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: PRIMARY, animation: 'pulse 2s infinite ease-in-out' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '20px 16px 40px 16px', backgroundColor: '#fff' },
  messageContainer: { maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  botAvatar: { width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#f3f5f4', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatar: { width: '36px', height: '36px', borderRadius: '12px', border: `1.5px solid ${PRIMARY}`, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { padding: '14px 18px', fontWeight: '500', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  timestamp: { fontSize: '10px', fontWeight: '600', color: '#aaa', marginTop: '6px', display: 'block', padding: '0 4px' },
  menuGrid: { display: 'grid', gap: '8px', marginTop: '16px' },
  menuBtn: { backgroundColor: WHITE, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#333' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', color: PRIMARY, fontSize: '11px', fontWeight: '700', marginTop: '12px', cursor: 'pointer', opacity: 0.8 },
  footer: { padding: '20px 24px', borderTop: '1px solid #f0f0f0', backgroundColor: WHITE },
  form: { maxWidth: '750px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' },
  input: { flex: 1, background: '#f7f9f8', padding: '16px 20px', borderRadius: '16px', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '500' },
  sendBtn: { width: '52px', height: '52px', border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingState: { display: 'flex', alignItems: 'center', gap: '8px', color: '#999', fontSize: '12px', fontWeight: '600', marginLeft: '48px' },
  
  // History Drawer Styles
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' },
  historyDrawer: { width: 'min(450px, 90vw)', backgroundColor: WHITE, height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  drawerHeader: { padding: '24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#666' },
  drawerBody: { flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#fafafa' },
  ticketCard: { padding: '16px', backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  ticketId: { fontSize: '11px', fontWeight: '800', color: '#000' },
  statusBadgeInner: { padding: '4px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '900' },
  miniLabel: { fontSize: '9px', fontWeight: '800', color: '#aaa', letterSpacing: '0.5px' },
  ticketMsg: { fontSize: '14px', color: '#444', margin: '4px 0', fontWeight: '500' },
  replyBox: { marginTop: '12px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' },
  replyHeader: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: '800', color: PRIMARY, marginBottom: '4px' },
  replyText: { fontSize: '13px', color: '#064e3b', margin: 0, lineHeight: '1.4', fontWeight: '600' },
  pendingHint: { marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d97706', fontStyle: 'italic', fontWeight: '600' },
  ticketDate: { fontSize: '10px', color: '#bbb', marginTop: '12px', textAlign: 'right' }
};

export default RequestPortal;