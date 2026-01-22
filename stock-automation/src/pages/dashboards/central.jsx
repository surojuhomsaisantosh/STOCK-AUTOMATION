import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import {
  FileText, Users, Settings, LayoutDashboard,
  BarChart3, ChevronRight, Package, ShoppingBag, Headphones, Calendar
} from "lucide-react";
import MobileNav from "../../components/MobileNav";

const PRIMARY = "#065f46";
const BACKGROUND = "#f9fafb";
const BORDER = "#f3f4f6";

function CentralDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profile, setProfile] = useState({ name: "User", franchise_id: "...", role: "central" });

  // Current Date Formatting
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('name, franchise_id, role')
        .eq('id', user.id)
        .single();
      if (data && !error) setProfile(data);
    }
    getProfile();
  }, [user]);

  const navItems = [
    { title: "Stock Master", path: "/central/stock", icon: <Package size={24} />, desc: "Inventory & variants" },
    { title: "Internal Order", path: "/central/internal-order", icon: <ShoppingBag size={24} />, desc: "Franchise requests" },
    { title: "POS Management", path: "/central/posmanagement", icon: <LayoutDashboard size={24} />, desc: "Terminals & layout" },
    { title: "Invoices", path: "/central/invoices", icon: <FileText size={24} />, desc: "Billing & records" },
    { title: "Reports", path: "/central/reports", icon: <BarChart3 size={24} />, desc: "Performance analytics" },
    { title: "Support Requests", path: "/central/support", icon: <Headphones size={24} />, desc: "Help desk tickets" }, 
    { title: "Profiles", path: "/central/profiles", icon: <Users size={24} />, desc: "User permissions" },
    { title: "Settings", path: "/central/settings", icon: <Settings size={24} />, desc: "System configuration" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        .dashboard-card { transition: all 0.2s ease-in-out; }
        .dashboard-card:hover { 
          transform: translateY(-4px); 
          border-color: ${PRIMARY}40 !important;
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.05) !important;
        }
        .dashboard-card:active { transform: translateY(0px); }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MobileNav navItems={navItems} title="Central Dashboard" userProfile={profile} />
              <h1 style={{ ...styles.mainTitle, fontSize: isMobile ? '28px' : '48px' }}>
                Central <span style={{ color: PRIMARY }}>Dashboard</span>
              </h1>
            </div>
            {!isMobile && <p style={styles.greeting}>Welcome back, {profile.name}</p>}
          </div>

          <div style={styles.headerRight}>
            <div style={styles.franchiseBadge}>
              <span style={{ opacity: 0.6, fontWeight: 600, fontSize: '12px' }}>FRANCHISE ID : </span>
              <span style={{ marginLeft: '4px', color: PRIMARY, fontWeight: 900 }}>
                {profile.franchise_id || 'CENTRAL-HQ'}
              </span>
            </div>
            {!isMobile && (
              <div style={styles.dateRow}>
                <Calendar size={14} style={{ color: PRIMARY, opacity: 0.8 }} />
                <span style={styles.dateText}>{formattedDate}</span>
              </div>
            )}
          </div>
        </header>

        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)}
              style={styles.card}
              className="dashboard-card"
            >
              <div style={{ ...styles.iconWrapper, width: isMobile ? '56px' : '72px', height: isMobile ? '56px' : '72px' }}>
                {item.icon}
              </div>
              <div style={styles.cardContent}>
                <h2 style={{ ...styles.cardTitle, fontSize: isMobile ? '18px' : '22px' }}>
                  {item.title}
                </h2>
                {!isMobile && <span style={styles.cardSubtitle}>{item.desc}</span>}
              </div>
              {!isMobile && <ChevronRight size={20} style={{ opacity: 0.2 }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: BACKGROUND, height: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' },
  container: { maxWidth: "1400px", width: '100%', height: '100%', margin: "0 auto", padding: "40px 40px", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    paddingBottom: '40px', 
    flexShrink: 0 
  },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  mainTitle: { fontWeight: "800", letterSpacing: "-0.04em", margin: 0, lineHeight: 1.1, color: "#111827" },
  greeting: { fontSize: '18px', fontWeight: "400", margin: '8px 0 0 0', color: "#4b5563" },
  dateRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  dateText: { fontSize: '13px', fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.02em' },
  franchiseBadge: { 
    fontSize: '14px', 
    fontWeight: "700", 
    background: "#fff", 
    padding: "10px 20px", 
    borderRadius: "16px", 
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", 
    border: `1px solid ${BORDER}`, 
    color: "#000000",
    display: 'flex',
    alignItems: 'center'
  },
  grid: { 
    display: "grid", 
    gap: "24px", 
    width: "100%", 
    gridAutoRows: "minmax(120px, auto)", 
    paddingBottom: '40px',
    overflowY: 'auto'
  },
  card: { display: "flex", alignItems: "center", background: "#fff", borderRadius: "28px", border: `1px solid ${BORDER}`, cursor: "pointer", padding: "24px 32px", boxSizing: 'border-box', boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" },
  iconWrapper: { background: `linear-gradient(135deg, ${PRIMARY}0A, ${PRIMARY}1A)`, borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, flexShrink: 0, marginRight: "24px", border: `1px solid ${PRIMARY}10` },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "700", margin: 0, letterSpacing: "-0.02em", color: "#1f2937" },
  cardSubtitle: { fontSize: '14px', color: '#9ca3af', marginTop: '4px', display: 'block' }
};

export default CentralDashboard;