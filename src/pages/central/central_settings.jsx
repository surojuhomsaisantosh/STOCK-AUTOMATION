import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Lock, LogOut, Eye, EyeOff, CreditCard, SendHorizontal, Info, X, AlertTriangle
} from "lucide-react";

import { BRAND_GREEN } from "../../utils/theme";
const SOFT_BORDER = "rgba(0, 100, 55, 0.15)";

function CentralSettings() {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  const [franchiseId, setFranchiseId] = useState("...");
  const newPasswordRef = React.useRef(null);
  const confirmPasswordRef = React.useRef(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [onlinePayments, setOnlinePayments] = useState(false);
  const [stockRequests, setStockRequests] = useState(false);
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showRefundInfo, setShowRefundInfo] = useState(false);

  // FIX: Define fetchProfile BEFORE calling it in useEffect
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("franchise_id")
        .eq("id", authUser.id)
        .single();

      if (!error && data?.franchise_id) {
        setFranchiseId(data.franchise_id);
      }
    };

    fetchProfile();
  }, [authUser]);

  // Fetch central settings (online payments, stock requests)
  useEffect(() => {
    const fetchSettings = async () => {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from("central_settings")
        .select("key, enabled")
        .in("key", ["online_payments", "stock_requests", "refund_enabled"]);

      if (!error && data) {
        data.forEach((s) => {
          if (s.key === "online_payments") setOnlinePayments(s.enabled);
          if (s.key === "stock_requests") setStockRequests(s.enabled);
          if (s.key === "refund_enabled") setRefundEnabled(s.enabled);
        });
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (showRefundInfo) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showRefundInfo]);

  const handleToggle = async (key, currentValue, setter) => {
    setSettingsLoading(true);
    const newValue = !currentValue;
    setter(newValue);

    const { error } = await supabase
      .from("central_settings")
      .upsert({ key, enabled: newValue }, { onConflict: "key" });

    if (error) {
      setter(currentValue);
      console.error("Failed to update setting:", error);
    }
    setSettingsLoading(false);
  };

  const handleChangePassword = async () => {
    setMsg("");
    
    const newPassword = newPasswordRef.current?.value;
    const confirmPassword = confirmPasswordRef.current?.value;

    // Basic validations
    if (!newPassword || !confirmPassword) {
      setMsg("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Minimum 6 characters required");
      return;
    }

    setLoading(true);

    // Supabase v2 method for updating a logged-in user's password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg("Password updated successfully!");
      if (newPasswordRef.current) newPasswordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans antialiased text-black overflow-x-hidden pb-10">

      {/* --- NEW STICKY HEADER --- */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:text-black/70 transition-colors">
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          {/* Mobile Title */}
          <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden text-black">Settings</h1>

          {/* Mobile ID Box */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID:</span>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
            </div>
          </div>
        </div>

        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Settings</h1>

        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* 1. CHANGE PASSWORD CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <Lock className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Change Password</h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  ref={newPasswordRef}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                  style={{ borderColor: SOFT_BORDER }}
                  placeholder="NEW PASSWORD"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 text-black">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <input
                type={showPass ? "text" : "password"}
                ref={confirmPasswordRef}
                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                style={{ borderColor: SOFT_BORDER }}
                placeholder="CONFIRM PASSWORD"
              />

              {msg && (
                <div className={`text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-lg ${msg.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                  {msg}
                </div>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full mt-6 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:brightness-110 active:scale-95 shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </div>

          {/* 2. ONLINE PAYMENTS CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <CreditCard className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Online Payments</h3>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Master switch for the online stock ordering gateway. Individual outlets are controlled per-franchise in Franchise Profiles.
            </p>

            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <button
                onClick={() => !settingsLoading && handleToggle("online_payments", onlinePayments, setOnlinePayments)}
                disabled={settingsLoading}
                className="relative outline-none border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: onlinePayments ? BRAND_GREEN : "#d1d5db",
                  transition: "background-color 0.3s ease",
                  padding: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 4,
                  left: onlinePayments ? 38 : 4,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: onlinePayments ? BRAND_GREEN : "#9ca3af" }}>
                {settingsLoading ? "Loading..." : onlinePayments ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* 3. STOCK REQUESTS CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <SendHorizontal className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Stock Requests</h3>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Master switch for the stock request portal. Individual outlets are controlled per-franchise in Franchise Profiles.
            </p>

            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <button
                onClick={() => !settingsLoading && handleToggle("stock_requests", stockRequests, setStockRequests)}
                disabled={settingsLoading}
                className="relative outline-none border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: stockRequests ? BRAND_GREEN : "#d1d5db",
                  transition: "background-color 0.3s ease",
                  padding: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 4,
                  left: stockRequests ? 38 : 4,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: stockRequests ? BRAND_GREEN : "#9ca3af" }}>
                {settingsLoading ? "Loading..." : stockRequests ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* 4. REFUND OPTION CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px] relative" style={{ borderColor: SOFT_BORDER }}>
            <button 
              onClick={() => setShowRefundInfo(true)}
              className="absolute top-6 right-6 text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50"
            >
              <Info size={24} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/><path d="M10 14h4"/><path d="M12 12v4"/></svg>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Refund Option</h3>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Enable or disable the refund feature for supply invoices.
            </p>

            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <button
                onClick={() => !settingsLoading && handleToggle("refund_enabled", refundEnabled, setRefundEnabled)}
                disabled={settingsLoading}
                className="relative outline-none border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: refundEnabled ? "#f59e0b" : "#d1d5db",
                  transition: "background-color 0.3s ease",
                  padding: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 4,
                  left: refundEnabled ? 38 : 4,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: refundEnabled ? "#f59e0b" : "#9ca3af" }}>
                {settingsLoading ? "Loading..." : refundEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* 5. LOGOUT CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-10 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[320px]" style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}>
            <div className="p-6 rounded-2xl bg-rose-50 text-rose-600 mb-6 transition-transform hover:scale-110">
              <LogOut className="w-10 h-10" strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-black mb-2">Sign Out</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 px-8 leading-relaxed">
              End your current session securely. You will be redirected to the login screen.
            </p>

            <button
              onClick={handleLogout}
              className="w-full text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-100"
            >
              LOGOUT
            </button>
          </div>

        </div>
      </div>
      {/* --- REFUND INFO MODAL --- */}
      {showRefundInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Info size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Refund Feature Guide</h2>
              </div>
              <button onClick={() => setShowRefundInfo(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-black" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 text-slate-600 text-sm text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <section>
                    <h3 className="font-black text-black mb-2 uppercase tracking-wide text-xs">Purpose</h3>
                    <p className="leading-relaxed">The Refund Feature allows franchises to process refunds for bills generated on the <strong>same day</strong> (within the last 24 hours). This is useful for accidental billings, customer returns, or payment mode corrections.</p>
                  </section>

                  <section>
                    <h3 className="font-black text-black mb-2 uppercase tracking-wide text-xs">How It Works</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li><strong>Enable</strong> the feature here in Settings to allow franchises to use it.</li>
                      <li>At the store, they can go to <strong>Billing History</strong>.</li>
                      <li>Tap any bill generated in the last 24 hours.</li>
                      <li>A yellow <strong>"Refund"</strong> button will appear at the bottom of the bill details.</li>
                      <li>They tap it and choose whether the refund was given via <strong>CASH</strong> or <strong>UPI</strong>.</li>
                      <li>The bill is marked as refunded and its amount is subtracted from their daily stats.</li>
                    </ol>
                  </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <section>
                    <h3 className="font-black text-black mb-2 uppercase tracking-wide text-xs">Example Scenario</h3>
                    <p className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic leading-relaxed">
                      A customer pays ₹500 via UPI, but the cashier accidentally selects Cash on the POS. They can go to History, refund the Cash bill (recording the refund mode), and then create a new correct bill for ₹500 UPI.
                    </p>
                  </section>

                  <section className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-rose-800">
                    <h3 className="font-black mb-2 uppercase tracking-wide text-xs flex items-center gap-2">
                      <AlertTriangle size={14} /> Important Limitations
                    </h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Refunds cannot be undone.</li>
                      <li>Only bills less than 24 hours old can be refunded.</li>
                      <li>Refunded amounts are permanently deducted from daily reports.</li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setShowRefundInfo(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CentralSettings;