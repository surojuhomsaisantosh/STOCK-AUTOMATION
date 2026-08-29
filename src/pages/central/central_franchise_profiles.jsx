import React, { useEffect, useState, useMemo, useCallback, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Search,
  UserPlus,
  X,
  Calendar,
  Trash2,
  Edit2,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MapPin,
  User,
  Eye,
  EyeOff,
  ToggleRight,
  ToggleLeft,
  Download,
  Truck,
  ShoppingBag,
  SendHorizontal,
  Layers,
} from "lucide-react";
import { BRAND_GREEN } from "../../utils/theme";
import { isOn } from "../../utils/featureFlags";

// Consistency with your existing brand colors
const PRIMARY = BRAND_GREEN;
const ACTION_GREEN = BRAND_GREEN;
const DANGER_RED = "#dc2626";
const BORDER = "#e5e7eb";

// Per-franchise feature flags rendered as pills next to Edit.
// `is_active` is deliberately NOT here — it keeps its own confirm modal and is
// never exposed to the bulk actions (mass-disabling logs every owner out).
const FEATURE_FIELDS = {
  order_stock_enabled: { label: "Order Stock", short: "ORDER", Icon: ShoppingBag },
  stock_request_enabled: { label: "Stock Request", short: "REQUEST", Icon: SendHorizontal },
};
const FEATURE_FIELD_KEYS = Object.keys(FEATURE_FIELDS);

// Only franchise outlets get the feature pills. Central/Stock accounts never do.
const isFranchiseRow = (p) => p?.role === "franchise";

// Fields the edit modal actually edits. saveChanges must send ONLY these —
// spreading the whole row would write stale is_active / feature flags back.
const EDITABLE_FIELDS = [
  "name", "email", "phone", "role", "company", "franchise_id",
  "branch_location", "nearest_bus_stop", "city", "state", "country",
  "pincode", "address", "transportation_charge",
];

