import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function Accounts() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // "invoice" | "bank"

  const [invoiceSettings, setInvoiceSettings] = useState({
    gstin: "",
    email: "",
    phone: "",
    address: "",
    terms: "",
  });

  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
  });

  /* ======================
     LOAD SETTINGS
  ====================== */
  useEffect(() => {
    let mounted = true;

    const load = async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (error) console.error("Load error:", error);

      if (data && mounted) {
        setInvoiceSettings({
          gstin: data.gstin ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          terms: data.terms ?? "",
        });

        setBankDetails({
          accountName: data.account_name ?? "",
          bankName: data.bank_name ?? "",
          accountNumber: data.account_number ?? "",
          ifsc: data.ifsc ?? "",
        });
      }

      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      load(data.session?.user);
    });

    return () => {
      mounted = false;
    };
  }, []);

  /* ======================
     SAVE SETTINGS
  ====================== */
  const handleSave = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      created_by: user.id,
      updated_at: new Date(),
    };

    if (invoiceSettings.gstin) payload.gstin = invoiceSettings.gstin;
    if (invoiceSettings.email) payload.email = invoiceSettings.email;
    if (invoiceSettings.phone) payload.phone = invoiceSettings.phone;
    if (invoiceSettings.address) payload.address = invoiceSettings.address;
    if (invoiceSettings.terms) payload.terms = invoiceSettings.terms;

    if (bankDetails.accountName) payload.account_name = bankDetails.accountName;
    if (bankDetails.bankName) payload.bank_name = bankDetails.bankName;
    if (bankDetails.accountNumber)
      payload.account_number = bankDetails.accountNumber;
    if (bankDetails.ifsc) payload.ifsc = bankDetails.ifsc;

    const { error } = await supabase
      .from("accounts")
      .upsert(payload, { onConflict: "created_by" });

    setSaving(false);
    setActiveModal(null);

    if (error) {
      console.error("Save error:", error);
      alert("Failed to save settings");
    } else {
      alert("Accounts settings saved ✅");
    }
  };

  /* ======================
     LOADING UI
  ====================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading accounts…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            ← Back
          </button>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Accounts Settings
            </h2>
            <p className="text-gray-500 mt-1">
              Manage invoice & bank information
            </p>
          </div>
        </div>

        {/* GRID – 3 × 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card
            title="Invoice Settings"
            subtitle="GST, address, terms"
            onClick={() => setActiveModal("invoice")}
          />
          <Card
            title="Bank Details"
            subtitle="Account & IFSC"
            onClick={() => setActiveModal("bank")}
          />
          <DisabledCard title="GST on the Items" />
          <DisabledCard title="Tax Settings" />
          <DisabledCard title="Payouts" />
          <DisabledCard title="Security" />
        </div>
      </div>

      {/* MODAL */}
      {activeModal && (
        <Modal
          title={
            activeModal === "invoice"
              ? "Edit Invoice Settings"
              : "Edit Bank Details"
          }
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {activeModal === "invoice" ? (
            <InvoiceForm
              data={invoiceSettings}
              setData={setInvoiceSettings}
            />
          ) : (
            <BankForm
              data={bankDetails}
              setData={setBankDetails}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

/* ======================
   UI COMPONENTS
====================== */

const Card = ({ title, subtitle, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl p-6 cursor-pointer border
               hover:border-green-700 hover:shadow-md transition"
  >
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const DisabledCard = ({ title }) => (
  <div className="bg-white rounded-2xl p-6 border text-gray-400">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm mt-1">Coming soon</p>
  </div>
);

const Modal = ({ title, children, onClose, onSave, saving }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {children}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 border rounded-lg">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-green-700 text-white rounded-lg"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
);

/* ======================
   FORMS
====================== */

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      {...props}
      className="w-full rounded-lg border px-4 py-2 bg-gray-50
                 focus:outline-none focus:ring-2 focus:ring-green-600
                 focus:border-green-600 transition"
    />
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <textarea
      {...props}
      className="w-full rounded-lg border px-4 py-2 bg-gray-50
                 focus:outline-none focus:ring-2 focus:ring-green-600
                 focus:border-green-600 transition"
    />
  </div>
);

const InvoiceForm = ({ data, setData }) => (
  <div className="space-y-4">
    <Input
      label="GSTIN"
      value={data.gstin}
      onChange={(e) => setData({ ...data, gstin: e.target.value })}
    />
    <Input
      label="Email"
      value={data.email}
      onChange={(e) => setData({ ...data, email: e.target.value })}
    />
    <Input
      label="Phone"
      value={data.phone}
      onChange={(e) => setData({ ...data, phone: e.target.value })}
    />
    <Textarea
      label="Address"
      rows="3"
      value={data.address}
      onChange={(e) => setData({ ...data, address: e.target.value })}
    />
    <Textarea
      label="Terms & Conditions"
      rows="4"
      value={data.terms}
      onChange={(e) => setData({ ...data, terms: e.target.value })}
    />
  </div>
);

const BankForm = ({ data, setData }) => (
  <div className="space-y-4">
    <Input
      label="Account Holder Name"
      value={data.accountName}
      onChange={(e) => setData({ ...data, accountName: e.target.value })}
    />
    <Input
      label="Bank Name"
      value={data.bankName}
      onChange={(e) => setData({ ...data, bankName: e.target.value })}
    />
    <Input
      label="Account Number"
      value={data.accountNumber}
      onChange={(e) => setData({ ...data, accountNumber: e.target.value })}
    />
    <Input
      label="IFSC Code"
      value={data.ifsc}
      onChange={(e) => setData({ ...data, ifsc: e.target.value })}
    />
  </div>
);

export default Accounts;
