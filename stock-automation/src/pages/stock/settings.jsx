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
      setPasswordMsg("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-white p-10">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => navigate("/dashboard/stockmanager")}
          className="text-sm font-medium text-gray-700 hover:text-black"
        >
          ← Back
        </button>

        <h1 className="text-xl font-semibold text-black">
          Settings
        </h1>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CHANGE PASSWORD */}
        <div className="border border-gray-300 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-black">
            Change Password
          </h3>

          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full mb-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mb-4 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
          />

          {passwordMsg && (
            <p className="text-sm text-gray-700 mb-4">
              {passwordMsg}
            </p>
          )}

          {/* PROPER PRIMARY BUTTON */}
          <button
            onClick={handleChangePassword}
            style={{
              backgroundColor: "#0b3d2e",
              color: "#ffffff",
            }}
            className="
              w-full
              h-11
              rounded-lg
              text-sm
              font-semibold
              shadow-md
              hover:shadow-lg
              active:scale-[0.98]
              transition
            "
          >
            Update Password
          </button>
        </div>

        {/* LOGOUT */}
        <div className="border border-gray-300 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">
              Logout
            </h3>
            <p className="text-sm text-gray-600">
              End your current session safely.
            </p>
          </div>

          {/* PROPER DESTRUCTIVE BUTTON */}
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#dc2626",
              color: "#ffffff",
            }}
            className="
              w-full
              h-11
              mt-6
              rounded-lg
              text-sm
              font-semibold
              shadow-md
              hover:shadow-lg
              active:scale-[0.98]
              transition
            "
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
