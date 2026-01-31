import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Lock, LogOut, Eye, EyeOff
} from "lucide-react";

const BRAND_GREEN = "rgb(0, 100, 55)";
const SOFT_BORDER = "rgba(0, 100, 55, 0.15)";

function CentralSettings() {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  const [franchiseId, setFranchiseId] = useState("...");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("franchise_id")
      .eq("id", authUser.id)
      .single();
    if (data?.franchise_id) setFranchiseId(data.franchise_id);
  };

  const handleChangePassword = async () => {
    setMsg("");
    if (!newPassword || newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Minimum 6 characters required");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setMsg(error.message); } 
    else { setMsg("Password updated successfully!"); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-8 lg:p-12 font-sans antialiased text-black overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* --- HEADER (Single Row on All Devices) --- */}
        <div className="flex flex-row items-center justify-between mb-8 md:mb-16 w-full h-12 md:h-16 relative">
          
          {/* 1. LEFT: BACK BUTTON (Fixed Width Container) */}
          <div className="flex-1 flex justify-start">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-[0.2em] transition-all hover:opacity-50 text-black whitespace-nowrap"
            >
                <ArrowLeft size={18} className="md:w-5 md:h-5" /> Back
            </button>
          </div>

          {/* 2. CENTER: HEADING (Absolute Center for Perfect Alignment) */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-auto flex justify-center">
            <h1 className="text-lg md:text-4xl font-black uppercase tracking-widest text-black text-center whitespace-nowrap">
              Settings
            </h1>
          </div>

          {/* 3. RIGHT: ID LABEL & BOX (Fixed Width Container) */}
          <div className="flex-1 flex justify-end items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">ID :</span>
            <div className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl border shadow-sm" style={{ borderColor: SOFT_BORDER }}>
                <span className="font-mono text-xs md:text-sm font-black text-black">
                    {franchiseId}
                </span>
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* 1. CHANGE PASSWORD CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                    <Lock className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-black">Change Password</h3>
            </div>
            
            <div className="space-y-4 flex-1">
                <div className="relative">
                    <input 
                        type={showPass ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500" 
                        style={{ borderColor: SOFT_BORDER }} 
                        placeholder="NEW PASSWORD" 
                    />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 text-black">
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
                
                <input 
                    type={showPass ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500" 
                    style={{ borderColor: SOFT_BORDER }} 
                    placeholder="CONFIRM PASSWORD" 
                />
                
                {msg && (
                    <div className={`text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-lg ${msg.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                        {msg}
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

          {/* 2. LOGOUT CARD */}
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

export default CentralSettings;