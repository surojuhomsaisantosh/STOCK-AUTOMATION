import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

function InvoicesBilling() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDispatchedInvoices();
  }, []);

  /* FETCH ONLY DISPATCHED INVOICES */
  const fetchDispatchedInvoices = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        total_amount,
        created_at,
        customer_name,
        customer_address,
        branch_location,
        customer_phone,
        customer_email,
        invoice_items (
          id,
          item_name,
          quantity,
          unit,
          price
        )
      `)
      .eq("status", "dispatched")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Invoice fetch error:", error);
    } else {
      setInvoices(data || []);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl border bg-white text-slate-600 font-semibold hover:bg-slate-100 transition"
          >
            ← Back
          </button>

          <div>
            <h2 className="text-2xl font-black">Dispatched Invoices</h2>
            <p className="text-slate-500 text-sm">
              Billing records for dispatched stock
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading && <p className="text-slate-400">Loading invoices...</p>}

        {/* EMPTY */}
        {!loading && invoices.length === 0 && (
          <p className="text-slate-400">No dispatched invoices found</p>
        )}

        {/* INVOICE LIST */}
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-2xl border shadow-sm"
            >
              {/* SUMMARY */}
              <div
                className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
                onClick={() =>
                  setExpandedInvoice(
                    expandedInvoice === invoice.id ? null : invoice.id
                  )
                }
              >
                <div>
                  <p className="font-bold text-lg">
                    {invoice.customer_name || "Unknown Franchise"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {invoice.branch_location ||
                      invoice.customer_address ||
                      "Address not available"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(invoice.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-emerald-600">
                    ₹{invoice.total_amount}
                  </p>
                  <span className="text-xs font-semibold text-emerald-700">
                    DISPATCHED
                  </span>
                </div>
              </div>

              {/* DETAILS */}
              {expandedInvoice === invoice.id && (
                <div className="border-t bg-slate-50 p-5 space-y-4">

                  {/* CUSTOMER DETAILS */}
                  <div className="text-sm space-y-1">
                    <p><strong>Address:</strong> {invoice.customer_address || "N/A"}</p>
                    <p><strong>Phone:</strong> {invoice.customer_phone || "N/A"}</p>
                    <p><strong>Email:</strong> {invoice.customer_email || "N/A"}</p>
                  </div>

                  {/* ITEMS */}
                  <div className="border-t pt-3 space-y-2">
                    {invoice.invoice_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.item_name} — {item.quantity} {item.unit}
                        </span>
                        <span className="font-semibold">
                          ₹{(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* TOTAL */}
                  <div className="border-t pt-3 flex justify-between font-black">
                    <span>Total Amount</span>
                    <span>₹{invoice.total_amount}</span>
                  </div>

                  {/* ACTION */}
                  <div className="pt-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl border font-semibold hover:bg-slate-100 transition"
                    >
                      🖨 Print Invoice
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default InvoicesBilling;
