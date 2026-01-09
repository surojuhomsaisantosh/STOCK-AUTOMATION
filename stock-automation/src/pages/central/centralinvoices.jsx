import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function CentralInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
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

    if (!error) {
      setInvoices(data || []);
    }

    setLoading(false);
  };

  const fetchInvoiceItems = async (invoiceId) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
      return;
    }

    const { data } = await supabase
      .from("invoice_items")
      .select(`
        id,
        item_name,
        quantity,
        unit,
        price
      `)
      .eq("invoice_id", invoiceId);

    setItems(data || []);
    setExpandedInvoice(invoiceId);
  };

  if (loading) {
    return <div className="p-10 text-center">Loading invoices...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* 🔙 BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">Central Invoices</h1>

      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((inv) => (
                <>
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{inv.customer_name}</div>
                      <div className="text-xs text-gray-500">
                        {inv.customer_phone} • {inv.customer_email}
                      </div>
                    </td>

                    <td className="p-3">{inv.branch_location}</td>

                    <td className="p-3 text-center">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-1 rounded-lg text-xs bg-slate-100">
                        {inv.status}
                      </span>
                    </td>

                    <td className="p-3 text-right font-semibold">
                      ₹{inv.total_amount.toFixed(2)}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => fetchInvoiceItems(inv.id)}
                        className="text-emerald-600 font-semibold"
                      >
                        {expandedInvoice === inv.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>

                  {/* 🔽 INVOICE ITEMS */}
                  {expandedInvoice === inv.id && (
                    <tr className="bg-gray-50">
                      <td colSpan="6" className="p-4">
                        {items.length === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No items found
                          </p>
                        ) : (
                          <table className="w-full text-xs bg-white rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left">Item</th>
                                <th className="p-2 text-center">Qty</th>
                                <th className="p-2 text-center">Unit</th>
                                <th className="p-2 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-2">{item.item_name}</td>
                                  <td className="p-2 text-center">
                                    {item.quantity}
                                  </td>
                                  <td className="p-2 text-center">
                                    {item.unit}
                                  </td>
                                  <td className="p-2 text-right">
                                    ₹{item.price}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CentralInvoices;
