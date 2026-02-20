import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import {
  FileText, Users, Settings, LayoutDashboard,
  BarChart3, ChevronRight, Package, ShoppingBag,
  Headphones, Calendar, Truck, UserCheck, Printer, Receipt
} from "lucide-react";

const PRIMARY = "#065f46";
const BACKGROUND = "#f9fafb";
const BORDER = "#e5e7eb";

function CentralDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [profile, setProfile] = useState({ name: "User", franchise_id: "...", role: "central" });

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  // Cards arranged logically by industry standards
  const navItems = [
    { title: "Menu Management", path: "/central/posmanagement", icon: <LayoutDashboard size={isMobile ? 20 : 24} />, desc: "Terminals & layout" },
    { title: "Stock Master", path: "/central/stock", icon: <Package size={isMobile ? 20 : 24} />, desc: "Inventory & variants" },
    { title: "Vendors", path: "/central/vendors", icon: <Truck size={isMobile ? 20 : 24} />, desc: "Suppliers & procurement" },

    { title: "Internal Order", path: "/central/internal-order", icon: <ShoppingBag size={isMobile ? 20 : 24} />, desc: "Franchise requests" },
    { title: "Stock Requests", path: "/central/support", icon: <Headphones size={isMobile ? 20 : 24} />, desc: "Help desk tickets" },

    { title: "Invoices", path: "/central/invoices", icon: <FileText size={isMobile ? 20 : 24} />, desc: "Billing & records" },
    { title: "New Franchise Bills", path: "/central/package-bills", icon: <Receipt size={isMobile ? 20 : 24} />, desc: "Franchise setup billing" },

    { title: "Reports", path: "/central/reports", icon: <BarChart3 size={isMobile ? 20 : 24} />, desc: "Performance analytics" },

    { title: "Franchise Profiles", path: "/central/profiles", icon: <Users size={isMobile ? 20 : 24} />, desc: "Franchise network" },
    { title: "Staff Profiles", path: "/central/staff-profiles", icon: <UserCheck size={isMobile ? 20 : 24} />, desc: "Employee management" },

    { title: "Register a company", path: "/central/invoice-design", icon: <Printer size={isMobile ? 20 : 24} />, desc: "Add new companies" },
    { title: "Settings", path: "/central/settings", icon: <Settings size={isMobile ? 20 : 24} />, desc: "System configuration" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dashboard-card { transition: all 0.2s ease-in-out; }
        .dashboard-card:active { transform: scale(0.98); background-color: #f3f4f6; }
        
        @media (min-width: 1024px) {
          .dashboard-card:hover { 
            transform: translateY(-4px); 
            border-color: ${PRIMARY}40 !important;
            box-shadow: 0 12px 20px -5px rgba(0,0,0,0.05) !important;
          }
        }
        .grid-scroll-area::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>

      <div style={{
        ...styles.container,
        padding: isMobile ? "32px 20px" : "50px 40px"
      }}>
        <header style={{
          ...styles.header,
          flexDirection: 'row',
          alignItems: isMobile ? 'center' : 'flex-start'
        }}>

          {/* LEFT SIDE */}
          <div style={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{
                ...styles.mainTitle,
                fontSize: isMobile ? '22px' : '48px',
                marginLeft: isMobile ? '4px' : '0'
              }}>
                Central <span style={{ color: PRIMARY }}>Dashboard</span>
              </h1>
            </div>

            <p style={{
              ...styles.greeting,
              fontSize: isMobile ? '14px' : '18px',
              marginTop: isMobile ? '4px' : '8px',
              marginLeft: isMobile ? '4px' : '0'
            }}>
              Welcome back, {profile.name}
            </p>
          </div>

          {/* RIGHT SIDE: Badge + Date */}
          <div style={styles.headerRight}>
            <div style={{
              ...styles.franchiseBadge,
              padding: isMobile ? "6px 10px" : "8px 16px"
            }}>
              <span style={{ opacity: 0.6, fontWeight: 600, fontSize: isMobile ? '10px' : '12px' }}>ID : </span>
              <span style={{
                marginLeft: '6px',
                color: PRIMARY,
                fontWeight: 900,
                fontSize: isMobile ? '12px' : '13px'
              }}>
                {profile.franchise_id || 'CENTRAL-HQ'}
              </span>
            </div>

            <div style={styles.dateRow}>
              <Calendar size={isMobile ? 12 : 14} style={{ color: PRIMARY, opacity: 0.8 }} />
              <span style={{
                ...styles.dateText,
                fontSize: isMobile ? '11px' : '13px',
                textAlign: 'right'
              }}>
                {formattedDate}
              </span>
            </div>

          </div>
        </header>

        {/* Scrollable Grid Area */}
        <div className="grid-scroll-area" style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "12px" : "24px",
          paddingBottom: isMobile ? "80px" : "40px"
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.card,
                padding: isMobile ? "16px 20px" : "24px 32px",
                borderRadius: isMobile ? "16px" : "28px"
              }}
              className="dashboard-card"
            >
              <div style={{
                ...styles.iconWrapper,
                width: isMobile ? '48px' : '72px',
                height: isMobile ? '48px' : '72px',
                borderRadius: isMobile ? '14px' : '20px',
                marginRight: isMobile ? '16px' : '24px'
              }}>
                {item.icon}
              </div>
              <div style={styles.cardContent}>
                <h2 style={{ ...styles.cardTitle, fontSize: isMobile ? '16px' : '22px' }}>
                  {item.title}
                </h2>
                {!isMobile && <span style={styles.cardSubtitle}>{item.desc}</span>}
              </div>

              <ChevronRight size={isMobile ? 18 : 20} style={{ opacity: 0.2, color: "#000" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: BACKGROUND,
    minHeight: "100vh",
    width: '100%',
    fontFamily: '"Inter", sans-serif',
    color: "#111827",
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden'
  },
  container: {
    maxWidth: "1400px",
    width: '100%',
    margin: "0 auto",
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: '20px',
    flexShrink: 0,
    width: '100%'
  },
  headerLeft: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  headerRight: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', justifyContent: 'center' },

  mainTitle: { fontWeight: "800", letterSpacing: "-0.04em", margin: 0, lineHeight: 1.1, color: "#111827" },
  greeting: { fontWeight: "400", margin: '8px 0 0 0', color: "#4b5563" },
  dateRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  dateText: { fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.02em' },

  franchiseBadge: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
    border: `1px solid ${BORDER}`,
    color: "#000000",
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  grid: {
    display: "grid",
    width: "100%",
    alignContent: 'start',
    overflowY: 'auto',
    flex: 1
  },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: `1px solid ${BORDER}`,
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
    position: 'relative'
  },
  iconWrapper: {
    background: `linear-gradient(135deg, ${PRIMARY}0A, ${PRIMARY}1A)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: PRIMARY,
    flexShrink: 0,
    border: `1px solid ${PRIMARY}10`
  },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "700", margin: 0, letterSpacing: "-0.02em", color: "#1f2937" },
  cardSubtitle: { fontSize: '14px', color: '#9ca3af', marginTop: '4px', display: 'block' }
};

export default CentralDashboard;