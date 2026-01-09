import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function CentralDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Central Dashboard
          </h2>
          <p className="text-gray-500 mt-1">
            Overview of central operations
          </p>
        </div>

        {/* GRID – 2 × 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1️⃣ Invoices */}
          <div
            onClick={() => navigate("/central/invoices")}
            className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
          >
            <p className="text-sm text-gray-500">Invoices</p>
            <h3 className="text-3xl font-bold mt-2">📄</h3>
            <p className="text-xs text-gray-400 mt-1">
              View & manage invoices
            </p>
          </div>

          {/* 2️⃣ Profiles */}
          <div
            onClick={() => navigate("/central/profiles")}
            className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
          >
            <p className="text-sm text-gray-500">Profiles</p>
            <h3 className="text-3xl font-bold mt-2">👥</h3>
            <p className="text-xs text-gray-400 mt-1">
              Manage users & roles
            </p>
          </div>

          {/* 3️⃣ Settings */}
          <div
            onClick={() => navigate("/central/settings")}
            className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
          >
            <p className="text-sm text-gray-500">Settings</p>
            <h3 className="text-3xl font-bold mt-2">⚙️</h3>
            <p className="text-xs text-gray-400 mt-1">
              Configure system settings
            </p>
          </div>

          {/* 4️⃣ Coming Soon */}
          <div className="bg-white p-6 rounded-2xl shadow-sm opacity-70 cursor-not-allowed">
            <p className="text-sm text-gray-500">Coming Soon</p>
            <h3 className="text-3xl font-bold mt-2">🚀</h3>
            <p className="text-xs text-gray-400 mt-1">
              New features coming
            </p>
          </div>

          {/* 5️⃣ Coming Soon */}
          <div className="bg-white p-6 rounded-2xl shadow-sm opacity-70 cursor-not-allowed">
            <p className="text-sm text-gray-500">Coming Soon</p>
            <h3 className="text-3xl font-bold mt-2">🚀</h3>
            <p className="text-xs text-gray-400 mt-1">
              Stay tuned
            </p>
          </div>

          {/* 6️⃣ Coming Soon */}
          <div className="bg-white p-6 rounded-2xl shadow-sm opacity-70 cursor-not-allowed">
            <p className="text-sm text-gray-500">Coming Soon</p>
            <h3 className="text-3xl font-bold mt-2">🚀</h3>
            <p className="text-xs text-gray-400 mt-1">
              More features on the way
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default CentralDashboard;
