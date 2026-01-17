import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  Home, 
  Package, 
  Receipt, 
  Settings, 
  BarChart3, 
  Users, 
  ShieldCheck 
} from "lucide-react";

const PRIMARY = "#065f46"; // Deep Emerald
const BORDER = "#e5e7eb";

function StockManagerDashboard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { title: "Home", path: "/stock/orders", icon: <Home size={isMobile ? 24 : 32}/> },
    { title: "Stock", path: "/stock", icon: <Package size={isMobile ? 24 : 32}/> },
    { title: "Bills", path: "/stock/bills", icon: <Receipt size={isMobile ? 24 : 32}/> },
    { title: "Settings", path: "/stock/settings", icon: <Settings size={isMobile ? 24 : 32}/> },
    { title: "Reports", path: "#", icon: <BarChart3 size={isMobile ? 24 : 32}/>, disabled: true },
    { title: "Team", path: "#", icon: <Users size={isMobile ? 24 : 32}/>, disabled: true },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={{...styles.title, fontSize: isMobile ? '24px' : '36px'}}>STOCK DASHBOARD</h1>
            <p style={{...styles.subtitle, fontSize: isMobile ? '13px' : '16px'}}>Inventory & Fulfillment Control</p>
          </div>
          {!isMobile && (
            <div style={styles.systemBadge}>
              <ShieldCheck size={16} color={PRIMARY} />
              <span>STOCK MANAGER ACCESS</span>
            </div>
          )}
        </header>

        {/* STATUS STRIP */}
        {!isMobile && (
          <div style={styles.statsStrip}>
              <div style={styles.statItem}>WAREHOUSE: <span style={{color: '#10b981'}}>SYNCED</span></div>
              <div style={styles.statItem}>INVENTORY LOGS: <span>ACTIVE</span></div>
              <div style={styles.statItem}>SYSTEM CLOCK: <span>{new Date().toLocaleDateString()}</span></div>
          </div>
        )}

        {/* 3x2 GRID: Optimized for Viewport Fit */}
        <div style={{
          ...styles.grid, 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
          height: isMobile ? 'auto' : '62vh' 
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={item.disabled ? null : () => navigate(item.path)}
              style={{
                ...styles.card,
                opacity: item.disabled ? 0.6 : 1,
                cursor: item.disabled ? "not-allowed" : "pointer"
              }}
              onMouseEnter={(e) => {
                if(!item.disabled) {
                    e.currentTarget.style.borderColor = PRIMARY;
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if(!item.disabled) {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <div style={styles.iconWrapper}>
                {item.icon}
              </div>
              
              <div style={styles.cardContent}>
                <h2 style={{...styles.cardTitle, fontSize: isMobile ? '20px' : '26px'}}>{item.title}</h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { 
    background: "#fff", 
    height: "100vh", 
    width: '100vw',
    fontFamily: '"Inter", -apple-system, sans-serif',
    color: "#111827",
    overflow: "hidden", 
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  container: { 
    maxWidth: "1500px", 
    width: '100%',
    margin: "0 auto", 
    padding: "0 50px",
    boxSizing: 'border-box'
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-end",
    marginBottom: "1vh"
  },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  title: { 
    fontWeight: "900", 
    letterSpacing: "-1.5px", 
    margin: 0,
    color: "#000"
  },
  subtitle: { 
    color: "#6b7280", 
    margin: "4px 0 0 0",
    fontWeight: "500"
  },
  systemBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    borderRadius: '40px',
    background: '#f0fdf4',
    border: '1px solid #dcfce7',
    fontSize: '11px',
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: '1px'
  },
  statsStrip: {
    display: "flex",
    gap: "40px",
    padding: "2vh 0",
    borderBottom: `1px solid ${BORDER}`,
    marginBottom: "3vh"
  },
  statItem: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  grid: { 
    display: "grid", 
    gap: "24px",
    width: "100%",
  },
  card: { 
    display: "flex", 
    alignItems: "center", 
    background: "#fff", 
    borderRadius: "32px", 
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: BORDER,
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    position: "relative",
    padding: "0 35px",
    boxSizing: 'border-box'
  },
  iconWrapper: { 
    background: "rgba(6, 95, 70, 0.05)", 
    borderRadius: "22px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    color: PRIMARY,
    flexShrink: 0,
    marginRight: "25px",
    width: "70px",
    height: "70px"
  },
  cardContent: { flex: 1 },
  cardTitle: { 
    fontWeight: "800", 
    margin: 0,
    color: "#000",
    letterSpacing: "-1px"
  }
};

export default StockManagerDashboard;