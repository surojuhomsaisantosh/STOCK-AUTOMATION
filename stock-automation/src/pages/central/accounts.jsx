import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function Accounts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (data) {
        setInvoiceSettings({
          gstin: data.gstin || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          terms: data.terms || "",
        });

        setBankDetails({
          accountName: data.account_name || "",
          bankName: data.bank_name || "",
          accountNumber: data.account_number || "",
          ifsc: data.ifsc || "",
        });
      }

      setLoading(false);
    };

    loadSettings();
  }, []);

  /* ======================
     SAVE SETTINGS
  ====================== */
  const handleSave = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("accounts")
      .upsert({
        created_by: user.id,

        gstin: invoiceSettings.gstin,
        email: invoiceSettings.email,
        phone: invoiceSettings.phone,
        address: invoiceSettings.address,
        terms: invoiceSettings.terms,

        account_name: bankDetails.accountName,
        bank_name: bankDetails.bankName,
        account_number: bankDetails.accountNumber,
        ifsc: bankDetails.ifsc,

        updated_at: new Date(),
      });

    setSaving(false);

    if (error) {
      alert("Failed to save settings");
      console.error(error);
    } else {
      alert("Accounts settings saved successfully ✅");
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading settings…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Accounts Settings
            </h2>
            <p className="text-gray-500 mt-1">
              Manage invoice & bank information
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* INVOICE SETTINGS */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">Invoice Settings</h3>

            <div className="space-y-4">
              <input
                placeholder="GSTIN"
                value={invoiceSettings.gstin}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, gstin: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                placeholder="Email"
                value={invoiceSettings.email}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, email: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                placeholder="Phone Number"
                value={invoiceSettings.phone}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, phone: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <textarea
                rows="3"
                placeholder="Address"
                value={invoiceSettings.address}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, address: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <textarea
                rows="4"
                placeholder="Terms & Conditions"
                value={invoiceSettings.terms}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, terms: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
          </div>

          {/* BANK DETAILS */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">Bank Details</h3>

            <div className="space-y-4">
              <input
                placeholder="Account Holder Name"
                value={bankDetails.accountName}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, accountName: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                placeholder="Bank Name"
                value={bankDetails.bankName}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, bankName: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                placeholder="IFSC Code"
                value={bankDetails.ifsc}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, ifsc: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* SAVE */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Accounts;
