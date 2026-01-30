import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Lock, LogOut, Eye, EyeOff, 
  Palette, Clock, Layers, Database
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
    // FIX 1: Added overflow-x-hidden to prevent horizontal scroll/cutoff
    <div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-8 lg:p-12 font-sans antialiased text-black overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between mb-8 md:mb-16">
          
          {/* 1. BACK BUTTON */}
          <button 
            onClick={() => navigate(-1)} 
            // FIX 2: Added shrink-0 so the button never gets squished
            className="order-1 shrink-0 flex items-center gap-2 md:gap-3 text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-50" 
            style={{ color: BRAND_GREEN }}
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5" /> BACK
          </button>
          
          {/* 2. FRANCHISE ID */}
          <div 
            // FIX 3: Added max-w-[50%] so it doesn't push the screen width out
            // FIX 4: Added overflow-hidden to the container itself
            className="order-2 md:order-3 max-w-[50%] md:max-w-none flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl border shadow-sm overflow-hidden" 
            style={{ borderColor: SOFT_BORDER }}
          >
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 text-black shrink-0">ID:</span>
            
            {/* FIX 5: Added 'truncate' class to cut off long IDs with ellipsis (...) */}
            <span className="font-mono text-xs md:text-sm font-black text-black truncate">
              {franchiseId}
            </span>
          </div>

          {/* 3. TITLE */}
          <div className="order-3 md:order-2 w-full md:w-auto text-center mt-6 md:mt-0">
            {/* FIX 6: Added break-words to ensure title breaks if screen is tiny */}
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-black break-words">
              CENTRAL SETTINGS
            </h1>
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.4em] mt-2 md:mt-3 opacity-30 text-center text-black">
              ADMINISTRATION
            </p>
          </div>

        </div>

        {/* CONTENT GRID (Unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* 1. ACCESS KEY */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col min-h-[300px] md:h-[340px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-4 md:mb-6">
                <div className="p-2.5 md:p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                    <Lock className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                </div>
                <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-black">Change Password</h3>
            </div>
            <div className="space-y-3 flex-1">
                <div className="relative">
                    <input type={showPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black" style={{ borderColor: SOFT_BORDER }} placeholder="NEW PASSWORD" />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-100 text-black">
                        {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                </div>
                <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black" style={{ borderColor: SOFT_BORDER }} placeholder="CONFIRM PASSWORD" />
                {msg && <p className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color: BRAND_GREEN }}>{msg}</p>}
            </div>
            <button onClick={handleChangePassword} disabled={loading} className="w-full mt-4 text-white py-3.5 md:py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:brightness-110 active:scale-95 shadow-md shadow-emerald-100" style={{ backgroundColor: BRAND_GREEN }}>
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </div>

          {/* 2. INVOICE DESIGN */}
          <button onClick={() => navigate("/central/invoice-design")} className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-10 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:shadow-lg active:scale-95 group min-h-[260px] md:h-[340px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="p-5 md:p-6 rounded-2xl bg-emerald-50 transition-all mb-4 md:mb-6 group-hover:scale-110" style={{ color: BRAND_GREEN }}>
              <Palette className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-black">Invoice Design</h3>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-2 text-black">Customize Layout</p>
          </button>

          {/* 3. LOGOUT */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-10 shadow-sm flex flex-col justify-center items-center text-center min-h-[260px] md:h-[340px]" style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}>
            <div className="p-5 md:p-6 rounded-2xl bg-rose-50 text-rose-600 mb-4 md:mb-6">
              <LogOut className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <button onClick={handleLogout} className="w-full text-white py-3.5 md:py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-100">
              LOGOUT
            </button>
            <p className="text-[9px] font-black text-rose-600/40 uppercase tracking-widest mt-4">Sign out of account</p>
          </div>

          {/* 4. SYSTEM LOGS */}
          <div className="bg-slate-100/50 rounded-[24px] md:rounded-[32px] border border-dashed p-6 md:p-10 flex flex-col justify-center items-center text-center opacity-60 min-h-[200px] md:h-[340px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="p-5 md:p-6 rounded-2xl bg-slate-200/50 text-slate-400 mb-4 md:mb-6">
              <Clock className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-400">System Logs</h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-2 text-slate-400">Coming Soon</p>
          </div>

          {/* 5. ADVANCED CONFIG */}
          <div className="bg-slate-100/50 rounded-[24px] md:rounded-[32px] border border-dashed p-6 md:p-10 flex flex-col justify-center items-center text-center opacity-60 min-h-[200px] md:h-[340px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="p-5 md:p-6 rounded-2xl bg-slate-200/50 text-slate-400 mb-4 md:mb-6">
              <Layers className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-400">Advanced Config</h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-2 text-slate-400">Coming Soon</p>
          </div>

          {/* 6. DATA BACKUP */}
          <div className="bg-slate-100/50 rounded-[24px] md:rounded-[32px] border border-dashed p-6 md:p-10 flex flex-col justify-center items-center text-center opacity-60 min-h-[200px] md:h-[340px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="p-5 md:p-6 rounded-2xl bg-slate-200/50 text-slate-400 mb-4 md:mb-6">
              <Database className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-400">Data Backup</h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-2 text-slate-400">Coming Soon</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CentralSettings;