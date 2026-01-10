import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function CentralProfiles() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  /* ======================
     AUTH + INITIAL LOAD
  ====================== */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/");
        return;
      }
      if (mounted) fetchProfiles();
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate("/");
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  /* ======================
     FILTER HANDLING
  ====================== */
  useEffect(() => {
    if (roleFilter === "all") {
      setFilteredProfiles(profiles);
    } else {
      setFilteredProfiles(profiles.filter((p) => p.role === roleFilter));
    }
  }, [roleFilter, profiles]);

  /* ======================
     FETCH PROFILES
  ====================== */
  const fetchProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } else {
      alert("Failed to load profiles");
    }

    setLoading(false);
  };

  /* ======================
     MODALS
  ====================== */
  const openViewModal = (profile) => {
    setSelectedProfile(profile);
    setShowViewModal(true);
  };

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setEditForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      role: profile.role || "",
      branch_location: profile.branch_location || "",
      address: profile.address || "",
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedProfile(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveChanges = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update(editForm)
      .eq("id", selectedProfile.id);

    setSaving(false);

    if (error) {
      alert("Failed to update profile");
    } else {
      closeModals();
      fetchProfiles();
    }
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
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl border bg-white"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          {/* ROLE FILTER */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 pr-10 rounded-xl border bg-white appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="central">Central</option>
              <option value="franchise">Franchise</option>
              <option value="stock">Stock</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
              ▼
            </div>
          </div>

          {/* REFRESH */}
          <button
            onClick={fetchProfiles}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
          >
            Refresh
          </button>

          {/* ✅ REGISTER USER */}
          <button
            onClick={() => navigate("/register")}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            Register User
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Central Profiles ({filteredProfiles.length})
      </h1>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-center">Role</th>
              <th className="p-3 text-left">Branch</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.phone}</td>
                <td className="p-3 text-center capitalize font-semibold">
                  {p.role}
                </td>
                <td className="p-3">{p.branch_location}</td>
                <td className="p-3 text-center space-x-3">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => openViewModal(p)}
                  >
                    View
                  </button>
                  <button
                    className="text-emerald-600 hover:underline"
                    onClick={() => openEditModal(p)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedProfile && (
        <Modal onClose={closeModals} title="Profile Details">
          <Detail label="Name" value={selectedProfile.name} />
          <Detail label="Email" value={selectedProfile.email} />
          <Detail label="Phone" value={selectedProfile.phone} />
          <Detail label="Role" value={selectedProfile.role} />
          <Detail label="Branch" value={selectedProfile.branch_location} />
          <Detail label="Address" value={selectedProfile.address} />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <Modal onClose={closeModals} title="Edit Profile">
          {["name", "email", "phone", "branch_location", "address"].map((f) => (
            <input
              key={f}
              name={f}
              value={editForm[f]}
              onChange={handleEditChange}
              className="w-full mb-3 px-4 py-2 border rounded-xl"
            />
          ))}

          <div className="relative mb-4">
            <select
              name="role"
              value={editForm.role}
              onChange={handleEditChange}
              className="w-full px-4 py-2 border rounded-xl appearance-none pr-10 bg-white"
            >
              <option value="central">Central</option>
              <option value="franchise">Franchise</option>
              <option value="stock">Stock</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
              ▼
            </div>
          </div>

          <button
            onClick={saveChanges}
            disabled={saving}
            className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ======================
   REUSABLE COMPONENTS
====================== */
const Modal = ({ title, children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl w-full max-w-lg p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Detail = ({ label, value }) => (
  <p className="mb-2 text-sm">
    <strong>{label}:</strong> {value || "-"}
  </p>
);

export default CentralProfiles;
