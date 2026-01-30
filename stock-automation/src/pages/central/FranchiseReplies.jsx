import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ArrowLeft, CheckCircle, RefreshCcw, User, Hash,
  MapPin, SendHorizontal, MessageSquare, Clock, Store, Calendar, ChevronRight
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
  const [myProfile, setMyProfile] = useState({ franchise_id: "CENTRAL" });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchRequests();
    fetchMyProfile();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMyProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (data) setMyProfile(data);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
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

      const sanitizedData = (data || []).map(req => {
        const profileInfo = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
        return {
          ...req,
          profiles: profileInfo,
          franchise_id: req.franchise_id || profileInfo?.franchise_id || "N/A"
        };
      });

      setRequests(sanitizedData);
    } catch (err) {
      console.error("Fetch error:", err.message);
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
      <div style={{ ...styles.container, padding: isMobile ? "20px 15px" : "40px" }}>

        {/* HEADER - MOBILE OPTIMIZED */}
        <header style={{
          ...styles.header,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '15px' : '0'
        }}>
          <div style={{ ...styles.headerLeft, width: isMobile ? '100%' : '200px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => selectedRequest && isMobile ? setSelectedRequest(null) : navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={20} />
              <span>{selectedRequest && isMobile ? "Back to List" : "Back"}</span>
            </button>
            {isMobile && (
              <button onClick={fetchRequests} style={styles.refreshBtn}>
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {!selectedRequest || !isMobile ? (
            <h1 style={{ ...styles.title, fontSize: isMobile ? '18px' : '22px' }}>GRIEVANCE TERMINAL</h1>
          ) : (
            <div style={{ fontWeight: 900, color: PRIMARY }}>RESPONDING TO TICKET</div>
          )}

          {!isMobile && (
            <div style={styles.headerRight}>
              <div style={styles.dateCard}>
                <Calendar size={14} color="#64748b" />
                <div style={styles.dateTextGroup}>
                  <span style={styles.dateLabel}>TODAY</span>
                  <span style={styles.dateVal}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
              <div style={styles.idBadge}>
                <Store size={14} />
                <span>Franchise ID : <span style={{ fontWeight: 900 }}>{myProfile.franchise_id}</span></span>
              </div>
              <button onClick={fetchRequests} style={styles.refreshBtn}>
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </header>

        {/* LAYOUT - CONDITIONAL VIEW */}
        <div style={{
          ...styles.layoutGrid,
          gridTemplateColumns: isMobile ? "1fr" : "400px 1fr",
          height: isMobile ? 'auto' : '78vh'
        }}>

          {/* LIST SECTION - HIDDEN ON MOBILE WHEN DETAIL VIEW IS OPEN */}
          {(!isMobile || !selectedRequest) && (
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

              <div style={{ ...styles.scrollArea, height: isMobile ? '70vh' : '100%' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          ...styles.statusLabel,
                          color: req.status === "Closed" ? "#10b981" : "#f59e0b",
                          background: req.status === "Closed" ? "#ecfdf5" : "#fffbeb",
                        }}>
                          {req.status}
                        </span>
                        {isMobile && <ChevronRight size={16} opacity={0.3} />}
                      </div>
                    </div>
                    <p style={styles.itemMsg}>{req.message}</p>
                    <div style={styles.itemMeta}>
                      <User size={10} /> {req.profiles?.name || "Unknown Franchise"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETAIL SECTION - FULL SCREEN ON MOBILE WHEN OPEN */}
          {(!isMobile || selectedRequest) && (
            <div style={{
              ...styles.detailSection,
              display: !selectedRequest && isMobile ? 'none' : 'block',
              borderRadius: isMobile ? '20px' : '32px'
            }}>
              {selectedRequest ? (
                <div style={{ ...styles.detailCard, padding: isMobile ? "20px" : "40px" }}>
                  <div style={styles.detailHeader}>
                    <div>
                      <h2 style={{ ...styles.detailTitle, fontSize: isMobile ? '18px' : '20px' }}>Ticket Details</h2>
                      <p style={styles.dateText}>Ref: {selectedRequest.ticket_id}</p>
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
                    <div style={{ ...styles.profileRow, fontSize: isMobile ? '12px' : '13px' }}>
                      <User size={16} color={PRIMARY} />
                      <span><strong>{selectedRequest.profiles?.name || "N/A"}</strong></span>
                    </div>
                    <div style={{ ...styles.profileRow, fontSize: isMobile ? '11px' : '13px' }}>
                      <MapPin size={16} color={PRIMARY} />
                      <span>{selectedRequest.profiles?.address || "Location not provided"}</span>
                    </div>
                  </div>

                  <div style={{ ...styles.chatBubble, padding: isMobile ? "15px" : "24px" }}>
                    <label style={styles.bubbleLabel}>ISSUE DESCRIPTION</label>
                    <p style={{ ...styles.bubbleContent, fontSize: isMobile ? '14px' : '15px' }}>{selectedRequest.message}</p>
                  </div>

                  {selectedRequest.status === "Closed" ? (
                    <div style={{ ...styles.closedNote, padding: isMobile ? "15px" : "25px", flexDirection: isMobile ? 'column' : 'row' }}>
                      <CheckCircle size={20} />
                      <div>
                        <strong style={{ fontSize: '14px' }}>Official Resolution Sent</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', lineHeight: '1.5' }}>{selectedRequest.reply_message}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.replyArea}>
                      <label style={styles.inputLabel}>YOUR OFFICIAL RESPONSE</label>
                      <textarea
                        style={{ ...styles.textarea, height: isMobile ? '120px' : '140px' }}
                        placeholder="Type your resolution here..."
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <button
                        onClick={handleResolve}
                        disabled={actionLoading || !reply.trim()}
                        style={styles.resolveBtn}
                      >
                        {actionLoading ? "SAVING..." : "RESOLVE TICKET"}
                        <SendHorizontal size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.emptyPrompt}>
                  <MessageSquare size={48} color="#e5e7eb" />
                  <p style={{ marginTop: '15px' }}>Select a grievance to respond</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  title: { fontWeight: "900", letterSpacing: "-1px", margin: 0 },
  headerLeft: {},
  headerRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "700", cursor: "pointer" },
  refreshBtn: { background: "#fff", border: `1.5px solid ${BORDER}`, padding: "10px", borderRadius: "12px", cursor: "pointer" },
  dateCard: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  dateTextGroup: { display: 'flex', flexDirection: 'column', lineHeight: 1 },
  dateLabel: { fontSize: '8px', fontWeight: '800', color: '#94a3b8' },
  dateVal: { fontSize: '12px', fontWeight: '900', color: '#1e293b' },
  idBadge: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', color: '#166534', border: '1px solid #dcfce7' },
  layoutGrid: { display: "grid", gap: "30px" },
  listSection: { display: "flex", flexDirection: "column", gap: "12px" },
  filterBar: { display: 'flex', gap: '20px', marginBottom: '10px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '5px' },
  filterTab: { background: 'none', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', padding: '8px 4px' },
  scrollArea: { overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" },
  ticketItem: { padding: "20px", borderRadius: "16px", border: "1.5px solid", cursor: "pointer" },
  itemHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  ticketBadge: { fontSize: '12px', fontWeight: '800', color: '#000' },
  statusLabel: { fontSize: '9px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  itemMsg: { margin: 0, fontSize: "13px", fontWeight: "500", color: "#64748b", lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  itemMeta: { fontSize: "10px", color: "#9ca3af", marginTop: "12px", fontWeight: "700", display: 'flex', alignItems: 'center', gap: '5px' },
  detailSection: { background: "#f9fafb", border: `1.5px solid ${BORDER}`, overflow: "hidden" },
  detailCard: { display: "flex", flexDirection: "column", gap: "20px", boxSizing: "border-box" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  detailTitle: { margin: 0, fontWeight: "900" },
  dateText: { fontSize: "12px", color: "#9ca3af", margin: '5px 0 0 0', fontWeight: '500' },
  statusLabelLarge: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' },
  profileBox: { background: "#fff", padding: "15px", borderRadius: "16px", border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: "10px" },
  profileRow: { display: "flex", alignItems: "center", gap: "12px", color: "#4b5563" },
  chatBubble: { background: "#fff", borderRadius: "20px", border: `1.5px solid ${BORDER}`, borderLeft: `6px solid ${PRIMARY}` },
  bubbleLabel: { fontSize: "10px", fontWeight: "900", color: PRIMARY, letterSpacing: "1px" },
  bubbleContent: { margin: "10px 0 0 0", lineHeight: "1.6", fontWeight: "500", color: '#1f2937' },
  replyArea: { display: "flex", flexDirection: "column", gap: "12px" },
  inputLabel: { fontSize: "10px", fontWeight: "900", color: "#64748b" },
  textarea: { width: "100%", padding: "18px", borderRadius: "16px", border: `1.5px solid ${BORDER}`, outline: "none", fontFamily: "inherit", fontSize: "14px", resize: "none" },
  resolveBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "18px", borderRadius: "16px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  closedNote: { background: "#ecfdf5", border: "1px solid #10b981", borderRadius: "20px", color: "#065f46", display: "flex", gap: "15px" },
  emptyPrompt: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontWeight: "600", minHeight: '300px' }
};

export default FranchiseReplies;