import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiMapPin, FiPackage,
  FiPrinter, FiTruck, FiRefreshCw, FiChevronDown, FiList, FiBox, FiX, FiRotateCcw
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const TABS = ["all", "incoming", "packed", "dispatched"];
const BRAND_COLOR = "rgb(0, 100, 55)";
const GST_RATE = 0.18; // 18% GST - Adjust if different

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
      console.log("DEBUG: Auth ready, fetching orders for user:", user.id);
      fetchOrders();
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log("DEBUG: Starting Supabase Fetch...");
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, invoice_items (*)`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      console.log("DEBUG: Orders Fetched Successfully:", data);
      setOrders(data || []);
    } catch (err) {
      console.error("DEBUG: Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const updateStatus = async (orderId, newStatus) => {
    console.log(`DEBUG: Updating Order ${orderId} to ${newStatus}`);
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
      console.log("DEBUG: Status update successful");
    } catch (err) {
      console.error("DEBUG: Update failed:", err.message);
      alert("Update failed: " + err.message);
    }
  };

  // Price Calculation Logic
  const calculatePricing = (items = []) => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
    const gstAmount = subtotal * GST_RATE;
    const grandTotal = subtotal + gstAmount;
    return { subtotal, gstAmount, grandTotal };
  };

  const handleWhatsApp = (order) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) return alert("Customer phone number is missing!");
    const message = `ORDER DISPATCHED%0A%0AHello ${order.customer_name},%0AYour order from T Vanamm is on the way!%0ATotal Amount: ₹${order.total_amount}`;
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">
      <nav className="border-b border-slate-200 px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
          <FiArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em]">Orders</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase">Franchise ID:</span>
          <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ-01"}
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[{ label: "Incoming", val: stats.incoming }, { label: "In Packing", val: stats.packed }, { label: "Dispatched", val: stats.dispatched, color: BRAND_COLOR }].map((stat, i) => (
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
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Session Date</p>
                <p className="text-xl font-black">{todayDisplay}</p>
             </div>
             <FiCalendar size={18} className="text-slate-300" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 p-4 rounded-[2rem] flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none w-64 uppercase" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-slate-500"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <button onClick={resetFilters} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-black hover:text-white transition-all"><FiRefreshCw size={18} /></button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                <th className="px-8 py-5 text-[10px] font-black uppercase">Company</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Franchise ID</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center text-xs font-black text-slate-300 uppercase animate-pulse">Syncing...</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => { console.log("DEBUG: Row clicked", order); setSelectedOrder(order); }} className="cursor-pointer hover:bg-slate-50 transition-all">
                  <td className="px-8 py-6 font-black text-xs uppercase">T Vanamm</td>
                  <td className="px-8 py-6 text-xs">{order.franchise_id || "TV-GEN"}</td>
                  <td className="px-8 py-6 text-xs font-black uppercase">{order.customer_name}</td>
                  <td className="px-8 py-6 text-[9px] font-black uppercase"><span className="px-2 py-1 bg-slate-100 rounded-md">{order.status}</span></td>
                  <td className="px-8 py-6 text-right font-black text-sm">₹{order.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-[6px] border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Order Details / {selectedOrder.id.substring(0,8)}</p>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"><FiX size={24} /></button>
            </div>

            <div className="overflow-y-auto p-8 bg-[#F8F9FA] flex-1">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Info */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 h-fit">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Contact Info</h4>
                   <div className="space-y-3">
                      <p className="text-xs font-bold">Phone: {selectedOrder.customer_phone}</p>
                      <p className="text-xs text-slate-500 uppercase leading-relaxed">{selectedOrder.customer_address}</p>
                   </div>
                </div>

                {/* Items & Prices */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Invoice Items</h4>
                    <div className="space-y-2">
                      {selectedOrder.invoice_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-xs font-black uppercase">{item.item_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{item.quantity} units @ ₹{item.price}</p>
                          </div>
                          <p className="font-black text-xs">₹{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t space-y-2">
                       {(() => {
                         const pricing = calculatePricing(selectedOrder.invoice_items);
                         return (
                           <>
                             <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                <span>Subtotal</span>
                                <span>₹{pricing.subtotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                                <span>GST (18%)</span>
                                <span>₹{pricing.gstAmount.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center pt-2">
                                <span className="font-black text-xs uppercase">Grand Total</span>
                                <span className="text-2xl font-black">₹{pricing.grandTotal.toFixed(2)}</span>
                             </div>
                           </>
                         )
                       })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-white border-t flex justify-between items-center">
              <div className="flex gap-3">
                {/* Print is now always visible for all stages */}
                <button onClick={() => { console.log("DEBUG: Opening Print Dialog"); window.print(); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-black hover:text-white transition-all">
                  <FiPrinter size={16} /> Print Invoice
                </button>
                {selectedOrder.status === "dispatched" && (
                  <button onClick={() => handleWhatsApp(selectedOrder)} className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                    <FaWhatsapp size={16} /> Send WhatsApp
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                {selectedOrder.status === "incoming" && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg">
                    <FiPackage size={16} /> Mark Packed
                  </button>
                )}
                {selectedOrder.status === "packed" && (
                  <>
                    <button onClick={() => updateStatus(selectedOrder.id, "incoming")} className="px-4 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] hover:text-red-500"><FiRotateCcw /></button>
                    <button onClick={() => updateStatus(selectedOrder.id, "dispatched")} style={{ backgroundColor: BRAND_COLOR }} className="text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg">
                      <FiTruck size={16} /> Dispatch Now
                    </button>
                  </>
                )}
                {selectedOrder.status === "dispatched" && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="px-4 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] hover:text-red-500 flex items-center gap-2">
                    <FiRotateCcw /> Undo Dispatch
                  </button>
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