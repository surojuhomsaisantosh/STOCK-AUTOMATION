import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiPackage,
  FiTruck, FiRefreshCw, FiX, FiRotateCcw, FiChevronRight
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [dateMode, setDateMode] = useState("date");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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
        (o.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase()));

      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      let dateMatch = true;

      if (dateMode === "date" && singleDate) dateMatch = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) dateMatch = orderDate >= startDate && orderDate <= endDate;

      return statusMatch && searchMatch && dateMatch;
    });
  }, [orders, activeTab, searchTerm, dateMode, singleDate, startDate, endDate]);

  const stats = useMemo(() => ({
    incoming: orders.filter(o => o.status === 'incoming').length,
    packed: orders.filter(o => o.status === 'packed').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
  }), [orders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleWhatsApp = (order) => {
    const cleanPhone = order.customer_phone?.replace(/\D/g, "");
    if (!cleanPhone) return alert("Missing phone number");
    const message = `ORDER STATUS: ${order.status?.toUpperCase()}%0AHello ${order.customer_name}, your order is being processed!`;
    window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-12 overflow-x-hidden font-sans">
      <nav className="sticky top-0 z-[60] bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:bg-slate-100 rounded-full transition-colors text-black">
          <FiArrowLeft size={22} />
        </button>
        <h1 className="text-base md:text-xl font-black uppercase tracking-tighter text-black">Manage Orders</h1>
        <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 text-slate-600">
          ID: {user?.franchise_id || "HQ"}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Orders", val: stats.incoming, color: "text-blue-600" },
            { label: "In Packing", val: stats.packed, color: "text-orange-500" },
            { label: "Dispatched", val: stats.dispatched, color: "text-emerald-700" },
            { label: "Today", val: todayDisplay, isDate: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">{stat.label}</p>
              <p className={`${stat.isDate ? 'text-xs' : 'text-2xl'} font-black ${stat.color || 'text-black'}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Filters Section */}
        <div className="bg-white border border-slate-200 p-4 rounded-[2rem] shadow-sm space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search Client or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5 transition-all text-black uppercase"
            />
          </div>

          {/* Corrected Tab Alignment */}
          <div className="flex w-full bg-slate-100 p-1 rounded-2xl gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-200 min-w-[65px]
                  ${activeTab === tab
                    ? 'bg-black text-white shadow-md'
                    : 'text-slate-500 hover:text-black hover:bg-white/50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-1 items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
              <FiCalendar className="text-slate-400" />
              <select className="bg-transparent text-[10px] font-black uppercase outline-none text-black" value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="date">Date</option>
                <option value="range">Range</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              {dateMode === "date" ? (
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0"
                />
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-[11px] font-bold outline-none flex-1 text-black min-w-0"
                  />
                </div>
              )}
            </div>
            <button onClick={resetFilters} className="p-4 bg-slate-100 text-slate-500 rounded-2xl active:bg-black active:text-white transition-all flex justify-center"><FiRotateCcw /></button>
          </div>
        </div>

        {/* Content Area */}
        {isMobile ? (
          <div className="grid grid-cols-1 gap-3 pb-20">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest">No matching orders</div>
            ) : filteredOrders.map(order => (
              <div
                key={order.id} onClick={() => setSelectedOrder(order)}
                className="bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.franchise_id || "TV-GEN"}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="font-black text-sm uppercase leading-none text-black">{order.customer_name}</h3>
                  <p className="text-[10px] font-bold text-slate-500">₹{order.total_amount} • {new Date(order.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-slate-300"><FiChevronRight size={20} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white uppercase text-[10px] font-black">
                  <th className="px-8 py-5 tracking-widest">#</th>
                  <th className="px-8 py-5 tracking-widest">Franchise</th>
                  <th className="px-8 py-5 tracking-widest">Customer</th>
                  <th className="px-8 py-5 tracking-widest">Status</th>
                  <th className="px-8 py-5 tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-xs">
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-8 py-6 text-slate-400">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6 uppercase font-black">{order.franchise_id}</td>
                    <td className="px-8 py-6 uppercase font-black">{order.customer_name}</td>
                    <td className="px-8 py-6 uppercase">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>{order.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-black">₹{order.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div id="printable-area" className={`bg-white w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden ${isMobile ? 'h-[94vh] rounded-t-[3rem]' : 'max-h-[85vh] rounded-[3rem] border-[6px] border-slate-100'}`}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">{selectedOrder.status}</span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">REF: {selectedOrder.id.substring(0, 8)}</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none text-black">{selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-4 bg-slate-100 rounded-2xl active:bg-black active:text-white transition-all text-black no-print"><FiX size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-[#F9FAFB]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FiUser /> Shipping Info</h4>
                  <div className="space-y-3 text-[11px] font-bold uppercase">
                    <div className="flex justify-between border-b pb-2 border-slate-50 text-black"><span>Phone</span><span>{selectedOrder.customer_phone}</span></div>
                    <div className="flex flex-col gap-1 text-black"><span>Address:</span><span className="text-slate-500 leading-relaxed font-black">{selectedOrder.customer_address}</span></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FiPackage /> Packing List</h4>
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase text-black">{selectedOrder.invoice_items?.length} SKU's</span>
                  </div>
                  <div className="space-y-3">
                    {selectedOrder.invoice_items?.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1 pr-4">
                          <p className="text-[11px] font-black uppercase truncate text-black">{item.item_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit}</p>
                        </div>
                        <span className="font-black text-xs tracking-tighter text-black">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Grand Total</span>
                    <span className="text-3xl font-black tracking-tighter text-black">₹{selectedOrder.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 md:p-8 bg-white border-t border-slate-100 z-20 flex flex-col md:flex-row gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] no-print ${isMobile ? 'pb-10' : ''}`}>
              <div className="flex-1 flex gap-2">
                <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-slate-200 transition-all">Print</button>
                <button onClick={() => handleWhatsApp(selectedOrder)} className="flex-1 py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-emerald-100 transition-all flex items-center justify-center gap-2"><FaWhatsapp size={16} /> WhatsApp</button>
              </div>
              <div className="flex-1 flex gap-2">
                {selectedOrder.status === 'incoming' && (
                  <button onClick={() => updateStatus(selectedOrder.id, "packed")} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Mark Packed</button>
                )}

                {selectedOrder.status === 'packed' && (
                  <>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "incoming")}
                      className="px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all"
                    >
                      <FiRotateCcw size={16} /> Undo
                    </button>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "dispatched")}
                      style={{ backgroundColor: BRAND_COLOR }}
                      className="flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                    >
                      <FiTruck size={16} /> Dispatch
                    </button>
                  </>
                )}

                {selectedOrder.status === 'dispatched' && (
                  <button
                    onClick={() => updateStatus(selectedOrder.id, "packed")}
                    className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-100 transition-all"
                  >
                    <FiRotateCcw size={16} /> Undo Dispatch
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            overflow: visible;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default StockOrders;