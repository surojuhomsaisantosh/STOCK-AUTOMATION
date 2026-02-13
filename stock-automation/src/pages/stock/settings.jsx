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
  const [displayId, setDisplayId] = useState("");

  useEffect(() => {
    const savedId = sessionStorage.getItem("franchise_id");
    if (user?.franchise_id) {
      setDisplayId(user.franchise_id);
      sessionStorage.setItem("franchise_id", user.franchise_id);
    } else if (savedId) {
      setDisplayId(savedId);
    } else {
      setDisplayId("TV-HQ-01");
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("franchise_id");
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
    <div className="min-h-screen bg-white text-[#111827] font-sans pb-10 md:pb-20">
      
      {/* TOP NAVIGATION */}
      <nav className="border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 bg-white sticky top-0 z-50 flex items-center justify-between">
        
        {/* TOP LEFT: BACK BUTTON */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-bold text-gray-600 hover:text-black transition-colors"
        >
          <FiArrowLeft size={18} className="md:w-5 md:h-5" />
          <span>Back</span>
        </button>

        {/* CENTER: TITLE - Responsive Text Size */}
        <h1 className="text-lg md:text-2xl font-black tracking-tight text-[#111827]">
          SETTINGS
        </h1>

        {/* TOP RIGHT: ID BOX */}
        <div className="flex items-center">
          <div className="bg-[#f9fafb] px-3 md:px-5 py-1.5 md:py-2.5 border border-[#e5e7eb] rounded-lg md:rounded-xl flex items-center">
            <span className="text-[10px] md:text-sm font-semibold text-gray-500 mr-1 md:mr-2">ID:</span>
            <span className="text-[10px] md:text-sm font-extrabold text-[#111827] tracking-tight">
              {displayId}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          
          {/* CARD 1: CHANGE PASSWORD */}
          <div className="bg-white border border-gray-200 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                <FiLock size={20} className="md:w-6 md:h-6" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-[#111827]">Security</h3>
            </div>

            <div className="space-y-3 md:space-y-4 flex-1">
              <input
                type="password"
                placeholder="NEW PASSWORD"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-4 bg-[#f9fafb] border border-gray-200 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-bold outline-none focus:ring-2 ring-emerald-500/10 focus:border-emerald-600 transition-all"
              />
              <input
                type="password"
                placeholder="CONFIRM PASSWORD"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-4 bg-[#f9fafb] border border-gray-200 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-bold outline-none focus:ring-2 ring-emerald-500/10 focus:border-emerald-600 transition-all"
              />
              {passwordMsg && (
                <p className="text-[10px] md:text-xs font-bold uppercase px-2 text-emerald-600">
                  {passwordMsg}
                </p>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              style={{ backgroundColor: BRAND_GREEN }}
              className="mt-6 md:mt-8 w-full py-3 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-widest text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/10"
            >
              Update Password
            </button>
          </div>

          {/* CARD 2: LOGOUT */}
          <div className="bg-white border border-gray-200 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <FiLogOut size={20} className="md:w-6 md:h-6" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-[#111827]">Account</h3>
            </div>

            <div className="flex-1 flex items-center justify-center py-6">
               <p className="text-gray-400 text-xs md:text-sm font-medium text-center">Manage session and security access</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[11px] md:text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white active:scale-[0.98] transition-all"
            >
              Logout Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
