import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Lock, LogOut, Eye, EyeOff,
  User, X, Check, Save, Hash, MapPin, Utensils, ShieldCheck
} from "lucide-react";

function FranchiseSettingsCard() {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  // --- STATES ---
  const [franchiseId, setFranchiseId] = useState("...");

  // Password Logic
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Profile Data
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

  // FIX: Define fetchProfile BEFORE useEffect
  const fetchProfile = async () => {
    if (!authUser?.id) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name, email, phone, franchise_id, address")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setProfileData(data);
        setFranchiseId(data.franchise_id);
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [authUser]);

  const openProfile = async () => {
    setShowProfileModal(true);
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);
  };

  const openSecurity = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("");
    setShowSecurityModal(true);
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

    if (error) {
      setUpdateMsg("Error: " + error.message);
    } else {
      setUpdateMsg("Profile updated successfully");
    }
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

    if (error) {
      setPasswordMsg("Error: " + error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setTimeout(() => setShowSecurityModal(false), 1500);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      navigate("/");
    } catch (err) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans pb-20 relative">

      {/* --- STICKY HEADER --- */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 mb-8">
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
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
            </div>
          </div>
        </div>

        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Settings</h1>

        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
          </div>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-4 md:px-8 pb-8 md:pb-12">

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">

          {/* 1. IDENTITY CARD */}
          <button
            onClick={openProfile}
            className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:-translate-y-1 hover:shadow-lg active:scale-95 group min-h-[260px]"
          >
            <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600 transition-all mb-6">
              <User size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Profile Details</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Edit Personal Info</p>
          </button>

          {/* 2. MENU CARD */}
          <button
            onClick={() => navigate("/franchise/menu")}
            className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:-translate-y-1 hover:shadow-lg active:scale-95 group min-h-[260px]"
          >
            <div className="p-4 rounded-3xl bg-emerald-50 text-emerald-600 transition-all mb-6">
              <Utensils size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Manage Menu</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Update Items & Prices</p>
          </button>

          {/* 3. SECURITY CARD */}
          <button
            onClick={openSecurity}
            className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:-translate-y-1 hover:shadow-lg active:scale-95 group min-h-[260px]"
          >
            <div className="p-4 rounded-3xl bg-slate-100 text-slate-600 transition-all mb-6">
              <ShieldCheck size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Security</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Change Password</p>
          </button>

          {/* 4. LOGOUT CARD */}
          <button
            onClick={handleLogout}
            className="bg-white rounded-[24px] md:rounded-[32px] border p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:bg-rose-50 hover:-translate-y-1 hover:shadow-lg active:scale-95 group min-h-[260px]"
            style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}
          >
            <div className="p-4 rounded-3xl bg-rose-50 text-rose-600 transition-all mb-6 group-hover:bg-rose-100">
              <LogOut size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Sign Out</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">End Session</p>
          </button>

        </div>
      </main>

      {/* --- 1. PROFILE MODAL --- */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Edit Profile</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-black" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {profileLoading ? (
                <div className="py-20 text-center font-black text-slate-300 animate-pulse tracking-[0.2em] uppercase text-xs">Syncing profile...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Hash size={10} /> ID</label>
                      <p className="font-mono text-sm font-black text-slate-900">{profileData.franchise_id || "N/A"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><MapPin size={10} /> Loc</label>
                      <p className="text-xs font-black text-slate-900 uppercase break-words leading-snug">{profileData.address || "No Address"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="relative space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full py-3 px-4 rounded-xl bg-white border-2 border-slate-100 text-sm font-bold text-slate-900 focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div className="relative space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full py-3 px-4 rounded-xl bg-white border-2 border-slate-100 text-sm font-bold text-slate-900 focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div className="relative space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="text"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full py-3 px-4 rounded-xl bg-white border-2 border-slate-100 text-sm font-bold text-slate-900 focus:border-black outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* FIXED ALERTS: Red for errors, Green for success */}
              {updateMsg && (
                <div className={`mt-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl border ${updateMsg.includes("Error") ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                  {updateMsg.includes("Error") ? <X size={14} /> : <Check size={14} />} {updateMsg}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button onClick={handleUpdateProfile} disabled={loading || profileLoading} className="w-full text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50" style={{ backgroundColor: brandGreen }}>
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. SECURITY MODAL --- */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Update Password</h2>
              <button onClick={() => setShowSecurityModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-black" />
              </button>
            </div>

            <div className="p-8">
              <div className="space-y-5">
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border-2 border-slate-100 bg-white focus:border-black outline-none text-sm font-bold transition-all text-slate-900 placeholder:text-slate-300"
                  />
                  <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border-2 border-slate-100 bg-white focus:border-black outline-none text-sm font-bold transition-all text-slate-900 placeholder:text-slate-300"
                  />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* FIXED ALERTS: Red for errors, Green for success */}
                {passwordMsg && (
                  <p className={`text-[10px] font-black uppercase text-center animate-pulse ${passwordMsg.includes("success") ? "text-emerald-600" : "text-rose-600"}`}>
                    {passwordMsg}
                  </p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-black text-white text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ backgroundColor: brandGreen }}
                >
                  {loading ? "Updating..." : "Confirm Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// --- STYLES ---
// (No longer needed, using Tailwind inline on sticky header)
const styles = {};

export default FranchiseSettingsCard;