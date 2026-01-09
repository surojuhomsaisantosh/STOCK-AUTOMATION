import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FranchiseSettingsCard from "../franchise/FranchiseSettingsCard";

function FranchiseOwnerDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8 max-w-7xl mx-auto">

        {/* SETTINGS PAGE */}
        {showSettings ? (
          <FranchiseSettingsCard />
        ) : (
          <div className="space-y-8">

            {/* HEADER */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Franchise Owner Dashboard
              </h2>
              <p className="text-gray-500 mt-1">
                Overview of franchise operations
              </p>
            </div>

            {/* KPI / ACTION CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* 1️⃣ Stock Orders */}
              <div
                onClick={() => navigate("/stock-orders")}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
              >
                <p className="text-sm text-gray-500">Stock Orders</p>
                <h3 className="text-3xl font-bold mt-2">124</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Total orders placed
                </p>
              </div>

              {/* 2️⃣ Invoices */}
              <div
              onClick={() => navigate("/franchise/franchiseinvoices")}    
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
              >
                <p className="text-sm text-gray-500">Invoices</p>
                <h3 className="text-3xl font-bold mt-2">98</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Generated invoices
                </p>
              </div>

              {/* 3️⃣ Settings */}
              <div
                onClick={() => setShowSettings(true)}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow hover:bg-gray-50 transition cursor-pointer"
              >
                <p className="text-sm text-gray-500">Settings</p>
                <h3 className="text-3xl font-bold mt-2">⚙️</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Manage preferences
                </p>
              </div>

              {/* 4️⃣ Reports */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow transition cursor-pointer">
                <p className="text-sm text-gray-500">Reports</p>
                <h3 className="text-3xl font-bold mt-2">15</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Available reports
                </p>
              </div>

              {/* 5️⃣ Coming Soon */}
              <div className="bg-white p-6 rounded-2xl shadow-sm opacity-70">
                <p className="text-sm text-gray-500">Coming Soon</p>
                <h3 className="text-3xl font-bold mt-2">🚀</h3>
                <p className="text-xs text-gray-400 mt-1">
                  New features
                </p>
              </div>

              {/* 6️⃣ Coming Soon */}
              <div className="bg-white p-6 rounded-2xl shadow-sm opacity-70">
                <p className="text-sm text-gray-500">Coming Soon</p>
                <h3 className="text-3xl font-bold mt-2">🚀</h3>
                <p className="text-xs text-gray-400 mt-1">
                  New features
                </p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FranchiseOwnerDashboard;
