import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  CheckCircle, 
  RefreshCcw,
  User,
  Hash,
  MapPin,
  SendHorizontal,
  MessageSquare,
  Clock
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function FranchiseReplies() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reply, setReply] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("all"); 

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      /**
       * FETCH LOGIC:
       * Using 'profiles!user_id' forces the correct relationship.
       */
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          profiles!user_id (
            name,
            address,
            branch_location,
            phone,
            franchise_id
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Ensure data is flattened (converts profile array to object)
      const sanitizedData = (data || []).map(req => {
        const profileInfo = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
        return {
          ...req,
          profiles: profileInfo,
          // Safety: ensure franchise_id shows up from either table
          franchise_id: req.franchise_id || profileInfo?.franchise_id || "N/A"
        };
      });

      setRequests(sanitizedData);
    } catch (err) {
      console.error("Fetch error:", err.message);
      // Fallback: Fetch requests without profile data if the join glitches
      const { data: fallbackData } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
      setRequests(fallbackData || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (currentFilter === "all") return requests;
    return requests.filter(req => req.status === currentFilter);
  }, [requests, currentFilter]);

  const handleResolve = async () => {
    if (!selectedRequest || !reply.trim()) {
        alert("Please enter a reply message.");
        return;
    }
    setActionLoading(true);

    const { error } = await supabase
      .from("requests")
      .update({ 
        status: "Closed",
        reply_message: reply 
      })
      .eq("id", selectedRequest.id);

    if (!error) {
      setReply("");
      setSelectedRequest(null);
      fetchRequests();
    } else {
      alert("Update failed: " + error.message);
    }
    setActionLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          </div>
          <h1 style={styles.title}>GRIEVANCE TERMINAL</h1>
          <div style={styles.headerRight}>
             <button onClick={fetchRequests} style={styles.refreshBtn} title="Refresh Data">
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
        </header>

        <div style={styles.layoutGrid}>
            {/* LEFT: LIST OF TICKETS */}
            <div style={styles.listSection}>
                <div style={styles.filterBar}>
                    {['all', 'pending', 'Closed'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setCurrentFilter(status)}
                            style={{
                                ...styles.filterTab,
                                color: currentFilter === status ? PRIMARY : "#9ca3af",
                                borderBottom: currentFilter === status ? `2px solid ${PRIMARY}` : '2px solid transparent'
                            }}
                        >
                            {status.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div style={styles.scrollArea}>
                    {loading ? (
                        <div style={styles.emptyPrompt}>Syncing Terminal Data...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={styles.emptyPrompt}>No {currentFilter} requests found.</div>
                    ) : filteredRequests.map((req) => (
                        <div 
                            key={req.id} 
                            onClick={() => setSelectedRequest(req)}
                            style={{
                                ...styles.ticketItem, 
                                borderColor: selectedRequest?.id === req.id ? PRIMARY : BORDER,
                                background: selectedRequest?.id === req.id ? "#f0fdf4" : "#fff"
                            }}
                        >
                            <div style={styles.itemHeader}>
                                <span style={styles.ticketBadge}>{req.ticket_id || "NO-ID"}</span>
                                <span style={{
                                    ...styles.statusLabel,
                                    color: req.status === "Closed" ? "#10b981" : "#f59e0b",
                                    background: req.status === "Closed" ? "#ecfdf5" : "#fffbeb",
                                }}>
                                    {req.status}
                                </span>
                            </div>
                            <p style={styles.itemMsg}>{req.message}</p>
                            <div style={styles.itemMeta}>
                                <User size={10} /> {req.profiles?.name || "Unknown Franchise"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: DETAILS PANEL */}
            <div style={styles.detailSection}>
                {selectedRequest ? (
                    <div style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                            <div>
                                <h2 style={styles.detailTitle}>Ticket Details</h2>
                                <p style={styles.dateText}>Ticket ID: {selectedRequest.ticket_id}</p>
                            </div>
                            <span style={{
                                ...styles.statusLabelLarge,
                                background: selectedRequest.status === "Closed" ? "#ecfdf5" : "#fffbeb",
                                color: selectedRequest.status === "Closed" ? "#10b981" : "#f59e0b",
                            }}>
                                {selectedRequest.status.toUpperCase()}
                            </span>
                        </div>

                        <div style={styles.profileBox}>
                            <div style={styles.profileRow}>
                                <User size={16} color={PRIMARY} />
                                <span><strong>{selectedRequest.profiles?.name || "N/A"}</strong> (Franchise ID: {selectedRequest.franchise_id})</span>
                            </div>
                            <div style={styles.profileRow}>
                                <MapPin size={16} color={PRIMARY} />
                                <span>{selectedRequest.profiles?.address || "Location not provided"}</span>
                            </div>
                        </div>

                        <div style={styles.chatBubble}>
                            <label style={styles.bubbleLabel}>ISSUE DESCRIPTION</label>
                            <p style={styles.bubbleContent}>{selectedRequest.message}</p>
                        </div>

                        {selectedRequest.status === "Closed" ? (
                            <div style={styles.closedNote}>
                                <CheckCircle size={20} />
                                <div>
                                    <strong style={{fontSize: '14px'}}>Official Resolution Sent</strong>
                                    <p style={{margin: '5px 0 0 0', fontSize: '13px', lineHeight: '1.5'}}>{selectedRequest.reply_message}</p>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.replyArea}>
                                <label style={styles.inputLabel}>YOUR OFFICIAL RESPONSE</label>
                                <textarea 
                                    style={styles.textarea} 
                                    placeholder="Type your response to the franchise owner..."
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                />
                                <button 
                                    onClick={handleResolve} 
                                    disabled={actionLoading || !reply.trim()}
                                    style={styles.resolveBtn}
                                >
                                    {actionLoading ? "SAVING..." : "SEND REPLY & RESOLVE"}
                                    <SendHorizontal size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={styles.emptyPrompt}>
                        <MessageSquare size={48} color="#e5e7eb" />
                        <p style={{marginTop: '15px'}}>Select a grievance from the list to respond</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" },
  title: { fontSize: "22px", fontWeight: "900", letterSpacing: "-1px" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer" },
  refreshBtn: { background: "#fff", border: `1.5px solid ${BORDER}`, padding: "10px", borderRadius: "12px", cursor: "pointer" },
  layoutGrid: { display: "grid", gridTemplateColumns: "400px 1fr", gap: "30px", height: "78vh" },
  listSection: { display: "flex", flexDirection: "column", gap: "12px", height: '100%' },
  filterBar: { display: 'flex', gap: '20px', marginBottom: '10px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '5px' },
  filterTab: { background: 'none', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', padding: '8px 4px' },
  scrollArea: { overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "10px" },
  ticketItem: { padding: "20px", borderRadius: "16px", border: "1.5px solid", cursor: "pointer", transition: "0.2s ease" },
  itemHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  ticketBadge: { fontSize: '12px', fontWeight: '800', color: '#000' },
  statusLabel: { fontSize: '9px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  itemMsg: { margin: 0, fontSize: "13px", fontWeight: "500", color: "#64748b", lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  itemMeta: { fontSize: "10px", color: "#9ca3af", marginTop: "12px", fontWeight: "700", display: 'flex', alignItems: 'center', gap: '5px' },
  detailSection: { background: "#f9fafb", borderRadius: "32px", border: `1.5px solid ${BORDER}`, overflow: "hidden" },
  detailCard: { padding: "40px", display: "flex", flexDirection: "column", gap: "25px", height: "100%", boxSizing: "border-box" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  detailTitle: { margin: 0, fontSize: "20px", fontWeight: "900" },
  dateText: { fontSize: "12px", color: "#9ca3af", margin: '5px 0 0 0', fontWeight: '500' },
  statusLabelLarge: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' },
  profileBox: { background: "#fff", padding: "20px", borderRadius: "16px", border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: "12px" },
  profileRow: { display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#4b5563" },
  chatBubble: { background: "#fff", padding: "24px", borderRadius: "20px", border: `1.5px solid ${BORDER}`, borderLeft: `6px solid ${PRIMARY}` },
  bubbleLabel: { fontSize: "10px", fontWeight: "900", color: PRIMARY, letterSpacing: "1px" },
  bubbleContent: { margin: "10px 0 0 0", fontSize: "15px", lineHeight: "1.6", fontWeight: "500", color: '#1f2937' },
  replyArea: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "auto" },
  inputLabel: { fontSize: "10px", fontWeight: "900", color: "#64748b" },
  textarea: { width: "100%", height: "140px", padding: "18px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, outline: "none", fontFamily: "inherit", fontSize: "14px", resize: "none" },
  resolveBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "18px", borderRadius: "16px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  closedNote: { padding: "25px", background: "#ecfdf5", border: "1px solid #10b981", borderRadius: "20px", color: "#065f46", display: "flex", gap: "15px" },
  emptyPrompt: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontWeight: "600" }
};

export default FranchiseReplies;