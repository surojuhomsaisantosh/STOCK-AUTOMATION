import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function FranchiseSettingsCard({ onBack }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* CHANGE PASSWORD LOGIC */
  const handleChangePassword = async () => {
    setPasswordMsg("");
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("Please fill all fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters");
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
      setPasswordMsg(error.message);
    } else {
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
    <div className="max-w-7xl mx-auto p-6">

      {/* HEADER ROW */}
      <div className="relative flex items-center mb-10">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          ← Back
        </button>

        {/* Centered Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h2 className="text-3xl font-black text-slate-900">
            Account Settings
          </h2>
          <p className="text-slate-500">
            Manage your account preferences
          </p>
        </div>
      </div>

      {/* GRID 2 x 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-8">

        {/* CARD 1 — CHANGE PASSWORD */}
        <div className="bg-white rounded-2xl border p-6 space-y-5">
          <h3 className="text-lg font-bold text-slate-800">
            Change Password
          </h3>

          {/* New Password */}
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showNew ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {passwordMsg && (
            <div className="text-sm font-semibold text-slate-600">
              {passwordMsg}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white
                       bg-[rgb(0,100,55)] hover:bg-[rgb(0,85,45)]
                       disabled:opacity-50 transition-colors"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>

        {/* CARD 2 — LOGOUT */}
        <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Logout
            </h3>
            <p className="text-slate-500 text-sm">
              Sign out from your account securely.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 py-3 rounded-xl bg-rose-600 text-white font-bold"
          >
            Sign Out
          </button>
        </div>

        {/* EMPTY CARDS */}
        <div className="bg-white rounded-2xl border" />
        <div className="bg-white rounded-2xl border" />
        <div className="bg-white rounded-2xl border" />
        <div className="bg-white rounded-2xl border" />
      </div>
    </div>
  );
}

export default FranchiseSettingsCard;
