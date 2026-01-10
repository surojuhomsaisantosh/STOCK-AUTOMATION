import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function CentralInvoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  // MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  /* ======================
     FETCH INVOICES
  ====================== */
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        total_amount,
        created_at,
        status,
        customer_name,
        customer_phone,
        customer_email,
        branch_location
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH INVOICES ERROR:", error);
    }

    setInvoices(data || []);
    setLoading(false);
  };

  /* ======================
     OPEN MODAL + LOAD ITEMS
  ====================== */
  const openInvoiceModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setItems([]);
    setShowModal(true);
    setItemsLoading(true);

    const { data, error } = await supabase
      .from("invoice_items")
      .select("id, item_name, quantity, unit, price")
      .eq("invoice_id", invoice.id);

    console.log("INVOICE ID:", invoice.id);
    console.log("ITEMS DATA:", data);
    console.log("ITEMS ERROR:", error);

    setItems(data || []);
    setItemsLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
    setItems([]);
  };

  /* ======================
     SEARCH FILTER
  ====================== */
  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;

    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.branch_location?.toLowerCase().includes(q)
    );
  }, [search, invoices]);

  if (loading) {
    return <div className="p-10 text-center">Loading invoices…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* BACK */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
      >
        ← Back
      </button>

      {/* HEADER + SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Central Invoices</h1>

        <input
          type="text"
          placeholder="Search by customer or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-xl border outline-none"
        />
      </div>

      {/* INVOICE LIST */}
      <div className="space-y-4">
        {filteredInvoices.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-xl shadow-sm border p-5 grid grid-cols-12 gap-4 items-center"
          >
            <div className="col-span-4">
              <p className="font-semibold">{inv.customer_name}</p>
              <p className="text-xs text-gray-500">
                {inv.customer_phone} • {inv.customer_email}
              </p>
            </div>

            <div className="col-span-3 text-sm text-gray-700">
              {inv.branch_location}
            </div>

            <div className="col-span-2 text-center text-sm">
              {new Date(inv.created_at).toLocaleDateString()}
            </div>

            <div className="col-span-1 text-center">
              <span className="px-2 py-1 rounded-lg text-xs bg-slate-100">
                {inv.status}
              </span>
            </div>

            <div className="col-span-1 text-right font-semibold">
              ₹{Number(inv.total_amount).toFixed(2)}
            </div>

            <div className="col-span-1 text-right">
              <button
                onClick={() => openInvoiceModal(inv)}
                className="text-emerald-600 font-semibold hover:underline"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======================
          MODAL
      ====================== */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 relative">

            {/* CLOSE */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            {/* HEADER */}
            <h2 className="text-xl font-semibold mb-1">
              Invoice – {selectedInvoice.customer_name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(selectedInvoice.created_at).toLocaleDateString()} •{" "}
              {selectedInvoice.branch_location}
            </p>

            {/* ITEMS */}
            {itemsLoading ? (
              <p className="text-sm text-gray-500">Loading items…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">No items found</p>
            ) : (
              <table className="w-full text-sm border mb-4">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{item.item_name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-right">
                        ₹{Number(item.price).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹{(Number(item.quantity) * Number(item.price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TOTAL */}
            <div className="flex justify-end">
              <table className="text-sm">
                <tbody>
                  <tr className="font-semibold">
                    <td className="pr-6">Invoice Total</td>
                    <td className="text-right">
                      ₹{Number(selectedInvoice.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default CentralInvoices;
