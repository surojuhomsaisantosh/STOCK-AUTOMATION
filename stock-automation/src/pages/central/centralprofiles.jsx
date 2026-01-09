import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function CentralProfiles() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  // 🔥 DEBUG AUTH SESSION
  const debugSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      return;
    }

    console.log("🔐 SESSION:", data.session);

    if (data.session) {
      console.log(
        "👤 USER METADATA ROLE:",
        data.session.user.user_metadata?.role
      );
    }
  };

  useEffect(() => {
    debugSession();     // 🔍 check auth + role
    fetchProfiles();    // 🔍 fetch profiles (RLS applied)
  }, []);

  useEffect(() => {
    if (roleFilter === "all") {
      setFilteredProfiles(profiles);
    } else {
      setFilteredProfiles(
        profiles.filter((p) => p.role === roleFilter)
      );
    }
  }, [roleFilter, profiles]);

  const fetchProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch profiles error:", error);
      alert("Failed to fetch profiles");
    } else {
      console.log("📦 PROFILES RETURNED:", data);
      setProfiles(data || []);
      setFilteredProfiles(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Loading profiles...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          {/* ROLE FILTER */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border bg-white"
          >
            <option value="all">All Roles</option>
            <option value="central">Central</option>
            <option value="franchise">Franchise</option>
            <option value="stock">Stock</option>
          </select>

          {/* REFRESH */}
          <button
            onClick={fetchProfiles}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Central Profiles ({filteredProfiles.length})
      </h1>

      {filteredProfiles.length === 0 ? (
        <p className="text-gray-500">No profiles found</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-center">Role</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-center">Created</th>
              </tr>
            </thead>

            <tbody>
              {filteredProfiles.map((profile) => (
                <tr
                  key={profile.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-3">{profile.name}</td>
                  <td className="p-3">{profile.email}</td>
                  <td className="p-3">{profile.phone}</td>
                  <td className="p-3 text-center capitalize font-semibold">
                    {profile.role}
                  </td>
                  <td className="p-3">{profile.branch_location}</td>
                  <td className="p-3">{profile.address}</td>
                  <td className="p-3 text-center">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CentralProfiles;
