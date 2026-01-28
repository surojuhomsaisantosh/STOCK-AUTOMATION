import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Lock, LogOut, Eye, EyeOff,
  User, X, Check, Save, Hash, MapPin, Utensils
} from "lucide-react";

function FranchiseSettingsCard({ onBack }) {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  // Password States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Profile Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    franchise_id: "",
    address: ""
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const brandGreen = "rgb(0, 100, 55)";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openProfile = async () => {
    setShowProfileModal(true);
    setProfileLoading(true);

    if (!authUser?.id) {
      setUpdateMsg("User session not found");
      setProfileLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("name, email, phone, franchise_id, address")
      .eq("id", authUser.id)
      .single();

    if (data) setProfileData(data);
    if (error) console.error("Profile Fetch Error:", error.message);
    setProfileLoading(false);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setUpdateMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      })
      .eq("id", authUser.id);

    if (error) setUpdateMsg("Error: " + error.message);
    else setUpdateMsg("Profile updated successfully");
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setPasswordMsg("");
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("Please fill all fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Min 6 characters required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) setPasswordMsg(error.message);
    else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err.message);
      logout();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/30 p-4 sm:p-6 md:p-8 font-sans antialiased overflow-x-hidden">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className={`relative flex flex-col sm:flex-row items-center justify-center mb-8 sm:mb-20 ${isMobile ? 'gap-4' : ''}`}>
          <button
            onClick={onBack}
            className="sm:absolute left-0 flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all hover:opacity-70 self-start"
            style={{ color: brandGreen }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div className="text-center">
            <h2 className={`font-black text-slate-900 uppercase tracking-tighter ${isMobile ? 'text-2xl' : 'text-4xl'}`}>Account Settings</h2>
          </div>
        </div>

        {/* ADAPTIVE GRID */}
        <div className={`grid gap-6 sm:gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>

          {/* 1. IDENTITY */}
          <button
            onClick={openProfile}
            className="bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-slate-300 hover:shadow-md group min-h-[180px] sm:min-h-[220px]"
          >
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4 sm:mb-6">
              <User size={isMobile ? 28 : 32} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Profile Details</h3>
          </button>

          {/* 2. CORE UTILITY */}
          <button
            onClick={() => navigate("/franchise/menu")}
            className="bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-slate-300 hover:shadow-md group min-h-[180px] sm:min-h-[220px]"
          >
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all mb-4 sm:mb-6">
              <Utensils size={isMobile ? 28 : 32} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Manage Menu</h3>
          </button>

          {/* 3. SECURITY */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6 sm:mb-8 justify-center">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Security</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white outline-none text-sm font-bold transition-all"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white outline-none text-sm font-bold transition-all"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordMsg && <p className="text-[10px] font-black uppercase text-center text-indigo-600">{passwordMsg}</p>}

              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-xl font-black text-white text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-emerald-100"
                style={{ backgroundColor: brandGreen }}
              >
                {loading ? "Updating..." : "Save Password"}
              </button>
            </div>
          </div>

          {/* LOGOUT */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-sm flex flex-col justify-center items-center text-center min-h-[180px] sm:min-h-[220px]">
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 text-rose-600 mb-4 sm:mb-6">
              <LogOut size={isMobile ? 28 : 32} strokeWidth={2.5} />
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl font-black text-white bg-rose-600 text-[11px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
            >
              Logout Session
            </button>
          </div>

        </div>
      </div>

      {/* PROFILE MODAL - MOBILE OPTIMIZED */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className={`bg-white rounded-[40px] w-full max-w-xl shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-200 ${isMobile ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
            <div className={`p-6 sm:p-12 ${isMobile ? 'pb-10' : ''}`}>
              <div className="flex justify-between items-center mb-8 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter">Edit Identity</h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={28} />
                </button>
              </div>

              {profileLoading ? (
                <div className="py-20 text-center font-bold text-slate-300 animate-pulse tracking-[0.3em] uppercase text-xs">Syncing profile...</div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 text-black">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><Hash size={12} /> Franchise ID</label>
                      <p className="font-mono text-sm sm:text-base font-black">{profileData.franchise_id || "N/A"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 text-black">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><MapPin size={12} /> Location</label>
                      <p className="text-[10px] sm:text-xs font-black uppercase truncate">{profileData.address || "No Address"}</p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    <div className="relative space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full py-3 sm:py-4 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="relative space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full py-3 sm:py-4 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="relative space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="text"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full py-3 sm:py-4 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {updateMsg && (
                <div className="mt-6 flex items-center gap-3 text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <Check size={16} /> {updateMsg}
                </div>
              )}

              <div className="mt-8 sm:mt-10">
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading || profileLoading}
                  className="w-full text-white py-4 sm:py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: brandGreen }}
                >
                  <Save size={18} /> Commit Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseSettingsCard;