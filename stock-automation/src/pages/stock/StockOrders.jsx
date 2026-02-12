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

const DISPATCH_TASKS = [
  { id: "whatsapp", label: "Sent dispatched message on WhatsApp" },
  { id: "proof", label: "Sent proof of dispatching" }
];

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); // Changed from expandedOrder to selectedOrder (Modal)
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderChecklists, setOrderChecklists] = useState({});

  const [dateMode, setDateMode] = useState("date");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  useEffect(() => {
    if (!authLoading && user) fetchOrders();
  }, [user, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, invoice_items (*)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderTask = (orderId, taskId) => {
    setOrderChecklists(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [taskId]: !prev[orderId]?.[taskId]
      }
    }));
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

  const stats = useMemo(() => {
    return {
      incoming: orders.filter(o => o.status === 'incoming').length,
      packed: orders.filter(o => o.status === 'packed').length,
      dispatched: orders.filter(o => o.status === 'dispatched').length,
    };
  }, [orders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;

      // Init checklist for dispatched
      if (newStatus === 'dispatched') {
        setOrderChecklists(prev => ({ ...prev, [orderId]: {} }));
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      // Update the selected order as well if it's open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const handleWhatsApp = (order) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) return alert("Customer phone number is missing!");

    const line1 = "ORDER DISPATCHED";
    const line2 = `Hello ${order.customer_name},`;
    const line3 = `Franchise ID : ${order.franchise_id || 'N/A'}`;
    const line4 = "Your order from T Vanamm is on the way!";
    const line5 = "Thank you for your business!";

    const message = `${line1}%0A%0A${line2}%0A${line3}%0A${line4}%0A%0A${line5}`;
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">
      <nav className="border-b border-slate-200 px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
          <FiArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black">Orders</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>
          <span className="text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ-01"}
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Incoming", val: stats.incoming, color: "black" },
            { label: "In Packing", val: stats.packed, color: "black" },
            { label: "Dispatched", val: stats.dispatched, color: BRAND_COLOR }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-black tracking-tighter" style={{ color: stat.color }}>{stat.val}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><FiPackage size={18} /></div>
            </div>
          ))}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Session Date</p>
              <p className="text-xl font-black tracking-tighter text-black">{todayDisplay}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><FiCalendar size={18} /></div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white border border-slate-200 p-4 rounded-[2rem] shadow-sm flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search Client or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-black/5 w-64 uppercase transition-all text-black" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100">
              <FiCalendar className="text-slate-400" size={14} />
              <select className="bg-transparent text-[10px] font-black uppercase outline-none text-black" value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="date">Single</option>
                <option value="range">Range</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
              {dateMode === "date" ? (
                <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-black" />
              ) : (
                <div className="flex items-center gap-2 text-black font-bold">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs outline-none" />
                  <span className="text-[10px] opacity-30">TO</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs outline-none" />
                </div>
              )}
            </div>
            <button onClick={resetFilters} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-black hover:text-white transition-all"><FiRefreshCw size={18} /></button>
          </div>
        </div>

        {/* MAIN TABLE */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: BRAND_COLOR }} className="border-b border-white/10">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white">#</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white">Company</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white">Franchise ID</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white">Customer Name</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="py-32 text-center font-black uppercase text-xs tracking-[0.3em] text-slate-300 animate-pulse">Syncing...</td></tr>
                ) : filteredOrders.map((order, idx) => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="group cursor-pointer transition-all duration-200 hover:bg-slate-50/80">
                    <td className="px-8 py-6 font-black text-xs text-black">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-[10px]">TV</div><span className="font-black text-xs uppercase text-black">T Vanamm</span></div></td>
                    <td className="px-8 py-6"><span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-black uppercase">{order.franchise_id || "TV-GEN"}</span></td>
                    <td className="px-8 py-6 font-black text-xs uppercase tracking-tighter text-black">{order.customer_name || "N/A"}</td>
                    <td className="px-8 py-6"><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{order.status || 'pending'}</span></td>
                    <td className="px-8 py-6 text-right"><div className="flex items-center justify-end gap-4"><span className="font-black text-sm text-black">₹{order.total_amount}</span><FiChevronDown className="text-slate-400" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-[6px] border-slate-100">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-100 p-8 flex justify-between items-center sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${selectedOrder.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-black text-white border-black'}`}>
                    {selectedOrder.status}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    REF: {selectedOrder.id.substring(0, 8)}
                  </span>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-black">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all shadow-sm">
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto p-8 bg-[#F8F9FA] flex-1 printable-area">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* COL 1: DETAILS */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><FiUser /> Details</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Franchise ID</span>
                        <span className="text-[11px] font-black text-black uppercase">{selectedOrder.franchise_id || "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Phone</span>
                        <span className="text-[11px] font-black text-black">{selectedOrder.customer_phone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Address</span>
                        <span className="text-[11px] font-black text-black uppercase leading-relaxed">{selectedOrder.customer_address || "Address not provided"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COL 2: ITEMS */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><FiPackage /> Order Items</h4>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-lg text-black">{selectedOrder.invoice_items?.length || 0} ITEMS</span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedOrder.invoice_items?.map((item) => (
                        <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                          <div>
                            <p className="text-[11px] font-black uppercase text-black">{item.item_name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit}</p>
                          </div>
                          <span className="font-black text-xs text-black">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t-2 border-slate-100 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-400 uppercase tracking-widest">Total Amount</span>
                      <span className="font-black text-2xl text-black tracking-tight">₹{selectedOrder.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Actions) - Fixed */}
            <div className="bg-white border-t border-slate-200 p-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="flex flex-wrap justify-between items-center gap-4">

                {/* LEFT ACTIONS - PRINT/WHATSAPP */}
                <div className="flex items-center gap-3">
                  {selectedOrder.status === "dispatched" && (
                    <>
                      <button onClick={() => window.print()} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2">
                        <FiPrinter size={16} /> Print
                      </button>
                      <button onClick={() => handleWhatsApp(selectedOrder)} className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2">
                        <FaWhatsapp size={16} /> WhatsApp
                      </button>
                    </>
                  )}
                </div>

                {/* RIGHT ACTIONS - UNDO & PROGRESS */}
                <div className="flex items-center gap-3 ml-auto">
                  {/* UNDO BUTTONS */}
                  {selectedOrder.status === "packed" && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to undo packing? Status will revert to Incoming.")) {
                          updateStatus(selectedOrder.id, "incoming");
                        }
                      }}
                      className="px-6 py-3 border-2 border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <FiRotateCcw size={14} /> Undo Pack
                    </button>
                  )}

                  {selectedOrder.status === "dispatched" && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to undo dispatch? Status will revert to Packed.")) {
                          updateStatus(selectedOrder.id, "packed");
                        }
                      }}
                      className="px-6 py-3 border-2 border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <FiRotateCcw size={14} /> Undo Dispatch
                    </button>
                  )}

                  {/* PROGRESS BUTTONS */}
                  {selectedOrder.status === "incoming" && (
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "packed")}
                      className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl"
                    >
                      <FiPackage size={16} /> Mark Packed
                    </button>
                  )}

                  {selectedOrder.status === "packed" && (
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "dispatched")}
                      style={{ backgroundColor: BRAND_COLOR }}
                      className="text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <FiTruck size={16} /> Dispatch Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}</style>
    </div>
  );
}

export default StockOrders;