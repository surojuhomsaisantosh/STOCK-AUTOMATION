import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function FranchiseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, total_amount, created_at, customer_name")
      .order("created_at", { ascending: false });

    setInvoices(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-10 text-center">Loading invoices...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">

      {/* 🔙 BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 rounded-xl border bg-white hover:bg-slate-100"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-black mb-6">Invoices</h1>

      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-3">{inv.customer_name}</td>
                  <td className="p-3 text-center">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    ₹{inv.total_amount.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() =>
                        navigate(`/franchise/invoices/${inv.id}`)
                      }
                      className="text-emerald-600 font-bold"
                    >
                      View →
                    </button>
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

export default FranchiseInvoices;
