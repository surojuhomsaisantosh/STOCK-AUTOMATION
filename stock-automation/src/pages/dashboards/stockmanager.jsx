import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Package,
  Receipt,
  Settings,
  BarChart3,
  Users
} from "lucide-react";

// --- CONSTANTS ---
const PRIMARY = "#065f46"; // Deep Emerald
const BORDER = "#e5e7eb"; // Neutral Gray 200

function StockManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // OPTIMIZATION: Read from session storage immediately to prevent "N/A" flicker
  const [franchiseId, setFranchiseId] = useState(() => {
    try {
      return sessionStorage.getItem("franchise_id") || "N/A";
    } catch (e) {
      return "N/A";
    }
  });

  const [screenSize, setScreenSize] = useState('desktop');

  // Sync Franchise ID when user data loads
  useEffect(() => {
    if (user?.franchise_id) {
      setFranchiseId(user.franchise_id);
      sessionStorage.setItem("franchise_id", user.franchise_id);
    }
  }, [user]);

  // Debounced Resize Listener
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        if (width < 768) setScreenSize('mobile');
        else if (width >= 768 && width < 1280) setScreenSize('tablet');
        else setScreenSize('desktop');
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // --- NAVIGATION DATA ---
  const navItems = [
    { title: "Orders", path: "/stock/orders", icon: <Home /> },
    { title: "Stock Update", path: "/stock", icon: <Package /> },
    { title: "Invoices", path: "/stock/bills", icon: <Receipt /> },
    { title: "Settings", path: "/stock/settings", icon: <Settings /> },
    { title: "Coming Soon", path: "#", icon: <BarChart3 />, disabled: true },
    { title: "Coming Soon", path: "#", icon: <Users />, disabled: true },
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // --- DYNAMIC STYLES ---
  const getGridTemplate = () => {
    if (screenSize === 'mobile') return "1fr";
    if (screenSize === 'tablet') return "repeat(2, 1fr)";
    return "repeat(3, 1fr)";
  };

  const getContainerPadding = () => {
    if (screenSize === 'mobile') return "40px 20px";
    if (screenSize === 'tablet') return "60px 40px";
    return "80px 50px";
  };

  const getGridRowHeight = () => {
     if (screenSize === 'mobile') return '100px';
     return 'minmax(180px, 1fr)';
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, padding: getContainerPadding() }}>

        {/* HEADER: Forced Row Layout to keep ID Top-Right */}
        <header style={styles.header}>
          
          {/* LEFT SIDE */}
          <div style={styles.headerLeft}>
            <h1 style={{
              ...styles.title,
              fontSize: screenSize === 'mobile' ? '24px' : '36px',
            }}>
              STOCK DASHBOARD
            </h1>

            <div style={{ marginTop: screenSize === 'mobile' ? '8px' : '12px' }}>
               <h2 style={{
                 ...styles.greeting, 
                 fontSize: screenSize === 'mobile' ? '16px' : '22px'
               }}>
                 Hello Manager
               </h2>
               <p style={{
                 ...styles.dateText,
                 fontSize: screenSize === 'mobile' ? '12px' : '14px'
               }}>
                 Today: {today}
               </p>
            </div>
          </div>

          {/* RIGHT SIDE: Franchise ID */}
          <div style={styles.headerRight}>
             <span style={{
               ...styles.franchiseText,
               fontSize: screenSize === 'mobile' ? '12px' : '14px',
               padding: screenSize === 'mobile' ? '6px 10px' : '8px 16px'
             }}>
                ID : {franchiseId}
             </span>
          </div>

        </header>

        {/* NAVIGATION GRID */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: getGridTemplate(),
          gridAutoRows: getGridRowHeight(),
          height: screenSize === 'mobile' ? 'auto' : '58vh'
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={item.disabled ? -1 : 0}
              onClick={item.disabled ? null : () => navigate(item.path)}
              onKeyDown={(e) => {
                if (!item.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  navigate(item.path);
                }
              }}
              style={{
                ...styles.card,
                opacity: item.disabled ? 0.6 : 1,
                cursor: item.disabled ? "not-allowed" : "pointer"
              }}
              onMouseEnter={(e) => {
                if(!item.disabled && screenSize !== 'mobile') {
                    e.currentTarget.style.borderColor = PRIMARY;
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 20px 40px rgba(6, 95, 70, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if(!item.disabled && screenSize !== 'mobile') {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.02)";
                }
              }}
            >
              <div style={{
                ...styles.iconWrapper,
                width: screenSize === 'mobile' ? '50px' : '70px',
                height: screenSize === 'mobile' ? '50px' : '70px',
                marginRight: screenSize === 'mobile' ? '15px' : '25px',
                borderRadius: screenSize === 'mobile' ? '16px' : '22px'
              }}>
                {React.cloneElement(item.icon, { size: screenSize === 'mobile' ? 24 : 32 })}
              </div>

              <div style={styles.cardContent}>
                <h2 style={{
                  ...styles.cardTitle,
                  fontSize: screenSize === 'mobile' ? '17px' : '24px'
                }}>
                  {item.title}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- STYLES OBJECT ---
const styles = {
  page: {
    background: "#ffffff",
    minHeight: "100vh",
    width: '100vw',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: "#111827",
    overflowX: "hidden",
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: "1500px",
    width: '100%',
    margin: "0 auto",
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  header: {
    display: "flex",
    flexDirection: "row", // Enforces Side-by-Side layout on ALL screens
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: "5vh"
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  headerRight: {
    paddingTop: "5px",
    flexShrink: 0 // Prevents ID from shrinking/wrapping
  },
  greeting: {
    fontWeight: "700",
    color: "#374151",
    margin: 0,
    lineHeight: 1.3
  },
  dateText: {
    color: "#6b7280",
    margin: "4px 0 0 0",
    fontWeight: "500"
  },
  franchiseText: {
    fontWeight: "700",
    color: "#111827",
    background: "#f9fafb",
    border: `1px solid ${BORDER}`,
    borderRadius: "30px",
    whiteSpace: "nowrap",
    letterSpacing: "0.5px"
  },
  title: {
    fontWeight: "900",
    letterSpacing: "-1px",
    margin: 0,
    color: "#111827",
    lineHeight: 1.1
  },
  grid: {
    display: "grid",
    gap: "20px",
    width: "100%",
    paddingBottom: "40px"
  },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#ffffff",
    borderRadius: "24px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: BORDER,
    transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
    position: "relative",
    padding: "0 25px",
    boxSizing: 'border-box',
    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
    userSelect: "none",
    outline: "none"
  },
  iconWrapper: {
    background: "rgba(6, 95, 70, 0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: PRIMARY,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontWeight: "800",
    margin: 0,
    color: "#111827",
    letterSpacing: "-0.5px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
};

export default StockManagerDashboard;