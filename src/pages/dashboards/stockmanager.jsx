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

// --- UTILITY: Safe Session Storage Access ---
// Prevents crashes if storage is disabled (e.g., incognito mode)
const getSessionItem = (key, defaultValue) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? item : defaultValue;
  } catch (error) {
    console.warn(`Error reading ${key} from sessionStorage:`, error);
    return defaultValue;
  }
};

const setSessionItem = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Error writing ${key} to sessionStorage:`, error);
  }
};

function StockManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. OPTIMIZATION: Initialize state from session storage to prevent "N/A" flicker
  const [franchiseId, setFranchiseId] = useState(() => 
    getSessionItem("franchise_id", "N/A")
  );

  const [screenSize, setScreenSize] = useState('desktop');

  // 2. DATA SYNC: Update state and session storage when user data is available
  useEffect(() => {
    if (user?.franchise_id) {
      setFranchiseId(user.franchise_id);
      setSessionItem("franchise_id", user.franchise_id);
    }
  }, [user]);

  // 3. PERFORMANCE: Debounced Resize Listener
  useEffect(() => {
    let timeoutId;
    
    // Initial check
    const checkSize = () => {
      const width = window.innerWidth;
      if (width < 768) setScreenSize('mobile');
      else if (width >= 768 && width < 1280) setScreenSize('tablet');
      else setScreenSize('desktop');
    };

    checkSize(); // Run immediately

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkSize, 150); // 150ms debounce
    };

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

  // --- DYNAMIC STYLES HELPER ---
  const getGridStyles = () => {
    if (screenSize === 'mobile') {
      return { template: "1fr", rowHeight: "100px", padding: "40px 20px" };
    }
    if (screenSize === 'tablet') {
      return { template: "repeat(2, 1fr)", rowHeight: "minmax(180px, 1fr)", padding: "60px 40px" };
    }
    return { template: "repeat(3, 1fr)", rowHeight: "minmax(180px, 1fr)", padding: "80px 50px" };
  };

  const currentLayout = getGridStyles();

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, padding: currentLayout.padding }}>

        {/* HEADER */}
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

          {/* RIGHT SIDE: Franchise ID (Rectangular Box) */}
          <div style={styles.headerRight}>
             <div style={{
               ...styles.franchiseBox,
               padding: screenSize === 'mobile' ? '8px 12px' : '10px 20px',
               fontSize: screenSize === 'mobile' ? '12px' : '14px'
             }}>
                <span style={{ color: "#6b7280", fontWeight: "600", marginRight: "6px" }}>ID :</span>
                <span style={{ color: "#111827", fontWeight: "800" }}>{franchiseId}</span>
             </div>
          </div>

        </header>

        {/* NAVIGATION GRID */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: currentLayout.template,
          gridAutoRows: currentLayout.rowHeight,
          height: screenSize === 'mobile' ? 'auto' : '58vh'
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={item.disabled ? -1 : 0}
              aria-disabled={item.disabled}
              onClick={item.disabled ? null : () => navigate(item.path)}
              onKeyDown={(e) => {
                if (!item.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
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

// --- STATIC STYLES OBJECT ---
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
    flexDirection: "row",
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
    flexShrink: 0
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
  franchiseBox: {
    background: "#f9fafb",
    border: `1px solid ${BORDER}`,
    borderRadius: "12px", // Fixed Rectangular Shape
    whiteSpace: "nowrap",
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center"
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

