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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchProfile();
    return () => window.removeEventListener('resize', handleResize);
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
    <div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-12 font-sans antialiased text-black">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-8' : 'mb-16'}`}>
          <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-[14px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-50" style={{ color: BRAND_GREEN }}>
            <ArrowLeft size={20} /> {isMobile ? "" : "BACK"}
          </button>
          <div className="text-center">
            <h1 className={`${isMobile ? 'text-xl' : 'text-4xl md:text-5xl'} font-black uppercase tracking-tighter leading-none text-black`}>CENTRAL SETTINGS</h1>
            {!isMobile && <p className="text-[11px] font-bold uppercase tracking-[0.4em] mt-3 opacity-30 text-center text-black">ADMINISTRATION</p>}
          </div>
          <div className="flex items-center gap-3 bg-white px-3 md:px-5 py-2 rounded-xl border shadow-sm" style={{ borderColor: SOFT_BORDER }}>
            {!isMobile && <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black">ID :</span>}
            <span className="font-mono text-[10px] md:text-sm font-black text-black">{franchiseId}</span>
          </div>
        </div>

        {/* 3 COLUMNS x 2 ROWS GRID */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>

          {/* 1. ACCESS KEY (Change Password) */}
          <div className={`bg-white rounded-[32px] border p-8 shadow-sm flex flex-col ${isMobile ? 'h-auto' : 'h-[340px]'}`} style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <Lock size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Security</h3>
            </div>
            <div className="space-y-3 flex-1">
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black" style={{ borderColor: SOFT_BORDER }} placeholder="NEW PASSWORD" />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-100 text-black">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black" style={{ borderColor: SOFT_BORDER }} placeholder="CONFIRM PASSWORD" />
              {msg && <p className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color: BRAND_GREEN }}>{msg}</p>}
            </div>
            <button onClick={handleChangePassword} disabled={loading} className="w-full mt-6 md:mt-4 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:brightness-110 active:scale-95 shadow-md shadow-emerald-100" style={{ backgroundColor: BRAND_GREEN }}>
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </div>

          {/* 2. INVOICE DESIGN (Navigation) */}
          <button onClick={() => navigate("/central/invoice-design")} className={`bg-white rounded-[32px] border p-10 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:shadow-lg active:scale-95 group ${isMobile ? 'h-[200px]' : 'h-[340px]'}`} style={{ borderColor: SOFT_BORDER }}>
            <div className="p-6 rounded-2xl bg-emerald-50 transition-all mb-4 md:mb-6 group-hover:scale-110" style={{ color: BRAND_GREEN }}>
              <Palette size={isMobile ? 24 : 32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-black">Invoice Design</h3>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-2 text-black">Customize Layout</p>
          </button>

          {/* 3. LOGOUT (Action) */}
          <div className={`bg-white rounded-[32px] border p-10 shadow-sm flex flex-col justify-center items-center text-center ${isMobile ? 'h-[200px]' : 'h-[340px]'}`} style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}>
            <div className="p-6 rounded-2xl bg-rose-50 text-rose-600 mb-4 md:mb-6">
              <LogOut size={isMobile ? 24 : 32} strokeWidth={2.5} />
            </div>
            <button onClick={handleLogout} className="w-full text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-100">
              LOGOUT
            </button>
          </div>

          {/* 4. SYSTEM LOGS (Coming Soon) */}
          <div className={`bg-slate-100/50 rounded-[32px] border border-dashed p-10 flex flex-col justify-center items-center text-center opacity-60 ${isMobile ? 'h-[150px]' : 'h-[340px]'}`} style={{ borderColor: SOFT_BORDER }}>
            <div className={`${isMobile ? 'p-3 mb-2' : 'p-6 mb-6'} rounded-2xl bg-slate-200/50 text-slate-400`}>
              <Clock size={isMobile ? 20 : 32} strokeWidth={2.5} />
            </div>
            <h3 className={`${isMobile ? 'text-sm' : 'text-xl'} font-black uppercase tracking-tight text-slate-400`}>System Logs</h3>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1 text-slate-400">Coming Soon</p>
          </div>

          {/* 5. ADVANCED CONFIG (Coming Soon) */}
          <div className={`bg-slate-100/50 rounded-[32px] border border-dashed p-10 flex flex-col justify-center items-center text-center opacity-60 ${isMobile ? 'h-[150px]' : 'h-[340px]'}`} style={{ borderColor: SOFT_BORDER }}>
            <div className={`${isMobile ? 'p-3 mb-2' : 'p-6 mb-6'} rounded-2xl bg-slate-200/50 text-slate-400`}>
              <Layers size={isMobile ? 20 : 32} strokeWidth={2.5} />
            </div>
            <h3 className={`${isMobile ? 'text-sm' : 'text-xl'} font-black uppercase tracking-tight text-slate-400`}>Advanced Config</h3>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1 text-slate-400">Coming Soon</p>
          </div>

          {/* 6. DATA BACKUP (Coming Soon) */}
          <div className={`bg-slate-100/50 rounded-[32px] border border-dashed p-10 flex flex-col justify-center items-center text-center opacity-60 ${isMobile ? 'h-[150px]' : 'h-[340px]'}`} style={{ borderColor: SOFT_BORDER }}>
            <div className={`${isMobile ? 'p-3 mb-2' : 'p-6 mb-6'} rounded-2xl bg-slate-200/50 text-slate-400`}>
              <Database size={isMobile ? 20 : 32} strokeWidth={2.5} />
            </div>
            <h3 className={`${isMobile ? 'text-sm' : 'text-xl'} font-black uppercase tracking-tight text-slate-400`}>Data Backup</h3>
            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1 text-slate-400">Coming Soon</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CentralSettings;