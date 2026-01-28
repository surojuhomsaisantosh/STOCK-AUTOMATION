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
  CheckCircle2,
  PackageCheck,
  Check
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

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, franchise_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFranchiseName(profile.name);
      setFranchiseId(profile.franchise_id);
    }

    // 2. Fetch Unread Fulfilled Stock Requests
    const { data: restockedItems } = await supabase
      .from('stock_requests')
      .select('id, item_name, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'fulfilled') 
      .eq('is_read', false) // Only fetch unread
      .order('created_at', { ascending: false });

    if (restockedItems) setNotifications(restockedItems);
  };

  // Just open the panel, do NOT mark as read yet
  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  // Handle clicking a single notification item
  const handleItemClick = async (itemId) => {
    // 1. Optimistic Update: Remove from UI immediately for speed
    setNotifications((prev) => prev.filter((n) => n.id !== itemId));

    // 2. Update DB: Mark this specific item as read
    const { error } = await supabase
      .from('stock_requests')
      .update({ is_read: true })
      .eq('id', itemId);

    if (error) {
      console.error("❌ Error marking read:", error.message);
      // Optional: If you want to show an alert on failure
      // alert("Failed to update notification status");
    }
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const navItems = [
    { title: "Order Stock", path: "/stock-orders", icon: <ShoppingBag size={24} />, desc: "Procure inventory" },
    { title: "Invoices", path: "/franchise/invoices", icon: <FileText size={24} />, desc: "Billing history" },
    { title: "Stock Request", path: "/franchise/requestportal", icon: <SendHorizontal size={24} />, desc: "Support & maintenance" },
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
        <div style={styles.notifOverlay} onClick={closeNotifications}>
          <div style={styles.notifPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.notifHeader}>
              <h3 style={{ margin: 0, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PackageCheck size={20} color={PRIMARY}/> 
                Items Restocked
              </h3>
              <button style={styles.closeBtn} onClick={closeNotifications}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.notifBody}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <CheckCircle2 size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>All Caught Up!</p>
                  <p style={{ fontSize: '12px' }}>No new restock alerts.</p>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '15px', paddingLeft: '10px' }}>
                    Click an item to mark as seen:
                  </p>
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      style={styles.notifItem}
                      onClick={() => handleItemClick(n.id)} // Click updates DB & removes from UI
                      className="notif-item-hover" // Class for hover effect
                    >
                      <div style={styles.notifIcon}>
                        <PackageCheck size={18} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={styles.notifTitle}>{n.item_name}</p>
                        <p style={styles.notifDate}>
                          Available since: {new Date(n.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      {/* Visual indicator to click */}
                      <div style={styles.checkIcon}>
                        <Check size={16} color="#9ca3af" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.notifFooter}>
              <button
                style={styles.viewAllBtn}
                onClick={() => navigate('/stock-orders')}
              >
                Go to Order Stock
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
        /* Hover effect for notification items */
        .notif-item-hover:hover {
          background-color: #f3f4f6 !important;
          border-color: ${PRIMARY} !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
  
  // Notification Styles
  notifOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' },
  notifPanel: { width: 'min(400px, 90vw)', background: 'white', height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  notifHeader: { padding: '25px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' },
  notifBody: { flex: 1, overflowY: 'auto', padding: '20px' },
  notifFooter: { padding: '20px', borderTop: `1px solid ${BORDER}`, background: '#fff' },
  viewAllBtn: { width: '100%', background: 'black', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px' },
  
  // Notification Item
  notifItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px', borderRadius: '12px', border: `1px solid ${BORDER}`, marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: 'white' },
  notifIcon: { width: '36px', height: '36px', borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  notifTitle: { margin: 0, fontSize: '14px', fontWeight: '800', color: '#111827', textTransform: 'uppercase' },
  notifDate: { margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af', fontWeight: '600' },
  checkIcon: { marginLeft: 'auto' } // Pushes check icon to right
};

export default FranchiseOwnerDashboard;