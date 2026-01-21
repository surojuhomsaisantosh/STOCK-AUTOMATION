import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  X, 
  Printer, 
  FileText, 
  Phone, 
  MapPin, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";

function InvoicesBilling() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [dateMode, setDateMode] = useState("single"); // 'single' or 'range'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      fetchDispatchedInvoices();
    }
  }, [user, authLoading]);

  const fetchDispatchedInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, created_by, total_amount, created_at, status,
          customer_name, customer_address, branch_location,
          customer_phone, customer_email,
          invoice_items (id, item_name, quantity, unit, price)
        `)
        .eq("status", "dispatched")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Invoice fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  /* ✅ FILTERING LOGIC */
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = 
        invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.id?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (startDate) {
        const orderDate = new Date(invoice.created_at).setHours(0, 0, 0, 0);
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        
        if (dateMode === "single") {
          matchesDate = orderDate === start;
        } else if (endDate) {
          const end = new Date(endDate).setHours(0, 0, 0, 0);
          matchesDate = orderDate >= start && orderDate <= end;
        }
      }
      return matchesSearch && matchesDate;
    });
  }, [invoices, searchQuery, startDate, endDate, dateMode]);

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* CENTERED HEADER SECTION */}
        <div className="relative flex justify-center items-center py-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 p-2 rounded-full hover:bg-white border transition shadow-sm bg-slate-50"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Dispatched Invoices</h2>
          
          <div className="absolute right-0 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl shadow-sm">
             <p className="text-emerald-700 font-black text-xs tracking-widest uppercase">
               Franchise ID : {user?.franchise_id || "N/A"}
             </p>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by franchise name or Invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setDateMode("single")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${dateMode === "single" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >Single</button>
                <button 
                  onClick={() => setDateMode("range")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${dateMode === "range" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >Range</button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {dateMode === "range" && (
                  <>
                    <span className="text-slate-300 text-xs font-bold uppercase">to</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}
                {(startDate || searchQuery) && (
                  <button onClick={clearFilters} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS SECTION */}
        <div className="space-y-4">
          <p className="text-slate-400 text-sm font-semibold ml-2">
            Showing {filteredInvoices.length} billing records
          </p>

          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
              <FileText className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-medium">No dispatched invoices match your criteria</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  
                  {/* SUMMARY CARD */}
                  <div 
                    onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                    className="p-6 flex flex-wrap justify-between items-center cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{invoice.customer_name || "Franchise Partner"}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin size={12} />
                          <span>{invoice.branch_location || "Location N/A"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dispatched Date</p>
                        <p className="text-sm font-bold">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-900">₹{invoice.total_amount}</p>
                        <span className="text-[10px] bg-emerald-100 px-2 py-1 rounded-lg font-black uppercase text-emerald-700 tracking-widest">Dispatched</span>
                      </div>
                      <div className="text-slate-300">
                        {expandedInvoice === invoice.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}
                  {expandedInvoice === invoice.id && (
                    <div className="bg-slate-50 p-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <div className="grid md:grid-cols-2 gap-12">
                        
                        {/* LEFT: Items Table */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Invoice Items</h4>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                  <th className="px-4 py-3 text-left font-bold text-slate-500">Item</th>
                                  <th className="px-4 py-3 text-center font-bold text-slate-500">Qty</th>
                                  <th className="px-4 py-3 text-right font-bold text-slate-500">Price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {invoice.invoice_items?.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 font-medium text-slate-700">{item.item_name}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{item.quantity} {item.unit}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{(item.quantity * item.price).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 font-black">
                                <tr>
                                  <td colSpan="2" className="px-4 py-4 text-slate-800">Grand Total</td>
                                  <td className="px-4 py-4 text-right text-emerald-600 text-lg">₹{invoice.total_amount}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* RIGHT: Logistics & Customer Info */}
                        <div className="space-y-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Billing Info</h4>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3 text-sm">
                                <MapPin size={16} className="text-slate-400 mt-0.5" />
                                <div>
                                  <p className="font-bold text-slate-700">Shipping Address</p>
                                  <p className="text-slate-500">{invoice.customer_address || "No address provided"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <Phone size={16} className="text-slate-400" />
                                <div>
                                  <p className="font-bold text-slate-700">Contact Number</p>
                                  <p className="text-slate-500">{invoice.customer_phone || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.print(); }}
                              className="w-full flex items-center justify-center gap-2 bg-[#0b3d2e] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg shadow-emerald-900/10"
                            >
                              <Printer size={18} />
                              Print Professional Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default InvoicesBilling;