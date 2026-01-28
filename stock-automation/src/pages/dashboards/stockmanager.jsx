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
  LogOut,
  ChevronRight
} from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

function StockManagerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { title: "Orders", path: "/stock/orders", icon: <Home size={isMobile ? 22 : 32} /> },
    { title: "Stock", path: "/stock", icon: <Package size={isMobile ? 22 : 32} /> },
    { title: "Invoices", path: "/stock/bills", icon: <Receipt size={isMobile ? 22 : 32} /> },
    { title: "Settings", path: "/stock/settings", icon: <Settings size={isMobile ? 22 : 32} /> },
    { title: "Analytics", path: "#", icon: <BarChart3 size={isMobile ? 22 : 32} />, disabled: true },
    { title: "Team", path: "#", icon: <Users size={isMobile ? 22 : 32} />, disabled: true },
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div style={{ ...styles.page, overflow: isMobile ? "auto" : "hidden" }}>
      <div style={{ ...styles.container, padding: isMobile ? "20px 20px" : "40px 50px" }}>

        {/* HEADER */}
        <header style={{
          ...styles.header,
          flexDirection: isMobile ? 'row' : 'row',
          alignItems: 'center',
          marginBottom: isMobile ? '30px' : '5vh'
        }}>
          <div style={styles.headerLeft}>
            <h1 style={{ ...styles.title, fontSize: isMobile ? '22px' : '36px' }}>STOCK <span style={{ color: PRIMARY }}>HUB</span></h1>
            {!isMobile && (
              <>
                <h2 style={styles.greeting}>Hello Stock Manager</h2>
                <p style={styles.dateText}>Today's Date: {today}</p>
              </>
            )}
            {isMobile && <p style={{ ...styles.dateText, fontSize: '12px' }}>ID: {user?.franchise_id || "N/A"}</p>}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isMobile && (
              <div style={styles.franchiseText}>
                Franchise ID : {user?.franchise_id || "N/A"}
              </div>
            )}
            {isMobile && (
              <button onClick={logout} style={styles.mobileLogoutBtn}>
                <LogOut size={20} />
              </button>
            )}
          </div>
        </header>

        {isMobile && (
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ ...styles.greeting, fontSize: '18px' }}>Welcome Back</h2>
            <p style={{ ...styles.dateText, fontSize: '13px' }}>{today}</p>
          </div>
        )}

        {/* GRID / LIST */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "12px" : "24px",
        }}>
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={item.disabled ? null : () => navigate(item.path)}
              style={{
                ...styles.card,
                height: isMobile ? 'auto' : '160px',
                padding: isMobile ? '16px 20px' : '0 35px',
                opacity: item.disabled ? 0.5 : 1,
                cursor: item.disabled ? "not-allowed" : "pointer",
                borderRadius: isMobile ? '20px' : '32px',
              }}
            >
              <div style={{
                ...styles.iconWrapper,
                width: isMobile ? "50px" : "70px",
                height: isMobile ? "50px" : "70px",
                marginRight: isMobile ? "15px" : "25px",
                borderRadius: isMobile ? "14px" : "22px"
              }}>
                {item.icon}
              </div>

              <div style={styles.cardContent}>
                <h2 style={{
                  ...styles.cardTitle,
                  fontSize: isMobile ? '17px' : '26px'
                }}>
                  {item.title}
                </h2>
                {isMobile && item.disabled && (
                  <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold' }}>COMING SOON</span>
                )}
              </div>

              {isMobile && !item.disabled && (
                <ChevronRight size={18} color="#d1d5db" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#f9fafb",
    height: "100vh",
    width: '100vw',
    fontFamily: '"Inter", -apple-system, sans-serif',
    color: "#111827",
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: "1500px",
    width: '100%',
    margin: "0 auto",
    boxSizing: 'border-box'
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
  },
  headerLeft: { display: 'flex', flexDirection: 'column' },
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
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px"
  },
  mobileLogoutBtn: {
    background: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    padding: '10px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontWeight: "900",
    letterSpacing: "-1px",
    margin: 0,
    color: "#000"
  },
  grid: {
    display: "grid",
    width: "100%",
  },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: `1px solid ${BORDER}`,
    transition: "all 0.3s ease",
    position: "relative",
    boxSizing: 'border-box'
  },
  iconWrapper: {
    background: "rgba(6, 95, 70, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: PRIMARY,
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontWeight: "800",
    margin: 0,
    color: "#000",
    letterSpacing: "-0.5px"
  }
};

export default StockManagerDashboard;