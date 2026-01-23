import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiMapPin, FiPackage,
  FiPrinter, FiTruck, FiRefreshCw, FiChevronDown, FiChevronUp, FiList, FiBox
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import BottomNav from "../../components/BottomNav";

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
  const [expandedOrder, setExpandedOrder] = useState(null);
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
        .select(`*, invoice_items (*, stocks:stock_id (*))`)
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
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const handleUndo = (order, e) => {
    e.stopPropagation();
    let newStatus = "";
    if (order.status === "packed") newStatus = "incoming";
    if (order.status === "dispatched") newStatus = "packed";

    if (newStatus && confirm(`Undo status to ${newStatus.toUpperCase()}?`)) {
      updateStatus(order.id, newStatus);
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
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-32 md:pb-20">
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

        {/* MAIN TABLE (Desktop) */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
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
                  <React.Fragment key={order.id}>
                    <tr onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} className={`group cursor-pointer transition-all duration-200 ${expandedOrder === order.id ? 'bg-slate-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-8 py-6 font-black text-xs text-black border-l-4" style={{ borderLeftColor: expandedOrder === order.id ? BRAND_COLOR : 'transparent' }}>{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-[10px]">TV</div><span className="font-black text-xs uppercase text-black">T Vanamm</span></div></td>
                      <td className="px-8 py-6"><span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-black uppercase">{order.franchise_id || "TV-GEN"}</span></td>
                      <td className="px-8 py-6 font-black text-xs uppercase tracking-tighter text-black">{order.customer_name || "N/A"}</td>
                      <td className="px-8 py-6"><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{order.status || 'pending'}</span></td>
                      <td className="px-8 py-6 text-right"><div className="flex items-center justify-end gap-4"><span className="font-black text-sm text-black">₹{order.total_amount}</span>{expandedOrder === order.id ? <FiChevronUp className="text-black" /> : <FiChevronDown className="text-slate-400" />}</div></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* MOBILE CARDS (Mobile) */}
        <div className="md:hidden space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} onClick={() => setExpandedOrder(order.id)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</span>
                  <p className="text-lg font-black text-black">#{order.id.toString().slice(-6)}</p>
                </div>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${order.status === 'dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{order.status || 'pending'}</span>
              </div>
              <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-xs font-black text-black uppercase mt-1">{order.invoice_items?.length || 0} Items</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-black">₹{order.total_amount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />

      {/* ORDER DETAILS MODAL */}
      {
        expandedOrder && (() => {
          const order = orders.find(o => o.id === expandedOrder);
          if (!order) return null;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div id="printable-area" className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-fade-in relative">
                <div className="hidden print:block p-8 font-mono text-xs text-center border-b border-black">
                  Printed On: {new Date().toLocaleString()}
                </div>
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID //</span>
                      <span className="text-lg font-black uppercase text-black">#{order.id.toString().slice(-6)}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setExpandedOrder(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><FiArrowLeft size={20} className="text-black" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-[#F8F9FA]">
                  <div className="grid lg:grid-cols-3 gap-8">

                    {/* Column 1: Customer Profile & Highlighted Location */}
                    <div className="space-y-6">
                      <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><FiUser /> Customer</h4>
                        <div className="space-y-3">
                          <div><p className="text-xl font-black uppercase text-black leading-none">{order.customer_name || "N/A"}</p></div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black uppercase text-slate-600">{order.franchise_id || "N/A"}</span>
                            <span className="text-xs font-bold text-slate-500">{order.customer_phone || "N/A"}</span>
                          </div>
                        </div>
                      </section>
                      <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><FiMapPin /> Delivery Location</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">Branch</p>
                            <p className="text-xs font-black text-black uppercase leading-tight">
                              {order.branch_location || "BALAJI NAGAR COMPANY OUTLET"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Address</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase leading-relaxed">
                              {order.customer_address || "B.K.GUDA, R.R.COLONY, S.R.NAGAR"}
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Column 2: Invoice Items */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><FiPackage /> Order Items</h4>
                          <span className="text-[10px] font-black uppercase text-black bg-white border border-slate-200 px-3 py-1 rounded-full">{order.invoice_items?.length || 0} ITEMS</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400">Item Name</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400">Code / HSN</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 text-center">Qty</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 text-right">Rate</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 text-right">Tax</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {order.invoice_items?.map((item) => {
                                const stock = item.stocks || {};
                                const itemTotal = item.quantity * item.price;
                                const taxAmt = itemTotal * ((stock.gst_rate || item.gst_rate || 0) / 100);
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-3 text-[11px] font-black uppercase text-black">{item.item_name}</td>
                                    <td className="px-6 py-3">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-black">{stock.item_code || item.item_code || "-"}</span>
                                        <span className="text-[9px] text-slate-400">HSN: {stock.hsn_code || item.hsn_code || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-black text-black text-center">{item.quantity} {item.unit}</td>
                                    <td className="px-6 py-3 text-[11px] font-bold text-slate-600 text-right">₹{item.price}</td>
                                    <td className="px-6 py-3 text-[10px] font-bold text-emerald-600 text-right">₹{taxAmt.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-[11px] font-black text-black text-right">₹{itemTotal.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-50">
                              <tr>
                                <td colSpan="5" className="px-6 py-4 text-xs font-black uppercase text-right text-slate-500">Total Invoice Amount</td>
                                <td className="px-6 py-4 text-xl font-black uppercase text-right text-black">₹{order.total_amount}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          {/* CHECKLIST (Only if Dispatched) */}
                          {order.status === "dispatched" && (
                            <div className="flex-1 min-w-[300px]">
                              <p className="text-[9px] font-black uppercase text-slate-400 mb-3">Verification Checklist</p>
                              <div className="space-y-2">
                                {DISPATCH_TASKS.map((task) => (
                                  <label key={task.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={!!orderChecklists[order.id]?.[task.id]}
                                      onChange={() => toggleOrderTask(order.id, task.id)}
                                      className="w-4 h-4 accent-black rounded border-slate-300"
                                    />
                                    <span className="text-[10px] font-bold uppercase text-black">{task.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 flex-1 justify-end">
                            {order.status === "packed" && (
                              <button onClick={(e) => handleUndo(order, e)} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-400 font-black text-[10px] uppercase hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
                                Undo to Incoming
                              </button>
                            )}
                            {order.status === "dispatched" && (
                              <button onClick={(e) => handleUndo(order, e)} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-400 font-black text-[10px] uppercase hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
                                Undo to Packed
                              </button>
                            )}

                            {order.status === "incoming" && (
                              <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, "packed"); }} className="flex-1 bg-black text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl">
                                <FiPackage size={18} /> Start Packing
                              </button>
                            )}
                            {order.status === "packed" && (
                              <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, "dispatched"); }} style={{ backgroundColor: BRAND_COLOR }} className="flex-1 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                <FiTruck size={18} /> Ready to Dispatch
                              </button>
                            )}
                            {order.status === "dispatched" && (
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(order); }} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                                  <FaWhatsapp size={16} /> WhatsApp
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="bg-black text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                  <FiPrinter size={16} /> Print
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      }

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
        @media print {
            .print\\:block { display: block !important; }
            .hidden { display: none !important; }
        }
      `}</style>
    </div >
  );
}

export default StockOrders;