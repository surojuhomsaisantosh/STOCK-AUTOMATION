import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Lock, LogOut, Eye, EyeOff } from "lucide-react";

const BRAND_GREEN = "rgb(0, 100, 55)";

function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [displayId, setDisplayId] = useState("");

  // Added states for Loading and Visibility
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    // Validations
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("Error: Please fill all fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Error: Minimum 6 characters required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Error: Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setPasswordMsg(`Error: ${error.message}`);
    } else {
      setPasswordMsg("Success: Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans pb-10 md:pb-20">

      {/* --- STICKY HEADER --- */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:text-black/70 transition-colors">
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          {/* Mobile Title */}
          <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden text-black">Settings</h1>

          {/* Mobile ID Box */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID:</span>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{displayId}</span>
            </div>
          </div>
        </div>

        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Settings</h1>

        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{displayId}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* CARD 1: CHANGE PASSWORD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: "rgba(0, 100, 55, 0.15)" }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <Lock className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Change Password</h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="NEW PASSWORD"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                  style={{ borderColor: "rgba(0, 100, 55, 0.15)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 text-black"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="CONFIRM PASSWORD"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                  style={{ borderColor: "rgba(0, 100, 55, 0.15)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 text-black"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordMsg && (
                <div className={`text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-lg ${passwordMsg.includes("Success") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                  {passwordMsg.replace("Error: ", "").replace("Success: ", "")}
                </div>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full mt-6 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:brightness-110 active:scale-95 shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </div>

          {/* CARD 2: LOGOUT */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-10 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[320px]" style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}>
            <div className="p-6 rounded-2xl bg-rose-50 text-rose-600 mb-6 transition-transform hover:scale-110">
              <LogOut className="w-10 h-10" strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-black mb-2">Sign Out</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 px-8 leading-relaxed">
              End your current session securely. You will be redirected to the login screen.
            </p>

            <button
              onClick={handleLogout}
              className="w-full text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-100"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;