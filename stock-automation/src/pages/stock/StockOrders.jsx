import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TABS = ["incoming", "packed", "dispatched"];

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [dispatchProof, setDispatchProof] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");

  // 1. Monitor Auth Changes and trigger fetch
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
    }
  }, [user, authLoading]);

  /* ✅ FETCH ORDERS */
  const fetchOrders = async () => {
    setLoading(true);
    try {
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

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("❌ Fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  /* ✅ MEMOIZED FILTER */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => order.status === activeTab);
  }, [orders, activeTab]);

  /* ✅ UPDATE STATUS (PACKED / DISPATCHED) */
  const updateStatus = async (orderId, newStatus) => {
    try {
      // Small UI optimization: keep the order expanded while updating
      console.log(`🔄 Updating Order ${orderId} to: ${newStatus}`);
      
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Refresh data so the order moves to the next tab
      await fetchOrders();
      
      // Close the expanded view after successful update
      setExpandedOrder(null);
    } catch (error) {
      console.error("❌ Update failed:", error.message);
      alert("Failed to update status. Check your permissions (RLS).");
    }
  };

  const handlePhotoUpload = (orderId, file) => {
    if (!file) return;
    setDispatchProof((prev) => ({
      ...prev,
      [orderId]: URL.createObjectURL(file),
    }));
  };

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
              <div className="flex items-center gap-2">
                 <span className={`h-2 w-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></span>
                 <p className="text-slate-500 text-sm">
                   {authLoading ? "Verifying Session..." : `Role: ${user?.role || 'Authenticated'}`}
                 </p>
              </div>
            </div>
          </div>

          {/* STATUS TABS */}
          <div className="flex bg-white border rounded-xl p-1 shadow-sm">
            {TABS.map((tab) => {
              const count = orders.filter(o => o.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition ${
                    activeTab === tab
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab} <span className="ml-1 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LOADING STATE */}
        {(loading || authLoading) && (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-emerald-600 rounded-full mb-4"></div>
            <p className="font-medium">Refreshing orders...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !authLoading && filteredOrders.length === 0 && (
          <div className="bg-white border-2 border-dashed rounded-2xl p-20 text-center">
            <p className="text-slate-400 font-medium">No {activeTab} orders found.</p>
            <p className="text-xs text-slate-300 mt-2">Check other tabs for active orders.</p>
          </div>
        )}

        {/* ORDERS LIST */}
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                expandedOrder === order.id ? "ring-2 ring-emerald-500/20" : ""
              }`}
            >
              {/* SUMMARY CARD */}
              <div
                className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="space-y-1">
                  <p className="font-bold text-lg text-slate-800">{order.customer_name || "New Order"}</p>
                  <p className="text-xs text-slate-500 font-medium italic">
                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-lg">₹{order.total_amount}</p>
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-2 py-1 bg-slate-50 rounded mt-1">
                    {order.status}
                  </p>
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {expandedOrder === order.id && (
                <div className="bg-slate-50 border-t p-6 animate-in slide-in-from-top-1 duration-200">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Order Items</h4>
                    <div className="space-y-2">
                      {order.invoice_items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="font-medium text-slate-700">{item.item_name} <span className="text-slate-400 font-normal">x {item.quantity} {item.unit}</span></span>
                          <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap gap-3">
                    {order.status === "incoming" && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(order.id, "packed");
                        }}
                        className="bg-amber-500 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition shadow-lg shadow-amber-200"
                      >
                        📦 Mark as Packed
                      </button>
                    )}
                    
                    {order.status === "packed" && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(order.id, "dispatched");
                        }}
                        className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                      >
                        🚚 Dispatch Order
                      </button>
                    )}

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.print();
                      }} 
                      className="border bg-white text-slate-600 px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition"
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

export default StockOrders;