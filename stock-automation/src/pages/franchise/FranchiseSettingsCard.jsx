import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Lock, LogOut, Eye, EyeOff, 
  User, X, Check, Save, Hash, MapPin 
} from "lucide-react";

function FranchiseSettingsCard({ onBack }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Password States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const openProfile = async () => {
    setShowProfileModal(true);
    setProfileLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("profiles")
      .select("name, email, phone, franchise_id, address")
      .eq("id", user.id)
      .single();

    if (data) setProfileData(data);
    setProfileLoading(false);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setUpdateMsg("");
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      })
      .eq("id", user.id);

    if (error) setUpdateMsg("Error updating profile");
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
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-white p-4 sm:p-6 md:p-8 font-sans antialiased overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="relative flex flex-col sm:flex-row items-center justify-center mb-8 sm:mb-16">
          <button
            onClick={onBack}
            className="sm:absolute left-0 mb-4 sm:mb-0 flex items-center gap-2 text-sm font-bold transition-all hover:opacity-70 self-start"
            style={{ color: brandGreen }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter">Settings</h2>
          </div>
        </div>

        {/* RESPONSIVE GRID: 1 col on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* PROFILE CARD */}
          <button 
            onClick={openProfile}
            className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-slate-300 group min-h-[180px] sm:min-h-[220px]"
          >
            <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4">
              <User size={28} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Profile Details</h3>
            <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-indigo-600">Edit Identity →</div>
          </button>

          {/* SECURITY CARD */}
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
                <Lock size={20} />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Security</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none text-sm transition-all"
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
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none text-sm transition-all"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {passwordMsg && <p className="text-[10px] font-bold uppercase text-indigo-600 px-2">{passwordMsg}</p>}

              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3 mt-2 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md"
                style={{ backgroundColor: brandGreen }}
              >
                {loading ? "Updating..." : "Save Password"}
              </button>
            </div>
          </div>

          {/* LOGOUT CARD */}
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col justify-center items-center text-center min-h-[180px] sm:min-h-[220px] md:col-span-2 lg:col-span-1">
            <div className="p-3 sm:p-4 rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <LogOut size={28} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Session</h3>
            <button
              onClick={handleLogout}
              className="w-full max-w-xs py-3 rounded-2xl font-black text-white bg-rose-600 text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE MODAL: Scrollable on small screens */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[30px] sm:rounded-[40px] w-full max-w-xl shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sm:mb-10">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Edit Profile</h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={24} />
                </button>
              </div>

              {profileLoading ? (
                <div className="py-20 text-center font-bold text-slate-300 animate-pulse tracking-widest uppercase text-xs">Loading Profile...</div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {/* SYSTEM SECTION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><Hash size={10}/> Franchise ID</label>
                      <p className="font-mono text-sm font-bold text-slate-600">{profileData.franchise_id || "N/A"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1"><MapPin size={10}/> Location</label>
                      <p className="text-[10px] font-bold text-slate-600 uppercase truncate">{profileData.address || "No Address"}</p>
                    </div>
                  </div>

                  {/* EDITABLE FIELDS */}
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="absolute left-4 top-3 text-[8px] font-bold text-slate-400 uppercase">Legal Name</label>
                      <input 
                        type="text" 
                        value={profileData.name} 
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full pt-7 pb-3 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <label className="absolute left-4 top-3 text-[8px] font-bold text-slate-400 uppercase">Email Address</label>
                      <input 
                        type="email" 
                        value={profileData.email} 
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full pt-7 pb-3 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <label className="absolute left-4 top-3 text-[8px] font-bold text-slate-400 uppercase">Phone Number</label>
                      <input 
                        type="text" 
                        value={profileData.phone} 
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full pt-7 pb-3 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {updateMsg && (
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-green-700 uppercase tracking-widest bg-green-50 p-3 rounded-xl">
                  <Check size={14}/> {updateMsg}
                </div>
              )}

              <div className="mt-8 sm:mt-10">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loading || profileLoading}
                  className="w-full text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: brandGreen }}
                >
                  <Save size={18}/> Commit Changes
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