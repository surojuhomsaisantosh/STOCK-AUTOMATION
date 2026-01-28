import React, { useEffect, useState } from "react"; // Added React import here
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  FileText, Users, Settings, LayoutDashboard,
  BarChart3, ChevronRight, Package, ShoppingBag,
  Headphones, Calendar, Truck, UserCheck, LogOut
} from "lucide-react";
import MobileNav from "../../components/MobileNav";

const PRIMARY = "#065f46";
const BACKGROUND = "#f9fafb";
const BORDER = "#f3f4f6";

function CentralDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profile, setProfile] = useState({ name: "User", franchise_id: "...", role: "central" });

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    { title: "POS Management", path: "/central/posmanagement", icon: <LayoutDashboard size={24} />, desc: "Terminals & layout" },
    { title: "Stock Master", path: "/central/stock", icon: <Package size={24} />, desc: "Inventory & variants" },
    { title: "Internal Order", path: "/central/internal-order", icon: <ShoppingBag size={24} />, desc: "Franchise requests" },
    { title: "Vendors", path: "/central/vendors", icon: <Truck size={24} />, desc: "Suppliers & procurement" },
    { title: "Invoices", path: "/central/invoices", icon: <FileText size={24} />, desc: "Billing & records" },
    { title: "Reports", path: "/central/reports", icon: <BarChart3 size={24} />, desc: "Performance analytics" },
    { title: "Staff Profiles", path: "/central/staff-profiles", icon: <UserCheck size={24} />, desc: "Employee management" },
    { title: "Franchise Profiles", path: "/central/profiles", icon: <Users size={24} />, desc: "User permissions" },
    { title: "Support Requests", path: "/central/support", icon: <Headphones size={24} />, desc: "Help desk tickets" },
    { title: "Settings", path: "/central/settings", icon: <Settings size={24} />, desc: "System configuration" },
  ];

  return (
    <div style={{ ...styles.page, overflow: isMobile ? "auto" : "hidden" }}>
      <style>{`
        .dashboard-card { transition: all 0.2s ease-in-out; }
        .dashboard-card:hover { 
          transform: translateY(-4px); 
          border-color: ${PRIMARY}40 !important;
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.05) !important;
        }
        .dashboard-card:active { transform: scale(0.98); }
        .grid-container::-webkit-scrollbar { width: 6px; }
        .grid-container::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>

      <div style={{
        ...styles.container,
        padding: isMobile ? "20px 15px" : "40px 40px"
      }}>
        <header style={{
          ...styles.header,
          flexDirection: isMobile ? 'row' : 'row', // Keep row even on mobile for Logo + Logout
          alignItems: 'center',
          gap: isMobile ? '10px' : '0'
        }}>
          <div style={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* REMOVED MobileNav ON MOBILE as per request */}
              {!isMobile && <MobileNav navItems={navItems} title="Central Dashboard" userProfile={profile} />}
              <h1 style={{
                ...styles.mainTitle,
                fontSize: isMobile ? '24px' : '48px',
                textAlign: 'left'
              }}>
                Central <span style={{ color: PRIMARY }}>Dashboard</span>
              </h1>
            </div>
            {!isMobile && <p style={styles.greeting}>Welcome back, {profile.name}</p>}
          </div>

          <div style={{
            ...styles.headerRight,
            width: isMobile ? 'auto' : 'auto',
            alignItems: 'flex-end'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isMobile ? (
                <button onClick={logout} style={{
                  background: '#fee2e2', color: '#ef4444', border: 'none',
                  borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center'
                }}>
                  <LogOut size={20} />
                </button>
              ) : (
                <div style={styles.franchiseBadge}>
                  <span style={{ opacity: 0.6, fontWeight: 600, fontSize: '12px' }}>ID : </span>
                  <span style={{ marginLeft: '4px', color: PRIMARY, fontWeight: 900 }}>
                    {profile.franchise_id || 'CENTRAL-HQ'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid-container" style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "12px" : "24px",
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.card,
                padding: isMobile ? "16px 20px" : "24px 32px",
                borderRadius: isMobile ? "20px" : "28px"
              }}
              className="dashboard-card"
            >
              <div style={{
                ...styles.iconWrapper,
                width: isMobile ? '48px' : '72px',
                height: isMobile ? '48px' : '72px',
                marginRight: isMobile ? '15px' : '24px',
                borderRadius: isMobile ? '14px' : '20px'
              }}>
                {/* Fixed the React.cloneElement issue */}
                {React.cloneElement(item.icon, { size: isMobile ? 20 : 24 })}
              </div>
              <div style={styles.cardContent}>
                <h2 style={{
                  ...styles.cardTitle,
                  fontSize: isMobile ? '16px' : '22px'
                }}>
                  {item.title}
                </h2>
                {!isMobile && <span style={styles.cardSubtitle}>{item.desc}</span>}
              </div>
              <ChevronRight size={18} style={{ opacity: isMobile ? 0.4 : 0.2 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: BACKGROUND, height: "100vh", width: '100vw', fontFamily: '"Inter", sans-serif', color: "#111827", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  container: { maxWidth: "1400px", width: '100%', height: '100%', margin: "0 auto", display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: '30px',
    flexShrink: 0
  },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  headerRight: { display: 'flex', flexDirection: 'column', gap: '8px' },
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
    alignItems: 'center',
    boxSizing: 'border-box'
  },
  grid: {
    display: "grid",
    width: "100%",
    paddingBottom: '40px',
    overflowY: 'auto'
  },
  card: { display: "flex", alignItems: "center", background: "#fff", border: `1px solid ${BORDER}`, cursor: "pointer", boxSizing: 'border-box', boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" },
  iconWrapper: { background: `linear-gradient(135deg, ${PRIMARY}0A, ${PRIMARY}1A)`, display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, flexShrink: 0, border: `1px solid ${PRIMARY}10` },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "700", margin: 0, letterSpacing: "-0.02em", color: "#1f2937" },
  cardSubtitle: { fontSize: '14px', color: '#9ca3af', marginTop: '4px', display: 'block' }
};

export default CentralDashboard;