import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FranchiseSettingsCard from "../franchise/FranchiseSettingsCard";

function FranchiseOwnerDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="max-w-7xl w-full px-8 py-12">

        {showSettings ? (
          <FranchiseSettingsCard />
        ) : (
          <div className="space-y-12">

            {/* HEADER */}
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-black">
                Franchise Owner Dashboard
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Overview of franchise operations
              </p>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center pt-6 lg:pt-10">

              {/* Order Here */}
              <div
                onClick={() => navigate("/stock-orders")}
                className="w-[300px] border border-gray-200 rounded-xl p-8 text-center cursor-pointer
                           hover:border-green-900 hover:bg-green-50 transition"
              >
                <h3 className="text-lg font-medium text-black">
                  Order Here
                </h3>
              </div>

              {/* Invoices */}
              <div
                onClick={() => navigate("/franchise/invoices")}
                className="w-[300px] border border-gray-200 rounded-xl p-8 text-center cursor-pointer
                           hover:border-green-900 hover:bg-green-50 transition"
              >
                <h3 className="text-lg font-medium text-black">
                  Invoices
                </h3>
              </div>

              {/* Settings */}
              <div
                onClick={() => setShowSettings(true)}
                className="w-[300px] border border-gray-200 rounded-xl p-8 text-center cursor-pointer
                           hover:border-green-900 hover:bg-green-50 transition"
              >
                <h3 className="text-lg font-medium text-black">
                  Settings
                </h3>
              </div>

              {/* Coming Next */}
              <div className="w-[300px] border border-gray-100 rounded-xl p-8 text-center text-gray-400">
                <h3 className="text-lg font-medium">
                  Coming Next
                </h3>
              </div>

              {/* Coming Next */}
              <div className="w-[300px] border border-gray-100 rounded-xl p-8 text-center text-gray-400">
                <h3 className="text-lg font-medium">
                  Coming Next
                </h3>
              </div>

              {/* Coming Next */}
              <div className="w-[300px] border border-gray-100 rounded-xl p-8 text-center text-gray-400">
                <h3 className="text-lg font-medium">
                  Coming Next
                </h3>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FranchiseOwnerDashboard;
