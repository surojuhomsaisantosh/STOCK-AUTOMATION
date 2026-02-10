import React, { useState } from "react";
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
      <nav className="border-b border-slate-200 px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black"
        >
          <FiArrowLeft size={18} /> Back
        </button>

        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black ml-12">Settings</h1>

        {/* UPDATED ID BOX - Better Styling */}
        <div className="flex items-center">
            <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   ID : 
                 </span>
                 <span className="text-sm font-black text-black uppercase tracking-wide leading-none">
                   {user?.franchise_id || "TV-HQ-01"}
                 </span>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-16">
        
        {/* THE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* CARD 1: CHANGE PASSWORD */}
          <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <FiLock size={24} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Security</h3>
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
              className="mt-8 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-900/10 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Update Password
            </button>
          </div>

          {/* CARD 2: LOGOUT */}
          <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <FiLogOut size={24} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Account</h3>
            </div>

            {/* Spacer to push button to the bottom to align with the first card */}
            <div className="flex-1"></div>
            
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white active:scale-[0.98] transition-all"
            >
              Logout
            </button>
          </div>

          {/* SLOT 3: Invisible card to maintain grid width */}
          <div className="hidden lg:block h-full opacity-0 pointer-events-none">
             <div className="p-10 rounded-[2.5rem] border border-transparent">Grid Filler</div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Settings;