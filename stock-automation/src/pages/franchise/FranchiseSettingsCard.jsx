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

      {/* --- HEADER --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            Franchise <span style={{ color: brandGreen }}>Settings</span>
          </h1>

          <div style={styles.idBox}>
            ID : {franchiseId || "---"}
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 md:px-8 pb-8 md:pb-12">

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">

          {/* 1. IDENTITY CARD */}
          <button
            onClick={openProfile}
            className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:shadow-md active:scale-95 group min-h-[200px]"
          >
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4">
              <User size={32} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Profile Details</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Edit Personal Info</p>
          </button>

          {/* 2. MENU CARD */}
          <button
            onClick={() => navigate("/franchise/menu")}
            className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:shadow-md active:scale-95 group min-h-[200px]"
          >
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all mb-4">
              <Utensils size={32} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Manage Menu</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Update Items & Prices</p>
          </button>

          {/* 3. SECURITY CARD */}
          <button
            onClick={openSecurity}
            className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-black/20 hover:shadow-md active:scale-95 group min-h-[200px]"
          >
            <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-all mb-4">
              <ShieldCheck size={32} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Security</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Change Password</p>
          </button>

          {/* 4. LOGOUT CARD */}
          <button
            onClick={handleLogout}
            className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-rose-200 hover:shadow-rose-100 active:scale-95 group min-h-[200px]"
          >
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all mb-4">
              <LogOut size={32} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Sign Out</h3>
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
const styles = {
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }
};

export default FranchiseSettingsCard;