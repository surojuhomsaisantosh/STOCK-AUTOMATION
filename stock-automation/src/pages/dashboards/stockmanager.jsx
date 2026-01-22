import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
// Assuming your AuthContext export is named useAuth
import { useAuth } from "../../context/AuthContext"; 
import { 
  Home, 
  Package, 
  Receipt, 
  Settings, 
  BarChart3, 
  Users 
} from "lucide-react";

const PRIMARY = "#065f46"; // Deep Emerald
const BORDER = "#e5e7eb";

function StockManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Accessing the franchise_id from your logs
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { title: "Orders", path: "/stock/orders", icon: <Home size={isMobile ? 24 : 32}/> },
    { title: "Stock", path: "/stock", icon: <Package size={isMobile ? 24 : 32}/> },
    { title: "Invoices", path: "/stock/bills", icon: <Receipt size={isMobile ? 24 : 32}/> },
    { title: "Settings", path: "/stock/settings", icon: <Settings size={isMobile ? 24 : 32}/> },
    { title: "Coming Soon", path: "#", icon: <BarChart3 size={isMobile ? 24 : 32}/>, disabled: true },
    { title: "Coming Soon", path: "#", icon: <Users size={isMobile ? 24 : 32}/>, disabled: true },
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>            
            <h1 style={{...styles.title, fontSize: isMobile ? '24px' : '36px', marginTop: '20px'}}>STOCK DASHBOARD</h1>
            {/* <p style={{...styles.subtitle, fontSize: isMobile ? '13px' : '16px'}}>Inventory & Fulfillment Control</p> */}

           <h2 style={styles.greeting}>Hello Stock Manager</h2>
            <p style={styles.dateText}>Today's Date: {today}</p>
          </div>

          <div style={styles.headerRight}>
             <span style={styles.franchiseText}>
               Franchise ID : {user?.franchise_id || "N/A"}
             </span>
          </div>
        </header>

        {/* 3x2 GRID */}
        <div style={{
          ...styles.grid, 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
          height: isMobile ? 'auto' : '58vh' 
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
    justifyContent: 'flex-start',
    boxSizing: 'border-box'
  },
  container: { 
    maxWidth: "1500px", 
    width: '100%',
    margin: "0 auto", 
    padding: "40px 50px 0 50px", 
    boxSizing: 'border-box'
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start",
    marginBottom: "5vh"
  },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  headerRight: { paddingTop: "5px" },
  greeting: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#000",
    margin: 0,
  },
  dateText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "2px 0 0 0",
    fontWeight: "600"
  },
  franchiseText: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#000",
    padding: "8px 16px",
    background: "#f9fafb",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px"
  },
  title: { 
    fontWeight: "900", 
    letterSpacing: "-1.5px", 
    margin: 0,
    color: "#000"
  },
  subtitle: { 
    color: "#6b7280", 
    margin: "2px 0 0 0",
    fontWeight: "500"
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