import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import DashboardNavbar from "../../components/DashboardNavbar";

function FranchiseOwnerDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  const handleChangePassword = async () => {
    setPasswordMsg("");

    if (!newPassword || !confirmPassword) {
      setPasswordMsg("⚠️ Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg("❌ Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg("❌ " + error.message);
    } else {
      setPasswordMsg("✅ Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNavbar />

      <div className="p-8">

        {/* TAB BUTTONS */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 rounded-xl font-bold ${
              activeTab === "dashboard"
                ? "bg-[rgb(0,100,55)] text-white"
                : "bg-white text-gray-700"
            }`}
          >
            📊 Dashboard
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 rounded-xl font-bold ${
              activeTab === "settings"
                ? "bg-[rgb(0,100,55)] text-white"
                : "bg-white text-gray-700"
            }`}
          >
            ⚙ Settings
          </button>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="bg-white p-10 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4">
              Franchise Owner Dashboard
            </h2>

          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-xl bg-white p-10 rounded-2xl shadow-md space-y-5">
            <h3 className="text-xl font-bold">🔐 Change Password</h3>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[rgb(0,100,55)]"
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[rgb(0,100,55)]"
            />

            {passwordMsg && (
              <p className="text-sm font-semibold text-center">
                {passwordMsg}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              className="w-full py-4 rounded-xl font-bold text-white bg-[rgb(0,100,55)] hover:opacity-90 transition"
            >
              🔁 Update Password
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default FranchiseOwnerDashboard;
