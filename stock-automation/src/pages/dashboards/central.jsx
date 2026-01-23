import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import {
  FileText, Users, Settings, Wallet, LayoutDashboard,
  BarChart3, ChevronRight, Package, ShoppingBag
} from "lucide-react";
import MobileNav from "../../components/MobileNav";

const PRIMARY = "#065f46";
const BACKGROUND = "#f9fafb";
const BORDER = "#f3f4f6";

function CentralDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profile, setProfile] = useState({ name: "User", franchise_id: "..." });

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('name, franchise_id')
        .eq('id', user.id)
        .single();
      if (data && !error) setProfile(data);
    }
    getProfile();
  }, [user]);

  // Items mapped to specific paths
  const navItems = [
    { title: "Stock Master", path: "/central/stock", icon: <Package size={24} /> },
    { title: "Internal Order", path: "/central/internal-order", icon: <ShoppingBag size={24} /> }, // This goes to StockOrder.jsx
    { title: "Reports", path: "/central/reports", icon: <BarChart3 size={24} /> },
    { title: "Invoices", path: "/central/invoices", icon: <FileText size={24} /> },
    { title: "POS Management", path: "/central/posmanagement", icon: <LayoutDashboard size={24} /> },
    { title: "Profiles", path: "/central/profiles", icon: <Users size={24} /> },
    { title: "Accounts", path: "/central/accounts", icon: <Wallet size={24} /> },
    { title: "Settings", path: "/central/settings", icon: <Settings size={24} /> },
  ];

  return (
    <div style={styles.page}>
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
              <span style={{ opacity: 0.6, fontWeight: 500 }}>Franchise ID: </span>
              <span style={{ marginLeft: '8px' }}>{profile.franchise_id || 'N/A'}</span>
            </div>
          </div>
        </header>

        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)} // Click triggers the navigation
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
                {!isMobile && <span style={styles.cardSubtitle}>Manage and view details</span>}
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
  // Styles as provided in your original CentralDashboard code...
  page: { background: BACKGROUND, height: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' },
  container: { maxWidth: "1400px", width: '100%', height: '100%', margin: "0 auto", padding: "40px 40px", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: '40px', flexShrink: 0 },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  mainTitle: { fontWeight: "800", letterSpacing: "-0.04em", margin: 0, lineHeight: 1.1, color: "#111827" },
  greeting: { fontSize: '18px', fontWeight: "400", margin: '12px 0 0 0', color: "#000000" },
  franchiseBadge: { fontSize: '14px', fontWeight: "700", background: "#fff", padding: "8px 16px", borderRadius: "99px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${BORDER}`, color: "#000000" },
  grid: { display: "grid", gap: "24px", width: "100%", flexGrow: 1, paddingBottom: '40px' },
  card: { display: "flex", alignItems: "center", background: "#fff", borderRadius: "28px", border: `1px solid ${BORDER}`, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", padding: "0 32px", boxSizing: 'border-box', height: '100%', boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" },
  iconWrapper: { background: `linear-gradient(135deg, ${PRIMARY}0A, ${PRIMARY}1A)`, borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, flexShrink: 0, marginRight: "24px", border: `1px solid ${PRIMARY}10` },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "700", margin: 0, letterSpacing: "-0.02em", color: "#1f2937" },
  cardSubtitle: { fontSize: '14px', color: '#9ca3af', marginTop: '4px', display: 'block' }
};

export default CentralDashboard;