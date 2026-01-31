import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import {
  ShoppingBag,
  FileText,
  Settings,
  SendHorizontal,
  BarChart3,
  Bell,
  X,
  Users,
  CheckCircle2,
  PackageCheck,
  Check,
  Building2
} from "lucide-react";

import MobileNav from "../../components/MobileNav";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

function FranchiseOwnerDashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");
  const [franchiseId, setFranchiseId] = useState("...");
  const [notifications, setNotifications] = useState([]); 
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
        await fetchProfileAndNotifications(isMounted);
    };
    loadData();
    
    // Realtime subscription
    const channel = supabase
      .channel('realtime-stock-requests')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'stock_requests', 
          filter: 'status=eq.fulfilled' 
        },
        () => { fetchProfileAndNotifications(true); }
      )
      .subscribe();

    return () => { 
        isMounted = false;
        supabase.removeChannel(channel); 
    };
  }, []);

  const fetchProfileAndNotifications = async (isMounted = true) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
        .from('profiles')
        .select('name, franchise_id')
        .eq('id', user.id)
        .single();

        if (isMounted && profile) {
            setFranchiseName(profile.name);
            setFranchiseId(profile.franchise_id);
        }

        const { data: restockedItems } = await supabase
        .from('stock_requests')
        .select('id, item_name, created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'fulfilled') 
        .eq('is_read', false) 
        .order('created_at', { ascending: false });

        if (isMounted && restockedItems) {
            setNotifications(restockedItems);
        }

    } catch (error) {
        console.error("Dashboard Error:", error);
    }
  };

  const handleOpenNotifications = () => setShowNotifications(true);

  const handleItemClick = async (itemId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== itemId));
    try {
        await supabase.from('stock_requests').update({ is_read: true }).eq('id', itemId);
    } catch (error) {
        console.error("Failed to mark read:", error);
    }
  };

  const navItems = [
    { title: "Order Stock", path: "/stock-orders", icon: <ShoppingBag size={24} />, desc: "Procure inventory" },
    { title: "Invoices", path: "/franchise/invoices", icon: <FileText size={24} />, desc: "Billing history" },
    { title: "Stock Request", path: "/franchise/requestportal", icon: <SendHorizontal size={24} />, desc: "Support & maintenance" },
    { title: "Analytics", path: "/franchise/analytics", icon: <BarChart3 size={24} />, desc: "Sales performance" },
    { title: "Staff Profiles", path: "/franchise/staff", icon: <Users size={24} />, desc: "Manage employees" },
    { title: "Settings", path: "/franchise/settings", icon: <Settings size={24} />, desc: "Configure store" },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        
        {/* HEADER SECTION */}
        <header className="dashboard-header">
          
          <div className="header-left">
            <div className="desktop-only">
              <MobileNav
                  navItems={navItems}
                  title="Franchise Menu"
                  userProfile={{ name: franchiseName, role: "Franchise Owner" }}
              />
            </div>
            
            {/* UPDATED: Added margin top to greeting for spacing */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 className="header-title">DASHBOARD</h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: '700', color: '#64748b', lineHeight: '1.2' }}>
                    Hello, <span style={{ color: PRIMARY, textTransform: 'uppercase' }}>{franchiseName || 'Owner'}</span>
                </p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="header-right">
            <div className="id-badge">
               <span className="id-label">ID:</span>
               <span className="id-value">{franchiseId}</span>
            </div>

            <button className="notification-btn" onClick={handleOpenNotifications}>
              <Bell size={20} color={PRIMARY} />
              {notifications.length > 0 && (
                <div className="notification-badge">
                  <span>{notifications.length}</span>
                </div>
              )}
            </button>
          </div>

        </header>

        {/* NAVIGATION GRID */}
        <div className="nav-grid">
          {navItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(item.path)}
              className="nav-card"
            >
              <div className="card-icon-wrapper">
                {item.icon}
              </div>
              <div className="card-content">
                <h2 className="card-title">{item.title}</h2>
                <p className="card-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTIFICATIONS DRAWER */}
      {showNotifications && (
        <div className="notif-overlay" onClick={() => setShowNotifications(false)}>
          <div className="notif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notif-header">
              <h3 className="notif-heading">
                <PackageCheck size={20} color={PRIMARY}/> 
                Restock Alerts
              </h3>
              <button className="close-btn" onClick={() => setShowNotifications(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="notif-body custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={56} className="empty-icon" />
                  <p className="empty-title">All Caught Up!</p>
                  <p className="empty-desc">No new items have been restocked recently.</p>
                </div>
              ) : (
                <div className="notif-list">
                  <p className="notif-hint">Tap item to mark as read</p>
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className="notif-item"
                      onClick={() => handleItemClick(n.id)}
                    >
                      <div className="notif-item-icon">
                        <PackageCheck size={18} color="white" />
                      </div>
                      <div className="notif-item-content">
                        <p className="notif-item-title">{n.item_name}</p>
                        <p className="notif-item-date">
                          Restocked on {new Date(n.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div className="check-indicator">
                        <Check size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="notif-footer">
              <button className="action-btn" onClick={() => { setShowNotifications(false); navigate('/stock-orders'); }}>
                Go to Order Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS STYLES */}
      <style>{`
        /* --- GLOBAL --- */
        .dashboard-page {
          background-color: #f9fafb;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          color: #111827;
          display: flex;
          justify-content: center;
        }

        .dashboard-container {
          max-width: 1400px;
          width: 100%;
          padding: 20px;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .dashboard-container { padding: 40px; }
        }

        /* --- HEADER --- */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center; /* Ensures vertical centering */
          margin-bottom: 30px;
          padding-top: 15px; /* Added slight top padding */
          min-height: 50px; /* Changed to min-height for flexibility */
        }

        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-right { display: flex; align-items: center; gap: 12px; }

        .desktop-only { display: none; }
        @media (min-width: 1024px) { .desktop-only { display: block; } }

        .header-title { font-size: 20px; fontWeight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1; }
        @media (min-width: 768px) { .header-title { font-size: 32px; letter-spacing: -1px; } }

        /* ID Badge */
        .id-badge {
          display: flex; align-items: center; gap: 6px; 
          background: white; border: 1px solid ${BORDER}; 
          padding: 8px 12px; border-radius: 12px;
          height: 42px; box-sizing: border-box;
        }
        .id-label { font-size: 10px; fontWeight: 800; color: #9ca3af; text-transform: uppercase; }
        .id-value { font-size: 12px; fontWeight: 800; color: #111827; }

        /* Notification Button */
        .notification-btn {
          background: white; border: 1px solid ${BORDER}; 
          width: 42px; height: 42px; border-radius: 12px;
          cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s;
        }
        .notification-btn:active { transform: scale(0.95); }

        .notification-badge {
          position: absolute; top: -6px; right: -6px; background: #ef4444; color: white;
          font-size: 10px; fontWeight: 900; height: 18px; min-width: 18px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; border: 2px solid white;
          padding: 0 4px; animation: badge-pulse 2s infinite;
        }

        /* --- NAV GRID --- */
        .nav-grid { display: grid; gap: 16px; grid-template-columns: 1fr; padding-bottom: 40px; }
        @media (min-width: 768px) { .nav-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        @media (min-width: 1024px) { .nav-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; } }

        .nav-card {
          display: flex; align-items: center; background: white; border-radius: 20px;
          border: 1px solid ${BORDER}; padding: 20px; cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .nav-card:hover { border-color: ${PRIMARY}; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .nav-card:active { transform: scale(0.98); }

        .card-icon-wrapper {
          width: 56px; height: 56px; background: rgba(6,95,70,0.08); border-radius: 14px;
          display: flex; align-items: center; justify-content: center; margin-right: 16px;
          color: ${PRIMARY}; flex-shrink: 0;
        }
        @media (min-width: 1024px) {
          .nav-card { padding: 30px; border-radius: 24px; }
          .card-icon-wrapper { width: 64px; height: 64px; margin-right: 20px; }
        }

        .card-content { flex: 1; }
        .card-title { font-weight: 800; margin: 0; font-size: 16px; color: #111827; }
        .card-desc { margin: 4px 0 0 0; font-size: 12px; color: #6b7280; display: block; }
        @media (min-width: 768px) { .card-title { font-size: 18px; } .card-desc { font-size: 13px; } }

        /* --- NOTIFICATIONS --- */
        .notif-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
          display: flex; justify-content: flex-end; align-items: flex-end;
          backdrop-filter: blur(4px); animation: fade-in 0.2s ease-out;
        }

        .notif-panel {
          width: 100%; background: white; height: 85vh;
          border-top-left-radius: 24px; border-top-right-radius: 24px;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
          display: flex; flex-direction: column; animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (min-width: 768px) {
          .notif-overlay { align-items: flex-start; }
          .notif-panel { max-width: 400px; height: 100vh; border-radius: 0; animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        }

        .notif-header {
          padding: 24px; border-bottom: 1px solid ${BORDER}; display: flex;
          justify-content: space-between; align-items: center; background: #fff;
          border-top-left-radius: 24px; border-top-right-radius: 24px;
        }

        .notif-heading { margin: 0; font-weight: 800; font-size: 18px; display: flex; align-items: center; gap: 12px; }
        .close-btn { background: #f3f4f6; border: none; cursor: pointer; color: #1f2937; padding: 8px; border-radius: 50%; display: flex; }
        .close-btn:active { background: #e5e7eb; }

        .notif-body { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; }

        .empty-state { text-align: center; padding: 80px 20px; color: #9ca3af; }
        .empty-icon { margin-bottom: 20px; opacity: 0.2; }
        .empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px;}
        .empty-desc { font-size: 14px; }

        .notif-hint { font-size: 12px; color: #64748b; margin-bottom: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }

        .notif-item {
          display: flex; align-items: center; gap: 16px; padding: 16px;
          border-radius: 16px; border: 1px solid white; margin-bottom: 12px;
          background: white; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: transform 0.1s;
        }
        .notif-item:active { transform: scale(0.98); background: #f0fdf4; border-color: ${PRIMARY}; }

        .notif-item-icon { width: 40px; height: 40px; border-radius: 12px; background: ${PRIMARY}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .notif-item-content { flex: 1; min-width: 0; }
        .notif-item-title { margin: 0; font-size: 14px; font-weight: 700; color: #111827; }
        .notif-item-date { margin: 4px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 500; }
        .check-indicator { color: #d1d5db; }

        .notif-footer { padding: 24px; border-top: 1px solid ${BORDER}; background: white; }

        .action-btn {
          width: 100%; background: #111827; color: white; border: none; padding: 16px;
          border-radius: 16px; font-weight: 700; font-size: 14px; cursor: pointer;
          text-transform: uppercase; letter-spacing: 0.5px; transition: opacity 0.2s;
        }
        .action-btn:active { opacity: 0.8; }

        @keyframes badge-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default FranchiseOwnerDashboard;