function FeaturePill({ profile, field, disabled, onToggle, compact = false }) {
  const on = isOn(profile[field]);
  const { label, short, Icon } = FEATURE_FIELDS[field];
  return (
    <button
      onClick={() => onToggle(profile, field)}
      disabled={disabled}
      title={`${label}: ${on ? "Enabled" : "Disabled"} — click to ${on ? "disable" : "enable"}`}
      style={{
        display: "flex", alignItems: "center", gap: "5px",
        padding: compact ? "6px 10px" : "4px 10px",
        borderRadius: "16px", cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${on ? "#bbf7d0" : "#fca5a5"}`,
        background: on ? "#dcfce7" : "#fee2e2",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        flex: compact ? 1 : "none",
        justifyContent: "center",
      }}
    >
      <Icon size={13} color={on ? "#166534" : "#dc2626"} />
      <span style={{ fontSize: "10px", fontWeight: 800, color: on ? "#166534" : "#dc2626" }}>
        {compact ? short : label}
      </span>
      <span style={{ fontSize: "10px", fontWeight: 900, color: on ? "#166534" : "#dc2626" }}>
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function CentralProfiles() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Sorting state
  const [sortField, setSortField] = useState("franchise_id");
  const [sortDirection, setSortDirection] = useState("asc");

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);

  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userFranchiseId, setUserFranchiseId] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  // In-flight single-row writes, keyed `${profileId}:${field}`. A set rather
  // than one id so toggling one flag does not grey out the other pills, and so
  // two concurrent toggles cannot clear each other's busy state.
  const [togglingKeys, setTogglingKeys] = useState([]);
  const isToggling = (key) => togglingKeys.includes(key);
  const anyToggling = togglingKeys.length > 0;
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null); // { profile, field }

  // Bulk actions
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkTarget, setBulkTarget] = useState(null); // { field, value }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/");

      const [profileRes, listRes, companiesRes] = await Promise.all([
        supabase.from("profiles").select("role, franchise_id").eq("id", session.user.id).single(),
        supabase.from("profiles").select("*"),
        supabase.from("companies").select("company_name")
      ]);

      if (profileRes.data?.role !== "central") return navigate("/");

      setCurrentUserId(session.user.id);
      setUserFranchiseId(profileRes.data?.franchise_id || "CENTRAL-HQ");
      setProfiles(listRes.data || []);

      if (companiesRes.data) {
        const names = companiesRes.data.map(c => c.company_name).filter(Boolean);
        setAllCompanies([...new Set(names)].sort());
      }

      setLoading(false);
    };
    init();

    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  const dropdownCompanies = useMemo(() => {
    return ["all", ...allCompanies];
  }, [allCompanies]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const sortedAndFilteredProfiles = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase();
    let filtered = profiles.filter(p => {
      const matchesSearch =
        p.name?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.franchise_id?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query);

      const matchesCompany = companyFilter === "all" || p.company === companyFilter;
      return matchesSearch && matchesCompany;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        const valA = (a[sortField] || "").toString().toLowerCase();
        const valB = (b[sortField] || "").toString().toLowerCase();
        
        // Use natural sorting (so TV-2 comes before TV-10)
        return sortDirection === "asc"
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else {
      const roleOrder = { central: 1, stock: 2, franchise: 3 };
      filtered.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
    }

    return filtered;
  }, [profiles, deferredSearchQuery, companyFilter, sortField, sortDirection]);

  const confirmDelete = (profile) => {
    setProfileToDelete(profile);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);

    try {
      const payload = { 
        user_id: profileToDelete.id, 
        franchise_id: profileToDelete.franchise_id || null 
      };

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || "Failed to invoke edge function");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setProfiles(prev => prev.filter(p => p.id !== profileToDelete.id));
      setShowDeleteModal(false);
      setProfileToDelete(null);

    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Could not delete user: " + (err.message || String(err)));
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setEditForm({ ...profile });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("");
    setShowNewPw(false);
    setShowConfirmPw(false);
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveChanges = async () => {
    setSaving(true);

    // If franchise_id changed, cascade update to all related tables
    const oldFranchiseId = selectedProfile.franchise_id;
    const newFranchiseId = editForm.franchise_id;
    if (oldFranchiseId && newFranchiseId && oldFranchiseId !== newFranchiseId) {
      // 1. Update menus
      const { error: menuError } = await supabase
        .from("menus")
        .update({ franchise_id: newFranchiseId })
        .eq("franchise_id", oldFranchiseId);
      if (menuError) {
        alert("Failed to update menus: " + menuError.message);
        setSaving(false);
        return;
      }

      // 2. Update bills_generated
      const { data: billsData, error: billsError } = await supabase
        .from("bills_generated")
        .update({ franchise_id: newFranchiseId })
        .eq("franchise_id", oldFranchiseId)
        .select("id");
      if (billsError) {
        alert("Failed to update bills: " + billsError.message);
        setSaving(false);
        return;
      }
      console.log(`[CASCADE] bills_generated: ${billsData?.length || 0} rows updated from "${oldFranchiseId}" → "${newFranchiseId}"`);

      // 3. Update requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .update({ franchise_id: newFranchiseId })
        .eq("franchise_id", oldFranchiseId)
        .select("id");
      if (requestsError) {
        alert("Failed to update requests: " + requestsError.message);
        setSaving(false);
        return;
      }
      console.log(`[CASCADE] requests: ${requestsData?.length || 0} rows updated from "${oldFranchiseId}" → "${newFranchiseId}"`);

      // 4. Update invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .update({ franchise_id: newFranchiseId })
        .eq("franchise_id", oldFranchiseId)
        .select("id");
      if (invoicesError) {
        alert("Failed to update invoices: " + invoicesError.message);
        setSaving(false);
        return;
      }
      console.log(`[CASCADE] invoices: ${invoicesData?.length || 0} rows updated from "${oldFranchiseId}" → "${newFranchiseId}"`);

      // Warn user if cascade updated 0 rows (likely RLS blocking updates)
      const totalCascaded = (billsData?.length || 0) + (requestsData?.length || 0) + (invoicesData?.length || 0);
      if (totalCascaded === 0) {
        console.warn("[CASCADE] WARNING: 0 rows were updated across all tables. RLS may be blocking updates.");
      }

      // Clear reports page caches so they pick up the new franchise_id
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith("reports_") || key === "reports_data_cache")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (_) { /* ignore storage errors */ }
    }

    // Send ONLY the fields this modal edits. `editForm` is a snapshot of the
    // whole row taken when the modal opened, so spreading it would write stale
    // is_active / order_stock_enabled / stock_request_enabled values back and
    // silently undo a toggle made in the meantime.
    const payload = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in editForm) payload[key] = editForm[key];
    }

    const { error } = await supabase.from("profiles").update(payload).eq("id", selectedProfile.id);
    if (!error) {
      setShowEditModal(false);
      fetchProfiles();
    } else {
      alert("Update failed: " + error.message);
    }
    setSaving(false);
  };

  const confirmToggle = (profile) => {
    if (profile.id === currentUserId) {
      alert("You cannot disable your own account.");
      return;
    }
    if (profile.role === 'stock') {
      alert("Stock Manager accounts cannot be disabled.");
      return;
    }
    setToggleTarget({ profile, field: 'is_active' });
    setShowToggleModal(true);
  };

  /**
   * Flips one boolean flag on one profile. Optimistic, with a rollback to the
   * exact previous value if the write is rejected (e.g. by the DB guard) —
   * otherwise the UI would keep showing a state the database never accepted.
   */
  const applyToggle = async (profile, field) => {
    const key = `${profile.id}:${field}`;
    if (togglingKeys.includes(key)) return false; // ignore double-clicks
    const previous = profile[field];
    const next = previous === false; // NULL/true -> false, false -> true

    setTogglingKeys(prev => [...prev, key]);
    setProfiles(prev => prev.map(p => (p.id === profile.id ? { ...p, [field]: next } : p)));

    const { error } = await supabase
      .from('profiles')
      .update({ [field]: next })
      .eq('id', profile.id);

    if (error) {
      setProfiles(prev => prev.map(p => (p.id === profile.id ? { ...p, [field]: previous } : p)));
      const what = field === 'is_active' ? 'account status' : FEATURE_FIELDS[field].label;
      console.error("Toggle error:", error);
      alert(`Failed to update ${what}: ${error.message || String(error)}`);
    }

    setTogglingKeys(prev => prev.filter(k => k !== key));
    return !error;
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    // Read the live row rather than the snapshot taken when the modal opened.
    const fresh = profiles.find(p => p.id === toggleTarget.profile.id) || toggleTarget.profile;
    const ok = await applyToggle(fresh, toggleTarget.field);
    if (ok) {
      setShowToggleModal(false);
      setToggleTarget(null);
    }
  };

  // Feature pills toggle inline (no confirm) — low stakes and instantly reversible.
  const handleFeatureToggle = (profile, field) => {
    if (bulkBusy) return; // interlock: never race a bulk run
    applyToggle(profile, field);
  };

  /* ================= BULK ACTIONS ================= */

  // "All" means the rows currently VISIBLE after search + company filter, and
  // only franchise outlets. Never Central/Stock accounts, never off-screen rows.
  const bulkTargets = useMemo(
    () => sortedAndFilteredProfiles.filter(isFranchiseRow),
    [sortedAndFilteredProfiles]
  );

  const bulkFilterSummary = useMemo(() => {
    const parts = [];
    if (companyFilter !== "all") parts.push(`Company = ${companyFilter}`);
    if (deferredSearchQuery.trim()) parts.push(`Search = "${deferredSearchQuery.trim()}"`);
    return parts.length ? parts.join(" · ") : "No filter — all franchise outlets";
  }, [companyFilter, deferredSearchQuery]);

  const openBulk = (field, value) => {
    setShowBulkMenu(false);
    if (bulkTargets.length === 0) {
      alert("No franchise outlets match the current filter.");
      return;
    }
    setBulkTarget({ field, value });
  };

  const applyBulk = async () => {
    if (!bulkTarget) return;
    const { field, value } = bulkTarget;
    const ids = bulkTargets.map(p => p.id);
    if (!ids.length) { setBulkTarget(null); return; }

    setBulkBusy(true);
    const idSet = new Set(ids);
    setProfiles(prev => prev.map(p => (idSet.has(p.id) ? { ...p, [field]: value } : p)));

    // PostgREST puts `in.(...)` in the query string, so a long id list can blow
    // the URL length limit. Chunk it.
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .in('id', ids.slice(i, i + CHUNK));

      if (error) {
        // A later chunk failed after earlier ones committed: the optimistic
        // state is now half-wrong and a blanket rollback would also be wrong.
        // Resync from the server instead of guessing.
        console.error("Bulk toggle error:", error);
        await fetchProfiles();
        alert(`Bulk update failed: ${error.message || String(error)}`);
        setBulkBusy(false);
        setBulkTarget(null);
        return;
      }
    }

    setBulkBusy(false);
    setBulkTarget(null);
  };

  const handlePasswordChange = async () => {
    setPasswordMsg("");
    if (!newPassword || !confirmPassword) {
      setPasswordMsg("Please fill both password fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { userId: selectedProfile.id, newPassword }
      });

      if (error) {
        let msg = error.message || "Failed to update password";
        try {
          if (error.context) {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch (_) { }
        throw new Error(msg);
      }

      if (data?.error) throw new Error(data.error);

      setPasswordMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg("Error: " + (err.message || "Failed to update password"));
    }
    setChangingPassword(false);
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'central': return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'stock': return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      case 'franchise': return { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' };
      default: return { background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' };
    }
  };

  const handleExportExcel = () => {
    const exportData = sortedAndFilteredProfiles.map((p, idx) => ({
      "S.No": idx + 1,
      "Name": p.name || "",
      "Email": p.email || "",
      "Phone": p.phone || "",
      "Franchise ID": p.franchise_id || "",
      "Role": p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : "",
      "Company": p.company || "",
      "Branch Location": p.branch_location || "",
      "Nearest Bus Stop": p.nearest_bus_stop || "",
      "City": p.city || "",
      "State": p.state || "",
      "Country": p.country || "",
      "Pincode": p.pincode || "",
      "Address": p.address || "",
      "Transportation Charge": p.transportation_charge != null ? p.transportation_charge : "",
      "Account Status": p.is_active === false ? "Disabled" : "Active",
      "Order Stock": isFranchiseRow(p) ? (isOn(p.order_stock_enabled) ? "ON" : "OFF") : "—",
      "Stock Request": isFranchiseRow(p) ? (isOn(p.stock_request_enabled) ? "ON" : "OFF") : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String(row[key] || "").length)) + 2
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Franchise Profiles");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Franchise_Profiles_${dateStr}.xlsx`);
  };

  if (loading && profiles.length === 0) return <div style={styles.loader}>Loading Profiles...</div>;

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            User <span style={{ color: ACTION_GREEN }}>Profiles</span>
          </h1>

          <div style={styles.topRightActions}>
            <div style={styles.idBox}>
              ID : {userFranchiseId}
            </div>
          </div>
        </div>
      </header>

      <div style={{ ...styles.container, padding: isMobile ? "20px 15px" : "20px" }}>
        {/* SEARCH & DATE BAR */}
        <div style={{
          ...styles.actionBar,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '15px'
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '15px', width: '100%' }}>
            <div style={{ ...styles.searchWrapper, width: isMobile ? '100%' : '350px' }}>
              <Search size={18} color="#9ca3af" />
              <input
                style={styles.searchInput}
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {!isMobile && (
              <div style={styles.dateSection}>
                <Calendar size={16} color={PRIMARY} />
                <span style={styles.dateText}>{today}</span>
              </div>
            )}
          </div>
        </div>

        {/* FILTERS & ACTION ROW */}
        <div style={{
          ...styles.filterRow,
          marginBottom: isMobile ? '15px' : '25px',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '15px' : '0'
        }}>
          {/* Left Side: Dropdown + Total Users Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ ...styles.companyFilterWrapper, width: isMobile ? '100%' : 'fit-content' }}>
              <Building2 size={16} color={PRIMARY} />
              <select
                style={{ ...styles.companySelect, flex: 1 }}
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="all">All Companies</option>
                {dropdownCompanies.filter(c => c !== "all").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#6b7280" />
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#000',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              alignSelf: isMobile ? 'flex-start' : 'center',
              paddingLeft: isMobile ? '5px' : '0'
            }}>
              {sortedAndFilteredProfiles.length} TOTAL USERS
            </span>
          </div>

          {/* Register & Export Buttons Right */}
          <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
            {/* BULK ACTIONS — applies to the franchise rows currently visible */}
            <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
              <button
                onClick={() => setShowBulkMenu(v => !v)}
                disabled={bulkBusy || anyToggling}
                style={{
                  ...styles.registerBtn,
                  background: '#fff',
                  color: '#111827',
                  border: `1.5px solid ${BORDER}`,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                  height: '42px',
                  opacity: (bulkBusy || anyToggling) ? 0.5 : 1,
                  cursor: (bulkBusy || anyToggling) ? 'not-allowed' : 'pointer',
                }}
              >
                <Layers size={16} />
                <span>{bulkBusy ? 'APPLYING…' : 'BULK ACTIONS'}</span>
                <ChevronDown size={14} />
              </button>

              {showBulkMenu && (
                <>
                  {/* click-away catcher */}
                  <div
                    onClick={() => setShowBulkMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                  <div style={styles.bulkMenu}>
                    <div style={styles.bulkMenuHeader}>
                      Applies to {bulkTargets.length} franchise{bulkTargets.length === 1 ? '' : 's'} in view
                    </div>
                    {FEATURE_FIELD_KEYS.map((field) => (
                      <div key={field}>
                        <div style={styles.bulkMenuGroup}>{FEATURE_FIELDS[field].label}</div>
                        <button style={styles.bulkMenuItem} onClick={() => openBulk(field, true)}>
                          <ToggleRight size={15} color="#166534" />
                          <span>Enable for all</span>
                        </button>
                        <button style={styles.bulkMenuItem} onClick={() => openBulk(field, false)}>
                          <ToggleLeft size={15} color={DANGER_RED} />
                          <span>Disable for all</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={handleExportExcel} style={{
              ...styles.registerBtn,
              background: '#1e293b',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              height: '42px'
            }}>
              <Download size={16} />
              <span>EXPORT EXCEL</span>
            </button>

            <button onClick={() => navigate("/register")} style={{
              ...styles.registerBtn,
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              height: '42px'
            }}>
              <UserPlus size={16} />
              <span>REGISTER NEW USER</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA: MOBILE CARDS OR DESKTOP TABLE */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '40px' }}>
            {sortedAndFilteredProfiles.map((p) => (
              <div key={p.id} style={styles.mobileCard}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={styles.avatar}>
                      <User size={20} />
                    </div>
                    <div>
                      <div style={styles.userName}>{p.name}</div>
                      <div style={styles.companyName}>{p.company || "No Company"}</div>
                    </div>
                  </div>
                  <div>
                    <span style={{ ...styles.roleBadge, ...getRoleStyle(p.role) }}>{p.role?.toUpperCase()}</span>
                    {p.is_active === false && (
                      <span style={{ ...styles.roleBadge, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginTop: '4px' }}>DISABLED</span>
                    )}
                  </div>
                </div>

                <div style={styles.gridInfo}>
                  <div>
                    <div style={styles.infoLabel}>Franchise ID</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: PRIMARY }}>{p.franchise_id || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Contact</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>{p.phone || "—"}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                  <Truck size={16} color={ACTION_GREEN} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase' }}>Transport Charge:</span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: p.transportation_charge ? ACTION_GREEN : '#9ca3af', marginLeft: 'auto' }}>
                    {p.transportation_charge ? `₹${Number(p.transportation_charge).toLocaleString('en-IN')}` : "Not Set"}
                  </span>
                </div>

                <div style={styles.addressBox}>
                  <MapPin style={{ flexShrink: 0 }} size={18} />
                  <span style={styles.addressText}>{p.address || "No Address Provided"}</span>
                </div>

                {isFranchiseRow(p) && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ ...styles.infoLabel, marginBottom: '6px' }}>Features</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {FEATURE_FIELD_KEYS.map((field) => (
                        <FeaturePill
                          key={field}
                          profile={p}
                          field={field}
                          disabled={bulkBusy || isToggling(`${p.id}:${field}`)}
                          onToggle={handleFeatureToggle}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ ...styles.cardActions, flexWrap: 'wrap' }}>
                  <button onClick={() => openEditModal(p)} style={styles.mobileActionBtnUpdate}>
                    <Edit2 size={14} /> UPDATE
                  </button>
                  <button onClick={() => confirmDelete(p)} style={styles.mobileActionBtnDelete}>
                    <Trash2 size={14} /> DELETE
                  </button>
                  {p.id !== currentUserId && p.role !== 'stock' && (
                  <button onClick={() => confirmToggle(p)} disabled={bulkBusy || isToggling(`${p.id}:is_active`)} style={{ ...styles.mobileActionBtnUpdate, background: p.is_active !== false ? '#dcfce7' : '#fee2e2', color: p.is_active !== false ? '#166534' : '#dc2626', borderColor: p.is_active !== false ? '#bbf7d0' : '#fca5a5', opacity: (bulkBusy || isToggling(`${p.id}:is_active`)) ? 0.5 : 1 }}>
                    {p.is_active !== false ? <><ToggleRight size={14} /> ON</> : <><ToggleLeft size={14} /> OFF</>}
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <h2 style={{ ...styles.heading, textAlign: 'left', marginBottom: '12px' }}>Users Table</h2>
            <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>S.NO</th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('name')}>
                      <span>USER</span>
                      {sortField === 'name' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('company')}>
                      <span>COMPANY</span>
                      {sortField === 'company' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('franchise_id')}>
                      <span>FRANCHISE ID</span>
                      {sortField === 'franchise_id' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('role')}>
                      <span>ROLE</span>
                      {sortField === 'role' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('phone')}>
                      <span>CONTACT</span>
                      {sortField === 'phone' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.sortableDiv} onClick={() => handleSort('transportation_charge')}>
                      <span>TRANSPORT CHARGE</span>
                      {sortField === 'transportation_charge' ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} color="#ccc" />}
                    </div>
                  </th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>FEATURES</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredProfiles.map((p, index) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: '#9ca3af', fontWeight: 'bold' }}>{index + 1}</td>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.company || "—"}</td>
                    <td style={styles.td}><code style={styles.code}>{p.franchise_id || "—"}</code></td>
                    <td style={styles.td}>
                      <span style={{ ...styles.roleBadge, ...getRoleStyle(p.role) }}>
                        {p.role?.toUpperCase()}
                      </span>
                      {p.is_active === false && (
                        <span style={{ ...styles.roleBadge, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginLeft: '8px' }}>DISABLED</span>
                      )}
                    </td>
                    <td style={styles.td}>{p.phone || "—"}</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '700', color: p.transportation_charge ? '#111827' : '#9ca3af' }}>
                        {p.transportation_charge ? `₹${Number(p.transportation_charge).toLocaleString('en-IN')}` : "—"}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {isFranchiseRow(p) ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {FEATURE_FIELD_KEYS.map((field) => (
                            <FeaturePill
                              key={field}
                              profile={p}
                              field={field}
                              disabled={bulkBusy || isToggling(`${p.id}:${field}`)}
                              onToggle={handleFeatureToggle}
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#d1d5db', fontWeight: 700 }}>—</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => openEditModal(p)} style={styles.actionIconBtn} title="Edit">
                          <Edit2 size={16} color={ACTION_GREEN} />
                        </button>
                        <button onClick={() => confirmDelete(p)} style={styles.actionIconBtn} title="Delete">
                          <Trash2 size={16} color={DANGER_RED} />
                        </button>
                        {p.id !== currentUserId && p.role !== 'stock' && (
                        <button onClick={() => confirmToggle(p)} disabled={bulkBusy || isToggling(`${p.id}:is_active`)} style={{ ...styles.actionIconBtn, opacity: (bulkBusy || isToggling(`${p.id}:is_active`)) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '16px', border: `1px solid ${p.is_active !== false ? '#bbf7d0' : '#fca5a5'}`, background: p.is_active !== false ? '#dcfce7' : '#fee2e2' }} title={p.is_active !== false ? "Disable account" : "Enable account"}>
                          {p.is_active !== false ? <><ToggleRight size={16} color="#166534" /> <span style={{color: '#166534', fontWeight: 'bold', fontSize: '11px'}}>ON</span></> : <><ToggleLeft size={16} color="#dc2626" /> <span style={{color: '#dc2626', fontWeight: 'bold', fontSize: '11px'}}>OFF</span></>}
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={{
            ...styles.modal,
            width: isMobile ? '95%' : '650px', // slightly wider to fit new fields cleanly
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px' }}>Update Profile</h3>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input style={styles.modalInput} name="name" value={editForm.name || ""} onChange={handleInputChange} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Work Email</label>
                  <input style={styles.modalInput} name="email" value={editForm.email || ""} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input style={styles.modalInput} name="phone" value={editForm.phone || ""} onChange={handleInputChange} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>System Role</label>
                  <div style={styles.selectWrapper}>
                    <select style={styles.modalSelect} name="role" value={editForm.role || ""} onChange={handleInputChange}>
                      <option value="central">Central</option>
                      <option value="franchise">Franchise</option>
                      <option value="stock">Stock Manager</option>
                    </select>
                    <ChevronDown size={18} color="#9ca3af" style={styles.selectIcon} />
                  </div>
                </div>
              </div>

              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Company Name</label>
                  <div style={styles.selectWrapper}>
                    <select
                      style={styles.modalSelect}
                      name="company"
                      value={editForm.company || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Company</option>
                      {allCompanies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} color="#9ca3af" style={styles.selectIcon} />
                  </div>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Franchise ID</label>
                  <input 
                    style={{ ...styles.modalInput, background: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }} 
                    name="franchise_id" 
                    value={editForm.franchise_id || ""} 
                    readOnly 
                    disabled 
                  />
                </div>
              </div>

              {/* NEW FIELDS ADDED HERE */}
              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Branch Location</label>
                  <input style={styles.modalInput} name="branch_location" value={editForm.branch_location || ""} onChange={handleInputChange} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nearest Bus Stop</label>
                  <input style={styles.modalInput} name="nearest_bus_stop" value={editForm.nearest_bus_stop || ""} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>City</label>
                  <input style={styles.modalInput} name="city" value={editForm.city || ""} onChange={handleInputChange} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>State</label>
                  <input style={styles.modalInput} name="state" value={editForm.state || ""} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Country</label>
                  <input style={styles.modalInput} name="country" value={editForm.country || "India"} onChange={handleInputChange} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Pincode</label>
                  <input style={styles.modalInput} name="pincode" value={editForm.pincode || ""} onChange={handleInputChange} />
                </div>
              </div>



              <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Transportation Charge (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '700', color: '#9ca3af' }}>₹</span>
                    <input
                      style={{ ...styles.modalInput, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                      name="transportation_charge"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={editForm.transportation_charge ?? ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div style={styles.inputGroup}></div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Street Address</label>
                <textarea
                  style={{ ...styles.modalInput, height: '80px', resize: 'none' }}
                  name="address"
                  value={editForm.address || ""}
                  onChange={handleInputChange}
                />
              </div>

              <button onClick={saveChanges} disabled={saving} style={styles.saveBtn}>
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>

              {/* CHANGE PASSWORD SECTION */}
              <div style={{ marginTop: '15px', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
                  Change Password
                </span>

                <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#f1f5f9', borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '700', color: '#374151' }}>{selectedProfile?.email || 'N/A'}</p>
                </div>

                <div style={{ ...styles.formRow, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...styles.modalInput, width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                        type={showNewPw ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...styles.modalInput, width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                        type={showConfirmPw ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordMsg && (
                  <p style={{ fontSize: '11px', fontWeight: '800', textAlign: 'center', marginTop: '8px', color: passwordMsg.includes('success') ? ACTION_GREEN : '#dc2626' }}>
                    {passwordMsg}
                  </p>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  style={{ ...styles.saveBtn, background: '#1e293b', width: '100%', opacity: (!newPassword || !confirmPassword) ? 0.5 : 1 }}
                >
                  {changingPassword ? "UPDATING..." : "UPDATE PASSWORD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: DANGER_RED, marginBottom: '20px' }}>
              <AlertTriangle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '16px' : '18px' }}>Confirm Deletion</h3>
            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5', marginBottom: '25px' }}>
              Are you sure you want to delete <strong>{profileToDelete?.name}</strong>?<br />
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ ...styles.saveBtn, background: '#f3f4f6', color: '#374151', flex: 1, marginTop: 0 }}
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...styles.saveBtn, background: DANGER_RED, flex: 1, marginTop: 0 }}
              >
                {deleting ? "..." : "DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISABLE/ENABLE CONFIRMATION MODAL */}
      {showToggleModal && (
        <div style={styles.modalOverlay} onClick={() => setShowToggleModal(false)}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '420px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: toggleTarget?.profile?.is_active !== false ? DANGER_RED : ACTION_GREEN, marginBottom: '20px' }}>
              {toggleTarget?.profile?.is_active !== false ? <ToggleLeft size={48} style={{ margin: '0 auto' }} /> : <ToggleRight size={48} style={{ margin: '0 auto' }} />}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '16px' : '18px' }}>
              {toggleTarget?.profile?.is_active !== false ? 'Disable Account' : 'Enable Account'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              {toggleTarget?.profile?.is_active !== false ? (
                <>
                  Are you sure you want to disable <strong>{toggleTarget?.profile?.name}</strong>
                  {toggleTarget?.profile?.role === 'franchise' && <> ({toggleTarget?.profile?.franchise_id})</>}?
                  {toggleTarget?.profile?.role === 'central' && (
                    <><br /><br /><span style={{ color: DANGER_RED, fontWeight: '800' }}>⚠️ WARNING: This is a Central Admin account.</span></>  
                  )}
                  {toggleTarget?.profile?.role === 'franchise' && (
                    <><br /><br /><span style={{ color: DANGER_RED, fontWeight: '700' }}>All store staff under this franchise will also be blocked from logging in.</span></>
                  )}
                </>
              ) : (
                <>Are you sure you want to re-enable <strong>{toggleTarget?.profile?.name}</strong>?<br />They will be able to log in again.</>
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => { setShowToggleModal(false); setToggleTarget(null); }}
                style={{ ...styles.saveBtn, background: '#f3f4f6', color: '#374151', flex: 1, marginTop: 0 }}
              >
                CANCEL
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={anyToggling}
                style={{ ...styles.saveBtn, background: toggleTarget?.profile?.is_active !== false ? DANGER_RED : ACTION_GREEN, flex: 1, marginTop: 0 }}
              >
                {anyToggling ? '...' : (toggleTarget?.profile?.is_active !== false ? 'DISABLE' : 'ENABLE')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ACTION CONFIRMATION MODAL */}
      {bulkTarget && (
        <div style={styles.modalOverlay} onClick={() => !bulkBusy && setBulkTarget(null)}>
          <div style={{ ...styles.modal, width: isMobile ? '90%' : '440px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: bulkTarget.value ? ACTION_GREEN : DANGER_RED, marginBottom: '20px' }}>
              {bulkTarget.value
                ? <ToggleRight size={48} style={{ margin: '0 auto' }} />
                : <ToggleLeft size={48} style={{ margin: '0 auto' }} />}
            </div>

            <h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '16px' : '18px' }}>
              {bulkTarget.value ? 'Enable' : 'Disable'} {FEATURE_FIELDS[bulkTarget.field].label} for{' '}
              {bulkTargets.length} franchise{bulkTargets.length === 1 ? '' : 's'}?
            </h3>

            <div style={{
              background: '#f9fafb', border: `1px solid ${BORDER}`, borderRadius: '10px',
              padding: '10px 14px', margin: '0 0 16px 0', textAlign: 'left'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                Applies to
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                {bulkFilterSummary}
              </div>
            </div>

            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              {bulkTarget.value ? (
                <>They will immediately see the <strong>{FEATURE_FIELDS[bulkTarget.field].label}</strong> card on their dashboard.</>
              ) : (
                <>The <strong>{FEATURE_FIELDS[bulkTarget.field].label}</strong> card will be greyed out and the page blocked for all of them.</>
              )}
              <br /><br />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Central and Stock Manager accounts are not affected.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setBulkTarget(null)}
                disabled={bulkBusy}
                style={{ ...styles.saveBtn, background: '#f3f4f6', color: '#374151', flex: 1, marginTop: 0, opacity: bulkBusy ? 0.5 : 1 }}
              >
                CANCEL
              </button>
              <button
                onClick={applyBulk}
                disabled={bulkBusy}
                style={{ ...styles.saveBtn, background: bulkTarget.value ? ACTION_GREEN : DANGER_RED, flex: 1, marginTop: 0, opacity: bulkBusy ? 0.6 : 1 }}
              >
                {bulkBusy ? 'APPLYING…' : (bulkTarget.value ? 'ENABLE ALL' : 'DISABLE ALL')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827" },
  container: { maxWidth: "1400px", margin: "0 auto" },

  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  topRightActions: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },

  registerBtn: { display: "flex", alignItems: "center", gap: "8px", background: ACTION_GREEN, color: "#fff", border: "none", padding: "8px 24px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", cursor: "pointer", height: '46px' },

  actionBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  filterRow: { display: "flex" },
  companyFilterWrapper: { display: "flex", alignItems: "center", gap: "10px", background: "#fff", border: `1.5px solid ${BORDER}`, padding: "8px 15px", borderRadius: "12px" },
  companySelect: { border: "none", background: "none", outline: "none", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", appearance: "none" },
  dateSection: { display: "flex", alignItems: "center", gap: "10px", background: "#f3f4f6", padding: "0 16px", borderRadius: "14px", border: `1px solid ${BORDER}`, height: "46px" },
  dateText: { fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" },
  searchWrapper: { display: "flex", flex: 1, alignItems: "center", gap: "12px", background: "#f9fafb", border: `1.5px solid ${BORDER}`, borderRadius: "16px", padding: "0 16px", height: "46px" },
  searchInput: { border: "none", background: "none", padding: "14px 0", outline: "none", fontSize: "14px", width: "100%", fontWeight: "500", textOverflow: "ellipsis" },
  tableWrapper: { border: `1px solid ${BORDER}`, borderRadius: "24px", overflowY: "auto", maxHeight: "600px" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thRow: { position: 'sticky', top: 0, background: "#f3f4f6", borderBottom: `2px solid ${PRIMARY}`, zIndex: 2 },
  th: { padding: "18px 24px", fontSize: "11px", fontWeight: "900", color: PRIMARY, letterSpacing: "1.5px" },
  sortableDiv: { cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", userSelect: "none" },
  tr: { borderTop: `1px solid ${BORDER}`, transition: "background-color 0.2s ease" },
  td: { padding: "16px 24px", fontSize: "13px", color: "#111827", fontWeight: "500" },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#4b5563", fontFamily: "monospace" },
  roleBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: "800", display: "inline-block" },
  actionIconBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "4px" },

  bulkMenu: { position: "absolute", top: "48px", right: 0, zIndex: 41, background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: "14px", boxShadow: "0 12px 28px rgba(0,0,0,0.12)", padding: "6px", minWidth: "230px" },
  bulkMenuHeader: { fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 12px 6px", borderBottom: `1px solid ${BORDER}`, marginBottom: "4px" },
  bulkMenuGroup: { fontSize: "10px", fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 12px 4px" },
  bulkMenuItem: { display: "flex", alignItems: "center", gap: "8px", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", textAlign: "left" },

  mobileCard: { background: '#fff', borderRadius: '24px', border: `1.5px solid ${BORDER}`, padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  avatar: { width: '44px', height: '44px', borderRadius: '14px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY },
  userName: { fontWeight: '900', fontSize: '16px', color: '#111827' },
  companyName: { fontSize: '12px', color: '#9ca3af', fontWeight: '700' },
  gridInfo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', padding: '14px', background: '#f9fafb', borderRadius: '16px' },
  infoLabel: { fontSize: '10px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' },
  addressBox: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', color: '#6b7280' },
  addressText: { fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardActions: { display: 'flex', gap: '12px', borderTop: `1px solid ${BORDER}`, paddingTop: '14px' },
  mobileActionBtnUpdate: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', background: '#f0fdf4', border: 'none', color: ACTION_GREEN, fontWeight: '800', fontSize: '11px' },
  mobileActionBtnDelete: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', background: '#fef2f2', border: 'none', color: DANGER_RED, fontWeight: '800', fontSize: '11px' },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: 'blur(6px)' },
  modal: { background: "#fff", borderRadius: "32px", padding: "25px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" },
  modalBody: { display: "flex", flexDirection: "column", gap: "20px" },
  formRow: { display: 'flex', gap: '15px' },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px", flex: 1 },
  label: { fontSize: "11px", fontWeight: "800", color: "#9ca3af", textTransform: 'uppercase' },
  modalInput: { padding: "14px", borderRadius: "14px", border: `1.5px solid ${BORDER}`, outline: "none", fontSize: "14px", background: '#f9fafb' },

  selectWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  modalSelect: {
    padding: "14px",
    paddingRight: "40px",
    borderRadius: "14px",
    border: `1.5px solid ${BORDER}`,
    outline: "none",
    fontSize: "14px",
    background: '#f9fafb',
    width: "100%",
    appearance: "none",
    cursor: "pointer",
    fontWeight: "500"
  },
  selectIcon: { position: 'absolute', right: '14px', pointerEvents: 'none' },

  saveBtn: { background: ACTION_GREEN, color: "#fff", border: "none", padding: "18px", borderRadius: "18px", fontWeight: "800", cursor: "pointer", marginTop: '10px', fontSize: '13px' },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: PRIMARY }
};

export default CentralProfiles;