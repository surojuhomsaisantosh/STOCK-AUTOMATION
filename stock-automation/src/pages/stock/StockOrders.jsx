import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiMapPin, FiPackage,
  FiPrinter, FiTruck, FiRefreshCw, FiChevronDown, FiList, FiBox, FiX, FiRotateCcw, FiChevronRight, FiClock
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const TABS = ["all", "incoming", "packed", "dispatched"];
const BRAND_COLOR = "rgb(0, 100, 55)";

function StockOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [dateMode, setDateMode] = useState("date");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    if (!authLoading && user) fetchOrders();
    return () => window.removeEventListener('resize', handleResize);
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
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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
    const message = `${line1}%0A%0A${line2}%0A${line3}%0A${line4}`;
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">
      {/* Navbar */}
      <nav className={`border-b border-slate-200 bg-white sticky top-0 z-50 flex items-center justify-between ${isMobile ? 'px-4 py-4' : 'px-8 py-5'}`}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black">
          <FiArrowLeft size={18} /> {isMobile ? "" : "Back"}
        </button>
        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black uppercase tracking-widest text-black`}>Orders</h1>
        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise:</span>}
          <span className="text-[10px] md:text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ"}
          </span>
        </div>
      </nav>

      <div className={`max-w-7xl mx-auto space-y-6 ${isMobile ? 'px-4 mt-4' : 'px-6 mt-8'}`}>

        {/* Stats Grid */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {[
            { label: "Incoming", val: stats.incoming, color: "black" },
            { label: "Packed", val: stats.packed, color: "black" },
            { label: "Dispatched", val: stats.dispatched, color: BRAND_COLOR },
            { label: "Today", val: todayDisplay, color: "black", isDate: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex justify-between items-end">
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <p className={`${stat.isDate ? 'text-xs md:text-xl' : 'text-2xl md:text-3xl'} font-black tracking-tighter`} style={{ color: stat.color }}>{stat.val}</p>
              </div>
              {!isMobile && <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><FiPackage size={18} /></div>}
            </div>
          ))}
        </div>

        {/* Filters Row */}
        <div className={`bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex flex-col lg:flex-row p-4 gap-4 items-stretch lg:items-center justify-between`}>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none w-full md:w-48 uppercase" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-slate-500"}`}>{tab}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <select className="bg-transparent text-[10px] font-black uppercase outline-none" value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="date">Day</option>
                <option value="range">Range</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-200"></div>
              <input type="date" value={dateMode === "date" ? singleDate : startDate} onChange={(e) => dateMode === "date" ? setSingleDate(e.target.value) : setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none flex-1" />
            </div>
            <button onClick={resetFilters} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-black hover:text-white"><FiRefreshCw size={18} /></button>
          </div>
        </div>

        {/* Main List/Table Container */}
        <div className={`${isMobile ? '' : 'bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden'}`}>
          {isMobile ? (
            /* Mobile Card View */
            <div className="space-y-3">
              {loading ? (
                <div className="py-20 text-center font-black uppercase text-[10px] text-slate-300 animate-pulse">Syncing...</div>
              ) : filteredOrders.map((order) => (
                <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">#{order.id.substring(0, 6)}</span>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>{order.status}</span>
                  </div>
                  <h3 className="font-black text-sm uppercase mb-1">{order.customer_name || "N/A"}</h3>
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-bold text-slate-400"><FiClock className="inline mr-1" />{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg">₹{order.total_amount}</span>
                      <FiChevronRight className="text-slate-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table View - Unchanged */
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">#</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Franchise ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Customer Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="5" className="py-32 text-center font-black uppercase text-xs text-slate-300 animate-pulse">Syncing...</td></tr>
                  ) : filteredOrders.map((order, idx) => (
                    <tr key={order.id} onClick={() => setSelectedOrder(order)} className="group cursor-pointer transition-all hover:bg-slate-50">
                      <td className="px-8 py-6 font-black text-xs">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="px-8 py-6 font-black text-[10px] uppercase text-slate-500">{order.franchise_id || "TV-GEN"}</td>
                      <td className="px-8 py-6 font-black text-xs uppercase text-black">{order.customer_name || "N/A"}</td>
                      <td className="px-8 py-6"><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>{order.status}</span></td>
                      <td className="px-8 py-6 text-right font-black text-sm">₹{order.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Optimized for Full Screen on Mobile */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className={`bg-white shadow-2xl flex flex-col border-slate-100 ${isMobile ? 'w-full h-full' : 'w-full max-w-5xl rounded-[3rem] max-h-[90vh] border-[6px]'}`}>
            {/* Modal Header */}
            <div className={`border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 ${isMobile ? 'p-5 h-20' : 'p-8'}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID: {selectedOrder.id.substring(0, 8)}</span>
                <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-black uppercase tracking-tighter`}>{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><FiX size={20} /></button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-5 md:p-8 bg-[#F8F9FA] flex-1">
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><FiUser /> Info</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400">PHONE</span><span className="text-xs font-black">{selectedOrder.customer_phone}</span></div>
                      <div><span className="text-[9px] font-black text-slate-400 block mb-1">ADDRESS</span><span className="text-[10px] font-black uppercase leading-relaxed">{selectedOrder.customer_address}</span></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><FiPackage /> Items</h4>
                    <div className="space-y-2">
                      {selectedOrder.invoice_items?.map((item) => (
                        <div key={item.id} className="p-3 rounded-xl bg-slate-50 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black uppercase">{item.item_name}</p>
                            <p className="text-[9px] font-bold text-slate-400">{item.quantity} {item.unit}</p>
                          </div>
                          <span className="font-black text-xs">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-5 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-400 uppercase">Total Bill</span>
                      <span className="font-black text-2xl tracking-tighter">₹{selectedOrder.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`bg-white border-t border-slate-200 sticky bottom-0 p-5 md:p-6 ${isMobile ? 'pb-8' : ''}`}>
              <div className={`flex flex-col md:flex-row justify-between gap-4`}>
                <div className="flex gap-2">
                  {selectedOrder.status === "dispatched" && (
                    <>
                      <button onClick={() => window.print()} className="flex-1 md:flex-none px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"><FiPrinter size={14} /> Print</button>
                      <button onClick={() => handleWhatsApp(selectedOrder)} className="flex-1 md:flex-none px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"><FaWhatsapp size={14} /> WA</button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedOrder.status === "incoming" && <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Mark Packed</button>}
                  {selectedOrder.status === "packed" && <button onClick={() => updateStatus(selectedOrder.id, "dispatched")} style={{ backgroundColor: BRAND_COLOR }} className="w-full md:w-auto text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Dispatch Order</button>}
                  {(selectedOrder.status === "packed" || selectedOrder.status === "dispatched") &&
                    <button onClick={() => updateStatus(selectedOrder.id, selectedOrder.status === "packed" ? "incoming" : "packed")} className="w-full md:w-auto border-2 border-slate-200 text-slate-400 px-6 py-4 rounded-xl font-black text-[10px] uppercase">Undo</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrders;