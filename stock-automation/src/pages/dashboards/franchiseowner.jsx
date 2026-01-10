import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FranchiseSettingsCard from "../franchise/FranchiseSettingsCard";
import { supabase } from "../../supabase/supabaseClient";

function FranchiseOwnerDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setFranchiseName(data.name);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-8 py-10">

        {showSettings ? (
          <FranchiseSettingsCard onBack={() => setShowSettings(false)} />
        ) : (
          <div className="space-y-12">

            {/* HEADER */}
            <div>
              <h1 className="text-4xl font-bold text-black">
                Franchise Owner Dashboard
              </h1>

              <div className="mt-6">
                <p className="text-sm font-semibold text-black">
                  Hello{franchiseName ? `, ${franchiseName}` : ""} 👋
                </p>
              </div>
            </div>

            {/* 2 ROWS × 3 COLUMNS */}
            <div className="grid grid-cols-3 gap-10 pt-6">

              {/* Order Here */}
              <div
                onClick={() => navigate("/stock-orders")}
                className="h-56 cursor-pointer
                           rounded-2xl bg-white
                           border border-black
                           shadow-[0_8px_20px_rgba(0,0,0,0.15)]
                           flex items-center justify-center text-center
                           transition hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
              >
                <h3 className="text-xl font-semibold text-black">
                  Order Here
                </h3>
              </div>

              {/* Invoices */}
              <div
                onClick={() => navigate("/franchise/invoices")}
                className="h-56 cursor-pointer
                           rounded-2xl bg-white
                           border border-black
                           shadow-[0_8px_20px_rgba(0,0,0,0.15)]
                           flex items-center justify-center text-center
                           transition hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
              >
                <h3 className="text-xl font-semibold text-black">
                  Invoices
                </h3>
              </div>

              {/* Settings */}
              <div
                onClick={() => setShowSettings(true)}
                className="h-56 cursor-pointer
                           rounded-2xl bg-white
                           border border-black
                           shadow-[0_8px_20px_rgba(0,0,0,0.15)]
                           flex items-center justify-center text-center
                           transition hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
              >
                <h3 className="text-xl font-semibold text-black">
                  Settings
                </h3>
              </div>

              {/* Coming Next */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56
                             rounded-2xl bg-white
                             border border-dashed border-black
                             shadow-[0_6px_16px_rgba(0,0,0,0.1)]
                             flex items-center justify-center text-center"
                >
                  <h3 className="text-lg font-medium text-black">
                    Coming Next
                  </h3>
                </div>
              ))}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FranchiseOwnerDashboard;
