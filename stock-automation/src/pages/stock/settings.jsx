import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function Settings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-emerald-50">

      {/* HEADER */}
      <header className="w-full bg-[rgb(0,100,55)] text-white px-8 py-5 flex justify-between shadow-lg">
        <h1 className="text-2xl font-bold">⚙ Settings</h1>

        <button
          onClick={() => navigate("/dashboard/stockmanager")}
          className="px-6 py-2 rounded-xl bg-gray-200 text-black font-bold hover:bg-gray-300"
        >
          ⬅ Back
        </button>
      </header>

      {/* CONTENT */}
      <main className="p-8">

        {/* SETTINGS GRID — 2 CARDS SIDE BY SIDE */}
        <div className="grid grid-cols-3 gap-6 max-w-6xl">

          {/* CHANGE PASSWORD */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-[rgb(0,100,55,0.3)] h-[220px]">
            <h3 className="font-bold text-lg mb-4">🔐 Change Password</h3>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-2 px-4 py-2 border rounded-xl"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-2 px-4 py-2 border rounded-xl"
            />

            {passwordMsg && (
              <p className="text-sm mb-2 font-semibold">{passwordMsg}</p>
            )}

            <button
              onClick={handleChangePassword}
              className="w-full py-2 rounded-xl bg-[rgb(0,100,55)] text-white font-bold"
            >
              Update Password
            </button>
          </div>

          {/* LOGOUT */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-red-300 h-[220px] flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg mb-2">🚪 Logout</h3>
              <p className="text-gray-600">
                Securely log out of your account.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="py-3 rounded-xl bg-red-500 text-white font-bold"
            >
              Logout
            </button>
          </div>

          {/* RESERVED */}
          <div className="bg-gray-100 rounded-2xl p-6 border-2 border-dashed h-[220px] flex items-center justify-center text-gray-500">
            Future Settings
          </div>

        </div>
      </main>
    </div>
  );
}

export default Settings;
