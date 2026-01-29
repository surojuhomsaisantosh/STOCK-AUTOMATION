import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiUser, FiMapPin, FiPackage,
  FiPrinter, FiRefreshCw, FiChevronDown, FiChevronUp, FiFilter, FiCreditCard, FiClock
} from "react-icons/fi";

const COMPANIES = ["All Companies", "T Vanamm", "Other"];
const BRAND_GREEN = "rgb(0, 100, 55)";

function InvoicesBilling() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Responsive Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All Companies");
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
    if (!authLoading && user) fetchDispatchedInvoices();
    return () => window.removeEventListener('resize', handleResize);
  }, [user, authLoading]);

  const fetchDispatchedInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, invoice_items (*)`)
        .eq("status", "dispatched")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCompany("All Companies");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = (inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inv.franchise_id?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCompany = selectedCompany === "All Companies" || inv.company_name === selectedCompany;

      const orderDate = new Date(inv.created_at).toISOString().split('T')[0];
      let matchesDate = true;

      if (dateMode === "date" && singleDate) {
        matchesDate = orderDate === singleDate;
      } else if (dateMode === "range" && startDate && endDate) {
        matchesDate = orderDate >= startDate && orderDate <= endDate;
      }

      return matchesSearch && matchesCompany && matchesDate;
    });
  }, [invoices, searchQuery, selectedCompany, dateMode, singleDate, startDate, endDate]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20">

      {/* TOP NAVIGATION */}
      <nav className={`border-b border-slate-200 bg-white sticky top-0 z-50 flex items-center justify-between ${isMobile ? 'px-4 py-4' : 'px-8 py-5'}`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black"
        >
          <FiArrowLeft size={18} /> {!isMobile && "Back"}
        </button>

        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black uppercase tracking-[0.2em] text-black`}>Invoices</h1>

        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>}
          <span className="text-[10px] md:text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {user?.franchise_id || "TV-HQ-01"}
          </span>
        </div>
      </nav>

      <div className={`max-w-7xl mx-auto space-y-6 md:space-y-8 ${isMobile ? 'px-4 mt-4' : 'px-6 mt-8'}`}>

        {/* STATS ROW */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2'}`}>
          <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex justify-between items-end">
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Records</p>
              <p className="text-2xl md:text-3xl font-black tracking-tighter text-black">{filteredInvoices.length}</p>
            </div>
            {!isMobile && <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><FiPackage size={18} /></div>}
          </div>

          <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex justify-between items-end">
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Session Date</p>
              <p className={`${isMobile ? 'text-[11px]' : 'text-xl'} font-black tracking-tighter text-black`}>{todayDisplay}</p>
            </div>
            {!isMobile && <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><FiCalendar size={18} /></div>}
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className={`bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm flex flex-col lg:flex-row p-4 gap-4 justify-between`}>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search Client or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5 w-full md:w-64 uppercase text-black"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <FiFilter className="text-slate-400" size={14} />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase outline-none text-black cursor-pointer flex-1"
              >
                {COMPANIES.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <select
                className="bg-transparent text-[9px] font-black uppercase outline-none text-black"
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value)}
              >
                <option value="date">Single</option>
                <option value="range">Range</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
              {dateMode === "date" ? (
                <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none text-black flex-1" />
              ) : (
                <div className="flex items-center gap-1 text-black font-bold">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[9px] outline-none" />
                  <span className="text-[8px] opacity-30">TO</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[9px] outline-none" />
                </div>
              )}
            </div>
            <button onClick={resetFilters} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-black hover:text-white transition-all">
              <FiRefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* DATA SECTION */}
        <div className={`${isMobile ? '' : 'bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden'}`}>
          {isMobile ? (
            /* MOBILE FLUID CARDS */
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center font-black uppercase text-[10px] text-slate-300 animate-pulse">Loading...</div>
              ) : filteredInvoices.map((inv) => (
                <div key={inv.id} className={`bg-white border-2 rounded-2xl transition-all ${expandedInvoice === inv.id ? 'border-emerald-600 shadow-md' : 'border-slate-200'}`}>
                  <div onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)} className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">#{inv.franchise_id || "TV"}</span>
                      <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase border bg-emerald-50 text-emerald-700 border-emerald-100">{inv.status}</span>
                    </div>
                    <h3 className="font-black text-sm uppercase text-black mb-1">{inv.customer_name || "N/A"}</h3>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-bold text-slate-400"><FiClock className="inline mr-1" />{new Date(inv.created_at).toLocaleDateString('en-GB')}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">₹{inv.total_amount?.toLocaleString()}</span>
                        {expandedInvoice === inv.id ? <FiChevronUp className="text-emerald-700" /> : <FiChevronDown className="text-slate-300" />}
                      </div>
                    </div>
                  </div>

                  {expandedInvoice === inv.id && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                      <div className="grid gap-6 mb-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Logistics & Location</p>
                          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700"><FiMapPin size={12} /> {inv.branch_location || "N/A"}</div>
                          <p className="text-[10px] mt-1 text-slate-500 uppercase leading-tight">{inv.customer_address || "No address data."}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Item Breakdown</p>
                          <div className="space-y-2">
                            {inv.invoice_items?.map(item => (
                              <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                <span className="text-[11px] font-black uppercase">{item.item_name} (x{item.quantity})</span>
                                <span className="text-xs font-black text-emerald-700">₹{item.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => window.print()} className="w-full bg-black text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <FiPrinter size={16} /> Print Full Invoice
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ORIGINAL DESKTOP TABLE - UNCHANGED */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: BRAND_GREEN }} className="border-b border-white/10">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">#</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Company</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Franchise ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Customer Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white text-right whitespace-nowrap">Dispatched Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="7" className="py-32 text-center font-black uppercase text-xs tracking-[0.3em] text-slate-300 animate-pulse">Loading Records...</td></tr>
                  ) : filteredInvoices.map((inv, idx) => (
                    <React.Fragment key={inv.id}>
                      <tr
                        onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                        className={`group cursor-pointer transition-all ${expandedInvoice === inv.id ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-8 py-6 font-black text-black text-xs">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-[10px]">TV</div><span className="font-black text-xs uppercase text-black">T Vanamm</span></div></td>
                        <td className="px-8 py-6"><span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-black uppercase">{inv.franchise_id || "TV-GEN"}</span></td>
                        <td className="px-8 py-6 font-black text-xs uppercase tracking-tighter text-black">{inv.customer_name || "N/A"}</td>
                        <td className="px-8 py-6 font-black text-sm text-black">₹{inv.total_amount?.toLocaleString()}</td>
                        <td className="px-8 py-6"><span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-100">{inv.status}</span></td>
                        <td className="px-8 py-6 text-right"><div className="flex items-center justify-end gap-4"><span className="font-black text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>{expandedInvoice === inv.id ? <FiChevronUp className="text-emerald-700 font-black" /> : <FiChevronDown className="text-slate-400" />}</div></td>
                      </tr>

                      {expandedInvoice === inv.id && (
                        <tr className="bg-white">
                          <td colSpan="7" className="px-8 py-10">
                            <div className="grid lg:grid-cols-12 gap-12 border-t border-slate-100 pt-8">
                              <div className="lg:col-span-4 space-y-6 border-r border-slate-100 pr-8">
                                <section>
                                  <h4 className="text-[10px] font-black uppercase text-black tracking-[0.2em] mb-4 flex items-center gap-2 border-l-2 border-black pl-3"><FiUser /> Identity</h4>
                                  <div className="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                    <div><p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Customer</p><p className="text-xs font-black uppercase text-black">{inv.customer_name || "N/A"}</p></div>
                                    <div><p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Franchise ID</p><p className="text-xs font-black text-black uppercase">{inv.franchise_id || "N/A"}</p></div>
                                  </div>
                                </section>
                                <section>
                                  <h4 className="text-[10px] font-black uppercase text-black tracking-[0.2em] mb-4 flex items-center gap-2 border-l-2 border-black pl-3"><FiMapPin /> Logistics</h4>
                                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                    <div><p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Branch</p><p className="text-[11px] font-black text-black uppercase">{inv.branch_location || "N/A"}</p></div>
                                    <div><p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Address</p><p className="text-[10px] font-black text-black uppercase leading-tight">{inv.customer_address || "No address data."}</p></div>
                                  </div>
                                </section>
                                <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="w-full bg-black text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-all flex items-center justify-center gap-3"><FiPrinter size={16} /> Print Invoice</button>
                              </div>
                              <div className="lg:col-span-8 flex flex-col">
                                <div className="flex justify-between items-center mb-5"><h4 className="text-[10px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2 border-l-2 border-black pl-3"><FiPackage /> Itemized Billing</h4><span className="text-[9px] font-black uppercase px-3 py-1 rounded-lg bg-slate-100 text-slate-500">Count: {inv.invoice_items?.length || 0}</span></div>
                                <div className="max-h-[320px] overflow-y-auto pr-4 custom-scrollbar mb-6">
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {inv.invoice_items?.map((item) => (
                                      <div key={item.id} className="p-4 rounded-2xl border border-slate-100 flex justify-between items-center bg-white shadow-sm transition-all group hover:border-black">
                                        <div><p className="text-[11px] font-black uppercase text-black">{item.item_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Qty: {item.quantity} {item.unit}</p></div>
                                        <div className="text-right"><span className="font-black text-xs text-black block">₹{item.price}</span></div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-auto"><div className="bg-emerald-600 p-5 rounded-2xl text-white flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><FiCreditCard size={18} /></div><div><p className="text-[9px] font-black uppercase tracking-widest opacity-70">Grand Total</p><p className="text-2xl font-black tracking-tight">₹{inv.total_amount?.toLocaleString()}</p></div></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/50 px-3 py-1.5 rounded-lg border border-white/20">Payment Verified</p></div></div></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default InvoicesBilling;