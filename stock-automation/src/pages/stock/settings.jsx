import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiLock, FiLogOut } from "react-icons/fi";

const BRAND_GREEN = "rgb(0, 100, 55)";

function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  const handleChangePassword = async () => {
    setPasswordMsg("");
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">

      {/* TOP NAVIGATION */}
      <nav className={`border-b border-slate-200 bg-white sticky top-0 z-50 flex items-center justify-between ${isMobile ? 'px-4 py-4' : 'px-8 py-5'}`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black"
        >
          <FiArrowLeft size={18} /> {isMobile ? "" : "Back"}
        </button>

        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black uppercase tracking-[0.2em] text-black`}>Settings</h1>

        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>}
          <span className="text-[10px] md:text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ"}
          </span>
        </div>
      </nav>

      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4 mt-8' : 'px-6 mt-16'}`}>

        {/* THE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">

          {/* CARD 1: CHANGE PASSWORD */}
          <div className={`bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] shadow-sm flex flex-col h-full ${isMobile ? 'p-6' : 'p-10'}`}>
            <div className="flex items-center gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <FiLock size={20} />
              </div>
              <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Security</h3>
            </div>

            <div className="space-y-3 flex-1">
              <input
                type="password"
                placeholder="NEW PASSWORD"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none focus:ring-2 ring-black/5 uppercase transition-all"
              />
              <input
                type="password"
                placeholder="CONFIRM PASSWORD"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none focus:ring-2 ring-black/5 uppercase transition-all"
              />
              {passwordMsg && (
                <p className="text-[9px] font-black uppercase px-2 text-emerald-600">
                  {passwordMsg}
                </p>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              style={{ backgroundColor: BRAND_GREEN }}
              className="mt-6 md:mt-8 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl active:scale-[0.98] transition-all"
            >
              Update Password
            </button>
          </div>

          {/* CARD 2: LOGOUT */}
          <div className={`bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] shadow-sm flex flex-col h-full ${isMobile ? 'p-6' : 'p-10'}`}>
            <div className="flex items-center gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <FiLogOut size={20} />
              </div>
              <h3 className="text-xs md:text-sm font-black uppercase tracking-widest">Account</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Active User</p>
                <p className="text-[10px] md:text-xs font-black text-black truncate">{user?.email || "Signed In"}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 md:mt-8 w-full py-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white active:scale-[0.98] transition-all"
            >
              Logout
            </button>
          </div>

          {/* SLOT 3: Invisible filler for desktop layout */}
          {!isMobile && (
            <div className="hidden lg:block h-full opacity-0 pointer-events-none">
              <div className="p-10 rounded-[2.5rem] border border-transparent">Grid Filler</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Settings;