import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

const TABS = ["incoming", "packed", "dispatched"];

function StockOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [dispatchProof, setDispatchProof] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ✅ FETCH ORDERS (USE INVOICE SNAPSHOT DATA) */
  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        total_amount,
        created_at,
        status,
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  /* UPDATE STATUS */
  const updateStatus = async (orderId, status) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      alert("Failed to update status");
      console.error(error);
      return;
    }

    fetchOrders();
  };

  /* HANDLE DISPATCH PHOTO (LOCAL PREVIEW ONLY) */
  const handlePhotoUpload = (orderId, file) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setDispatchProof((prev) => ({
      ...prev,
      [orderId]: previewUrl,
    }));
  };

  /* FILTER BY STATUS */
  const filteredOrders = orders.filter(
    (order) => order.status === activeTab
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl border bg-white text-slate-600 font-semibold hover:bg-slate-100 transition"
            >
              ← Back
            </button>

            <div>
              <h2 className="text-2xl font-black">Franchise Orders</h2>
              <p className="text-slate-500 text-sm">
                Orders placed by franchise owners
              </p>
            </div>
          </div>

          {/* STATUS TABS */}
          <div className="flex bg-white border rounded-xl p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition ${
                  activeTab === tab
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING */}
        {loading && <p className="text-slate-400">Loading orders...</p>}

        {/* EMPTY */}
        {!loading && filteredOrders.length === 0 && (
          <p className="text-slate-400">No orders in this stage</p>
        )}

        {/* ORDERS */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm border"
            >
              {/* SUMMARY */}
              <div
                className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
                onClick={() =>
                  setExpandedOrder(
                    expandedOrder === order.id ? null : order.id
                  )
                }
              >
                <div className="space-y-1">
                  <p className="font-bold text-lg text-slate-800">
                    {order.customer_name || "Unknown Franchise"}
                  </p>

                  <p className="text-xs text-slate-600">
                    {order.branch_location ||
                      order.customer_address ||
                      "Address not available"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-emerald-600">
                    ₹{order.total_amount}
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* DETAILS */}
              {expandedOrder === order.id && (
                <div className="border-t bg-slate-50 p-5 space-y-4">
                  {order.invoice_items.map((item) => (
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

                  <div className="border-t pt-3 flex justify-between font-black">
                    <span>Total</span>
                    <span>₹{order.total_amount}</span>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-3 pt-3 flex-wrap">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl border font-semibold hover:bg-slate-100 transition"
                    >
                      🖨 Print
                    </button>

                    {order.status === "incoming" && (
                      <button
                        onClick={() => updateStatus(order.id, "packed")}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition"
                      >
                        📦 Mark Packed
                      </button>
                    )}

                    {order.status === "packed" && (
                      <button
                        onClick={() => updateStatus(order.id, "dispatched")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                      >
                        🚚 Dispatch
                      </button>
                    )}
                  </div>

                  {/* DISPATCH PROOF */}
                  {order.status === "dispatched" && (
                    <div className="pt-3 space-y-2">
                      <label className="text-sm font-semibold text-slate-600">
                        Dispatch Proof (optional)
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handlePhotoUpload(order.id, e.target.files[0])
                        }
                        className="block text-sm"
                      />

                      {dispatchProof[order.id] && (
                        <img
                          src={dispatchProof[order.id]}
                          alt="Dispatch proof"
                          className="h-32 rounded-xl border object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* CONTACT */}
                  <div className="text-xs text-slate-500 pt-2">
                    📞 {order.customer_phone || "N/A"} | ✉️{" "}
                    {order.customer_email || "N/A"}
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

export default StockOrders;
