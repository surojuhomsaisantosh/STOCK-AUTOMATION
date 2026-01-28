import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ShoppingBag,
  FileText,
  Settings,
  SendHorizontal,
  BarChart3,
  Bell,
  X,
  Users,
} from "lucide-react";

import MobileNav from "../../components/MobileNav";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

function FranchiseOwnerDashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchProfileAndNotifications();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfileAndNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, franchise_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFranchiseName(profile.name);
      setFranchiseId(profile.franchise_id);
    }

    const { data: tickets } = await supabase
      .from('requests')
      .select('id, ticket_id, reply_message, created_at, status, is_read')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .not('reply_message', 'is', null)
      .order('created_at', { ascending: false });

    if (tickets) setNotifications(tickets);
  };

  const handleOpenNotifications = async () => {
    setShowNotifications(true);
    if (notifications.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('requests')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications([]);
    }
  };

  // Settings now uses 'path' instead of 'action'
  const navItems = [
    { title: "Order Stock", path: "/stock-orders", icon: <ShoppingBag size={24} />, desc: "Procure inventory" },
    { title: "Invoices", path: "/franchise/invoices", icon: <FileText size={24} />, desc: "Billing history" },
    { title: "Request Portal", path: "/franchise/requestportal", icon: <SendHorizontal size={24} />, desc: "Support & maintenance" },
    { title: "Analytics", path: "/franchise/analytics", icon: <BarChart3 size={24} />, desc: "Sales performance" },
    { title: "Staff Profiles", path: "/franchise/staff", icon: <Users size={24} />, desc: "Manage employees" },
    { title: "Settings", path: "/franchise/settings", icon: <Settings size={24} />, desc: "Configure store" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTopRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <MobileNav
                navItems={navItems}
                title="Franchise Menu"
                userProfile={{ name: franchiseName, role: "Franchise Owner" }}
              />
              <div style={{ width: isMobile ? 0 : 40 }} />
              <h1 style={{ ...styles.title, fontSize: isMobile ? '20px' : '36px', textAlign: isMobile ? 'left' : 'center' }}>
                FRANCHISE DASHBOARD
              </h1>
            </div>

            <button
              style={styles.notificationBtn}
              onClick={handleOpenNotifications}
            >
              <Bell size={isMobile ? 22 : 28} color={PRIMARY} />
              {notifications.length > 0 && (
                <div style={styles.badgeWrapper}>
                  <div style={styles.numericBadge}>
                    {notifications.length}
                  </div>
                </div>
              )}
            </button>
          </div>

          <div style={styles.subHeaderAlign}>
            <p style={{ ...styles.subtitle, fontSize: isMobile ? '13px' : '16px' }}>
              Hello User: {" "}
              <span style={{ color: PRIMARY, fontWeight: "700" }}>
                {franchiseName || "Store Owner"}
              </span>
            </p>
          </div>
        </header>

        {!isMobile && (
          <div style={styles.statsStrip}>
            <div style={styles.statItem}>
              FRANCHISE ID:{" "}
              <span style={{ color: PRIMARY }}>
                {franchiseId || "N/A"}
              </span>
            </div>
          </div>
        )}

        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
          height: isMobile ? 'auto' : '60vh'
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)}
              style={styles.card}
            >
              <div style={styles.iconWrapper}>
                {item.icon}
              </div>
              <div style={styles.cardContent}>
                <h2 style={{ ...styles.cardTitle, fontSize: isMobile ? '18px' : '22px' }}>
                  {item.title}
                </h2>
                {!isMobile && <p style={styles.cardDesc}>{item.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNotifications && (
        <div style={styles.notifOverlay} onClick={() => setShowNotifications(false)}>
          <div style={styles.notifPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.notifHeader}>
              <h3 style={{ margin: 0, fontWeight: '800' }}>Recent Replies</h3>
              <button style={styles.closeBtn} onClick={() => setShowNotifications(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.notifBody}>
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                All notifications marked as read.
              </div>
              <button
                style={styles.viewAllBtn}
                onClick={() => navigate('/franchise/requestportal')}
              >
                Go to Request Portal
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes badge-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { background: "#f9fafb", height: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", overflow: "hidden", display: 'flex', justifyContent: 'center' },
  container: { maxWidth: "1400px", width: '100%', margin: "0 auto", padding: "0 40px" },
  header: { display: "flex", flexDirection: "column", paddingTop: "50px", marginBottom: "10px" },
  headerTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  notificationBtn: { background: 'white', border: `1px solid ${BORDER}`, padding: '10px', borderRadius: '14px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badgeWrapper: { position: 'absolute', top: '-6px', right: '-6px', animation: 'badge-pulse 2s infinite ease-in-out' },
  numericBadge: { background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: '900', height: '20px', minWidth: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', padding: '0 4px', boxSizing: 'border-box' },
  title: { fontWeight: "900", margin: 0, textAlign: "center", flex: 1, letterSpacing: "-0.5px" },
  subHeaderAlign: { width: "100%", textAlign: "left", marginTop: "10px" },
  subtitle: { color: "#6b7280", margin: 0 },
  statsStrip: { paddingBottom: "16px", borderBottom: `1px solid ${BORDER}`, marginBottom: "30px", textAlign: "left" },
  statItem: { fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "1px" },
  grid: { display: "grid", gap: "20px" },
  card: { display: "flex", alignItems: "center", background: "#fff", borderRadius: "24px", border: `1px solid ${BORDER}`, padding: "0 30px", cursor: "pointer" },
  iconWrapper: { width: "64px", height: "64px", background: "rgba(6,95,70,0.08)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "20px", color: PRIMARY },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "800", margin: 0 },
  cardDesc: { marginTop: "4px", fontSize: "13px", color: "#6b7280" },
  notifOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' },
  notifPanel: { width: 'min(400px, 90vw)', background: 'white', height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  notifHeader: { padding: '30px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' },
  notifBody: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  viewAllBtn: { marginTop: '10px', background: PRIMARY, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }
};

export default FranchiseOwnerDashboard;