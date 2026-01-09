import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function FranchiseSettingsCard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [loading, setLoading] = useState(false);

  /* CHANGE PASSWORD LOGIC */
  const handleChangePassword = async () => {
    setPasswordMsg("");
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("⚠️ Please fill all fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("⚠️ Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("❌ Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setPasswordMsg("❌ " + error.message);
    } else {
      setPasswordMsg("✅ Password updated successfully");
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
    <div className="max-w-4xl mx-auto p-6 relative">
      
      {/* 1. BACK BUTTON - TOP LEFT */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <span className="text-lg">←</span> Back to Dashboard
      </button>

      {/* HEADER */}
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-slate-500 font-medium">Manage security and session preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* CHANGE PASSWORD CARD */}
        <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Security</h3>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {passwordMsg && (
            <div className={`text-sm py-3 px-4 rounded-xl text-center font-bold ${passwordMsg.includes('✅') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {passwordMsg}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-300 active:scale-[0.97] disabled:opacity-50 transition-all uppercase tracking-wider text-sm"
          >
            {loading ? "Processing..." : "Update Password"}
          </button>
        </div>

        {/* LOGOUT CARD */}
        <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col border-b-8 border-b-rose-500">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Session Management</h3>
            </div>
            <p className="text-slate-500 font-medium leading-relaxed">
              Log out of your account to ensure your franchise data remains private and secure.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-12 w-full py-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-300 active:scale-[0.97] transition-all uppercase tracking-wider text-sm"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}

export default FranchiseSettingsCard;