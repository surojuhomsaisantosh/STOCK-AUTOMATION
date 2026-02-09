import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiPackage,
  FiPrinter, FiTruck, FiRefreshCw, FiX
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const TABS = ["all", "incoming", "packed", "dispatched"];
const BRAND_COLOR = "rgb(0, 100, 55)";

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

// robust calculator that handles missing data gracefully
const calculateOrderTotals = (items = []) => {
  let subtotal = 0;
  let totalTax = 0;

  if (!items || !Array.isArray(items)) {
    return { subtotal: 0, tax: 0, grandTotal: 0 };
  }

  items.forEach((item) => {
    // Force convert to numbers to avoid string concatenation errors
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;

    // Looks for 'gst_rate', 'tax_rate', 'gst', or 'tax' in your DB columns
    // Defaults to 0 if not found. Change 0 to 18 if you want a hardcoded default.
    const taxRate = parseFloat(item.gst_rate || item.tax_rate || item.gst || 0);

    const itemTotal = qty * price;
    const itemTax = itemTotal * (taxRate / 100);

    subtotal += itemTotal;
    totalTax += itemTax;
  });

  return {
    subtotal: subtotal,
    tax: totalTax,
    grandTotal: subtotal + totalTax
  };
};

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [dateMode, setDateMode] = useState("date");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log("DEBUG: Fetching orders...");
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (
            *
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("DEBUG: Data received:", data);

      // DEBUG: Log the first item to check column names for debugging
      if (data && data.length > 0 && data[0].invoice_items?.length > 0) {
        console.log("DEBUG: Item Column Check:", data[0].invoice_items[0]);
      }

      setOrders(data || []);
    } catch (err) {
      console.error("DEBUG: Error fetching orders:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  // ------------------------------------------------------------------
  // FILTERS
  // ------------------------------------------------------------------
  const resetFilters = () => {
    setSearchTerm("");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setActiveTab("all");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const statusMatch = activeTab === "all" || o.status?.toLowerCase() === activeTab;
      const searchMatch = (o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customer_phone?.includes(searchTerm)) ||
        (o.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase()));

      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      let dateMatch = true;

      if (dateMode === "date" && singleDate) {
        dateMatch = orderDate === singleDate;
      } else if (dateMode === "range" && startDate && endDate) {
        dateMatch = orderDate >= startDate && orderDate <= endDate;
      }
      return statusMatch && searchMatch && dateMatch;
    });
  }, [orders, activeTab, searchTerm, dateMode, singleDate, startDate, endDate]);

  const stats = useMemo(() => ({
    incoming: orders.filter(o => o.status === 'incoming').length,
    packed: orders.filter(o => o.status === 'packed').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
  }), [orders]);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = (order) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) return alert("Customer phone number is missing!");

    const { grandTotal } = calculateOrderTotals(order.invoice_items);

    const message = `ORDER DISPATCHED%0A%0AHello ${order.customer_name},%0AYour order from T Vanamm is on the way!%0ATotal Amount: ₹${grandTotal.toFixed(2)}`;
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">

      {/* --- TOP NAVBAR --- */}
      <nav className="border-b border-slate-200 px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
          <FiArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em]">Stock Orders</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase">Franchise ID:</span>
          <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ"}
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 print:hidden">
        {/* --- STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Incoming", val: stats.incoming },
            { label: "In Packing", val: stats.packed },
            { label: "Dispatched", val: stats.dispatched, color: BRAND_COLOR }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-black" style={{ color: stat.color || "black" }}>{stat.val}</p>
              </div>
              <FiPackage size={18} className="text-slate-300" />
            </div>
          ))}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Date</p>
              <p className="text-xl font-black">{todayDisplay}</p>
            </div>
            <FiCalendar size={18} className="text-slate-300" />
          </div>
        </div>

        {/* --- FILTERS --- */}
        <div className="bg-white border border-slate-200 p-4 rounded-[2rem] flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search Client/ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none w-64 uppercase" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-slate-500"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <button onClick={resetFilters} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-black hover:text-white transition-all"><FiRefreshCw size={18} /></button>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                <th className="px-8 py-5 text-[10px] font-black uppercase">#</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Franchise ID</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-right">Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center text-xs font-black text-slate-300 uppercase animate-pulse">Loading Orders...</td></tr>
              ) : filteredOrders.map((order, idx) => {
                // Calculate total LIVE from items instead of trusting 'total_amount' column
                const { grandTotal } = calculateOrderTotals(order.invoice_items);

                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer hover:bg-slate-50 transition-all">
                    <td className="px-8 py-6 font-black text-xs text-slate-400">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6 text-xs font-bold">{order.franchise_id || "N/A"}</td>
                    <td className="px-8 py-6 text-xs font-black uppercase">{order.customer_name}</td>
                    <td className="px-8 py-6"><span className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-black uppercase">{order.status}</span></td>
                    <td className="px-8 py-6 text-right font-black text-sm">₹{grandTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL / PRINT VIEW --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-[6px] border-slate-100 print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:w-full print:h-full">

            {/* Modal Header (Hidden on Print) */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Order Details</p>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"><FiX size={24} /></button>
            </div>

            {/* SCROLLABLE CONTENT (PRINT AREA) */}
            <div className="overflow-y-auto p-8 bg-[#F8F9FA] flex-1 print:bg-white print:overflow-visible">

              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block mb-8 border-b pb-4">
                <h1 className="text-4xl font-black uppercase mb-2">Invoice</h1>
                <p className="text-sm">T Vanamm Headquarters</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8 print:grid-cols-2">
                {/* Info */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 h-fit print:border-0 print:p-0">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 print:text-black">Bill To:</h4>
                  <div className="space-y-3">
                    <p className="text-lg font-black uppercase">{selectedOrder.customer_name}</p>
                    <p className="text-xs font-bold">Phone: {selectedOrder.customer_phone}</p>
                    <p className="text-xs text-slate-500 uppercase leading-relaxed print:text-black">{selectedOrder.customer_address}</p>
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase">Franchise ID</p>
                      <p className="font-black">{selectedOrder.franchise_id}</p>
                    </div>
                  </div>
                </div>

                {/* Items & Prices */}
                <div className="lg:col-span-2 space-y-4 print:col-span-2">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 print:border py-4 print:shadow-none">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Item Details</h4>

                    {/* Item List */}
                    <div className="space-y-2">
                      {selectedOrder.invoice_items?.map((item, index) => {
                        const iQty = parseFloat(item.quantity) || 0;
                        const iPrice = parseFloat(item.price) || 0;
                        const iTaxRate = parseFloat(item.gst_rate || item.tax_rate || 0);

                        return (
                          <div key={index} className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl print:bg-white print:border-b print:rounded-none">
                            <div className="col-span-2">
                              <p className="text-xs font-black uppercase">{item.item_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{iQty} {item.unit} x ₹{iPrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold">Tax ({iTaxRate}%)</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-xs">₹{(iQty * iPrice).toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals Section */}
                    <div className="mt-6 pt-6 border-t border-slate-200 space-y-2">
                      {(() => {
                        const totals = calculateOrderTotals(selectedOrder.invoice_items);
                        return (
                          <>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                              <span>Subtotal</span>
                              <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                              <span>Total Tax (GST)</span>
                              <span>₹{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-2">
                              <span className="font-black text-lg uppercase">Grand Total</span>
                              <span className="text-3xl font-black">₹{totals.grandTotal.toFixed(2)}</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Actions) - Hidden on Print */}
            <div className="p-6 bg-white border-t flex justify-between items-center print:hidden">
              <div className="flex gap-3">
                <button onClick={handlePrint} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-black hover:text-white transition-all">
                  <FiPrinter size={16} /> Print
                </button>
                <button onClick={() => handleWhatsApp(selectedOrder)} className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                  <FaWhatsapp size={16} /> WhatsApp
                </button>
              </div>

              <div className="flex gap-3">
                {selectedOrder.status === "incoming" && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-slate-800">
                    <FiPackage size={16} /> Mark Packed
                  </button>
                )}
                {selectedOrder.status === "packed" && (
                  <button onClick={() => updateStatus(selectedOrder.id, "dispatched")} style={{ backgroundColor: BRAND_COLOR }} className="text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:opacity-90">
                    <FiTruck size={16} /> Dispatch
                  </button>
                )}
                {selectedOrder.status === "dispatched" && (
                  <span className="text-emerald-600 font-black text-xs uppercase flex items-center gap-2"><FiTruck /> Dispatched</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrders;