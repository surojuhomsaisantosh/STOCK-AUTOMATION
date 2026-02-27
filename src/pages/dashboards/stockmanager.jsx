import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Package,
  Receipt,
  Settings,
  BarChart3,
  Users,
  ChevronRight,
  Calendar
} from "lucide-react";
import { BRAND_GREEN } from "../../utils/theme";

// --- CONSTANTS ---
const PRIMARY = BRAND_GREEN;
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
    { title: "Update Stock", path: "/stock", icon: <Package />, desc: "Manage inventory" },
    { title: "Orders", path: "/stock/orders", icon: <Home />, desc: "View stock orders" },
    { title: "Invoices & Billing", path: "/stock/bills", icon: <Receipt />, desc: "Billing records" },
    { title: "Reports", path: "/stock/reports", icon: <BarChart3 />, desc: "Sales analytics", disabled: true },
    { title: "Staff", path: "/stock/staff", icon: <Users />, desc: "Team management", disabled: true },
    { title: "Settings", path: "/stock/settings", icon: <Settings />, desc: "Configuration", disabled: true },
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // --- DYNAMIC STYLES HELPER ---
  const getGridStyles = () => {
    if (screenSize === 'mobile') {
      return { template: "1fr", padding: "40px 20px" };
    }
    if (screenSize === 'tablet') {
      return { template: "repeat(2, 1fr)", padding: "60px 40px" };
    }
    return { template: "repeat(3, 1fr)", padding: "80px 50px" };
  };

  const currentLayout = getGridStyles();

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, padding: currentLayout.padding }}>

        {/* HEADER */}
        <header style={{
          ...styles.header,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'nowrap'
        }}>

          {/* LEFT SIDE: Title, Greeting, and Date (on Mobile) */}
          <div style={{ ...styles.headerLeft, flex: 1 }}>
            <h1 style={{
              ...styles.title,
              fontSize: screenSize === 'mobile' ? '20px' : '36px',
            }}>
              STOCK DASHBOARD
            </h1>

            <p style={{
              ...styles.greeting,
              fontSize: screenSize === 'mobile' ? '14px' : '22px',
              marginTop: screenSize === 'mobile' ? '4px' : '12px',
              marginBottom: screenSize === 'mobile' ? '8px' : '0'
            }}>
              Hello Manager
            </p>

            {/* DATE (Below Greeting on Mobile/Tab, Hidden on Desktop) */}
            {screenSize === 'mobile' && (
              <div style={{ ...styles.dateRow, justifyContent: 'flex-start' }}>
                <Calendar size={12} style={{ color: PRIMARY, opacity: 0.8 }} />
                <span style={{ ...styles.dateText, fontSize: '11px', textAlign: 'left' }}>
                  {today}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Franchise ID (Top Right) & Date (Below ID on Desktop) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            gap: '8px',
          }}>
            <div style={{
              ...styles.franchiseBox,
              padding: screenSize === 'mobile' ? '6px 10px' : '8px 16px',
            }}>
              <span style={{ opacity: 0.6, fontWeight: 600, fontSize: screenSize === 'mobile' ? '10px' : '12px' }}>ID : </span>
              <span style={{ marginLeft: '6px', color: PRIMARY, fontWeight: 900, fontSize: screenSize === 'mobile' ? '12px' : '14px' }}>
                {franchiseId}
              </span>
            </div>

            {/* DATE (Below Badge on Desktop, Hidden on Mobile/Tab) */}
            {screenSize !== 'mobile' && (
              <div style={{ ...styles.dateRow, justifyContent: 'flex-end' }}>
                <Calendar size={14} style={{ color: PRIMARY, opacity: 0.8 }} />
                <span style={{ ...styles.dateText, fontSize: '13px', textAlign: 'right' }}>
                  {today}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* NAVIGATION GRID */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: currentLayout.template,
          gap: screenSize === 'mobile' ? '12px' : '24px',
          paddingBottom: screenSize === 'mobile' ? '80px' : '40px'
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
                padding: screenSize === 'mobile' ? '16px 20px' : '24px 32px',
                borderRadius: screenSize === 'mobile' ? '16px' : '28px',
                opacity: item.disabled ? 0.6 : 1,
                cursor: item.disabled ? "not-allowed" : "pointer"
              }}
              onMouseEnter={(e) => {
                if (!item.disabled && screenSize !== 'mobile') {
                  e.currentTarget.style.borderColor = `${PRIMARY}40`;
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 20px -5px rgba(0,0,0,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!item.disabled && screenSize !== 'mobile') {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.02)";
                }
              }}
            >
              <div style={{
                ...styles.iconWrapper,
                width: screenSize === 'mobile' ? '48px' : '72px',
                height: screenSize === 'mobile' ? '48px' : '72px',
                borderRadius: screenSize === 'mobile' ? '14px' : '20px',
                marginRight: screenSize === 'mobile' ? '16px' : '24px'
              }}>
                {React.cloneElement(item.icon, { size: screenSize === 'mobile' ? 20 : 24 })}
              </div>

              <div style={styles.cardContent}>
                <h2 style={{
                  ...styles.cardTitle,
                  fontSize: screenSize === 'mobile' ? '16px' : '22px'
                }}>
                  {item.title}
                </h2>
                {screenSize !== 'mobile' && <span style={styles.cardSubtitle}>{item.desc}</span>}
              </div>

              <ChevronRight size={screenSize === 'mobile' ? 18 : 20} style={{ opacity: 0.2, color: '#000' }} />
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
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px'
  },
  dateText: {
    fontWeight: '500',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    margin: 0
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
    width: "100%",
    alignContent: 'start'
  },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#ffffff",
    border: `1px solid ${BORDER}`,
    transition: "all 0.2s ease-in-out",
    position: "relative",
    boxSizing: 'border-box',
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
    userSelect: "none",
    outline: "none"
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
  cardContent: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontWeight: "700",
    margin: 0,
    color: "#1f2937",
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '4px',
    display: 'block'
  }
};

export default StockManagerDashboard;

