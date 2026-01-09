import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function CentralSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* CHANGE PASSWORD */
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("✅ Password updated successfully");
      setNewPassword("");
    }
  };

  /* LOGOUT */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-8">Central Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">

        {/* 🔐 CHANGE PASSWORD CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Change Password</h3>

          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border mb-4"
          />

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>

        {/* 🚪 LOGOUT CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">Account</h3>

          <p className="text-sm text-gray-500 mb-4">
            Logout from your account securely.
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}

export default CentralSettings;
