import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import { useAuth } from "../context/AuthContext";

function DashboardNavbar() {
  const navigate = useNavigate();
  const { role, logout } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="w-full bg-white shadow-md px-8 py-4 flex justify-between items-center">
      
      {/* LEFT: APP / ROLE INFO */}
      <div>
        <h1 className="text-xl font-bold text-[rgb(0,100,55)]">
          STOCK AUTOMATION
        </h1>
        <p className="text-sm text-gray-600">
          Logged in as:{" "}
          <span className="font-semibold capitalize text-black">
            {role || "User"}
          </span>
        </p>
      </div>

      {/* RIGHT: ACTIONS */}
      <button
        onClick={handleLogout}
        className="px-6 py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition"
      >
        🚪 Logout
      </button>
    </div>
  );
}

export default DashboardNavbar;
