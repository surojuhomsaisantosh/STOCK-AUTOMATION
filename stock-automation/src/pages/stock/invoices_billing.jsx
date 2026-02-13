import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiPrinter, FiSearch, FiCalendar, FiX } from "react-icons/fi";

// --- ASSET IMPORTS ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

// --- THEME CONSTANTS ---
const THEME_COLOR = "rgb(0, 100, 55)"; // Deep Green

// --- HELPER FUNCTION ---
const numberToWords = (num) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.toUpperCase() + ' RUPEES ONLY';
};

function InvoicesBilling() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize with a loading state or empty string
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("Loading...");

  // Date States
  const [filterType, setFilterType] = useState("date"); // 'date' (Exact) or 'range' (Range)
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      // 1. Fetch Profile Data Correctly from Table
      fetchFranchiseProfile();
      // 2. Fetch Invoice Data
      fetchInvoiceData();
    }

    // We keep the timer to ensure the DATE updates correctly if the user stays on the page overnight
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user, authLoading]);

  // --- NEW FUNCTION: FETCH PROFILE ---
  const fetchFranchiseProfile = async () => {
    try {
      if (!user?.id) return;

      // Query the 'profiles' table matching the Auth ID
      const { data, error } = await supabase
        .from('profiles')
        .select('franchise_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        // Fallback to email if database fetch fails
        setSelectedFranchiseId(user.email);
      } else if (data) {
        // Set the ID from the database
        setSelectedFranchiseId(data.franchise_id || "NO ID ASSIGNED");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select(`*, invoice_items (*, stocks ( hsn_code ))`)
        .eq("status", "dispatched")
        .order("created_at", { ascending: false });
      if (invError) throw invError;
      setInvoices(invData || []);

      const { data: compData, error: compError } = await supabase.from("companies").select("*");
      if (compError) throw compError;
      setCompanies(compData || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Text Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (inv.customer_name?.toLowerCase().includes(searchLower)) ||
        (inv.franchise_id?.toLowerCase().includes(searchLower)) ||
        (inv.customer_address?.toLowerCase().includes(searchLower));

      // 2. Date Filter
      const orderDate = new Date(inv.created_at).toISOString().split('T')[0];
      let matchesDate = true;

      if (filterType === "date" && singleDate) {
        matchesDate = orderDate === singleDate;
      } else if (filterType === "range" && startDate && endDate) {
        matchesDate = orderDate >= startDate && orderDate <= endDate;
      }

      return matchesSearch && matchesDate;
    });
  }, [invoices, searchQuery, filterType, singleDate, startDate, endDate]);

  // --- HELPER FOR INVOICE VIEW ---
  const getCompanyDetails = (franchiseId) => {
    return companies.find(c => c.franchise_id === franchiseId) || companies[0] || {};
  };

  const getCompanyLogo = (companyName) => {
    if (!companyName) return null;
    const name = companyName.toLowerCase();
    if (name.includes("t vanamm") || name.includes("t-vanamm")) return tvanammLogo;
    if (name.includes("leaf")) return tleafLogo;
    if (name.includes("jksh") || name.includes("j.k.s.h")) return jkshLogo;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-black font-sans pb-20 print:bg-white print:pb-0">

      {/* --- PRINT & SCROLLBAR STYLES --- */}
      <style>
        {`
          /* Custom Scrollbar */
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

          /* Animations */
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-scaleUp { animation: scaleUp 0.3s ease-out forwards; }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }

          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
            
            nav, .filters-container, .main-table-header, .quick-summary-card, .no-print { display: none !important; }
            
            .print-only-invoice { display: block !important; width: 100%; height: 100%; }
            .print-full-width { width: 100% !important; max-width: none !important; }
          }
          .print-only-invoice { display: none; }
        `}
      </style>

      {/* --- UPDATED NAVIGATION BAR --- */}
      <nav className="border-b border-slate-200 px-4 md:px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between print:hidden">

        {/* LEFT: Back Button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
          <FiArrowLeft size={18} /> Back
        </button>

        {/* CENTER: Title (Hidden on small mobile to save space, visible on md+) */}
        <h1 className="text-xl font-black uppercase tracking-[0.2em] absolute left-1/2 -translate-x-1/2 hidden md:block">
          Invoices
        </h1>

        {/* RIGHT: Franchise ID Box */}
        <div className="flex items-center">
          <div className="text-xs font-black bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 uppercase text-slate-700 whitespace-nowrap">
            ID : {selectedFranchiseId}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 print:w-full print:max-w-none print:px-0 print:mt-0">

        {/* --- 2. FILTERS CONTAINER --- */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 mb-8 flex flex-col gap-8 filters-container">

          {/* --- ROW 1: SEARCH & DATE CARD (IN SAME ROW on MD+) --- */}
          <div className="flex flex-col md:flex-row gap-6 items-stretch justify-between">

            {/* Search Bar */}
            <div className="relative w-full md:w-2/3 group">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[rgb(0,100,55)]" size={22} />
              <input
                type="text"
                placeholder="Search Name, Address, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-bold shadow-inner placeholder-gray-400"
                style={{ '--tw-ring-color': THEME_COLOR }}
                onFocus={(e) => e.target.style.borderColor = THEME_COLOR}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              />
            </div>

            {/* Today's Date Card */}
            <div className="w-full md:w-1/3 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-center shadow-lg relative overflow-hidden group">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                  <FiCalendar size={14} className="text-gray-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Today</span>
                </div>
                <div className="text-xl font-black tracking-tight text-black">
                  {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* --- ROW 2: TOGGLE & DATE INPUTS --- */}
          <div className="flex flex-col md:flex-row gap-6 items-center pt-6 border-t border-gray-100">
            <div className="bg-gray-100 p-1.5 rounded-2xl flex relative w-full md:w-auto min-w-[300px]">
              <button
                onClick={() => { setFilterType("date"); setStartDate(""); setEndDate(""); }}
                className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative z-10 
                        ${filterType === "date" ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Exact Date
              </button>
              <button
                onClick={() => { setFilterType("range"); setSingleDate(""); }}
                className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative z-10
                        ${filterType === "range" ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Date Range
              </button>
            </div>

            <div className="flex-grow flex items-center w-full md:w-auto">
              {filterType === "date" ? (
                <div className="w-full md:w-auto animate-fadeIn">
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full md:w-auto px-6 py-3.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold outline-none transition-all shadow-sm focus:bg-white"
                    onFocus={(e) => e.target.style.borderColor = THEME_COLOR}
                    onBlur={(e) => e.target.style.borderColor = '#f3f4f6'}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full md:w-auto animate-fadeIn bg-white border-2 border-gray-100 rounded-xl p-1.5 shadow-sm focus-within:border-[rgb(0,100,55)] transition-colors"
                  onFocus={(e) => e.currentTarget.style.borderColor = THEME_COLOR}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 text-sm font-bold outline-none bg-transparent w-full"
                  />
                  <span className="text-gray-300 font-black px-1">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 text-sm font-bold outline-none bg-transparent w-full"
                  />
                </div>
              )}

              {(singleDate || (startDate && endDate)) && (
                <button
                  onClick={() => { setSingleDate(''); setStartDate(''); setEndDate(''); }}
                  className="ml-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- 3. MOBILE CARD VIEW (md:hidden) --- */}
        <div className="md:hidden space-y-4 mb-20 animate-fadeIn">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold text-sm">No invoices found.</div>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="bg-white p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 rounded-lg text-white font-black text-[10px] tracking-wide" style={{ backgroundColor: THEME_COLOR }}>
                    {inv.franchise_id}
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">{inv.customer_name}</h4>
                    <p className="text-xs text-gray-500 truncate max-w-[150px] font-medium mt-1">{inv.customer_address}</p>
                  </div>
                  <span className="text-lg font-black" style={{ color: THEME_COLOR }}>
                    ₹{inv.total_amount?.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- 4. DATA TABLE (DESKTOP) --- */}
        <div className="hidden md:block bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-black tracking-wider text-black">
                <tr>
                  <th className="px-8 py-6">S.No</th>
                  <th className="px-8 py-6">Franchise ID</th>
                  <th className="px-8 py-6 w-1/3">Address</th>
                  <th className="px-8 py-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="4" className="py-32 text-center font-black uppercase text-xs tracking-[0.3em] text-slate-300 animate-pulse">Loading...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan="4" className="py-16 text-center font-bold text-sm text-gray-400">No invoices found matching your criteria.</td></tr>
                ) : filteredInvoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="group cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-8 py-6 font-black text-black text-xs whitespace-nowrap opacity-60">
                      {(idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-8 py-6 font-bold text-xs">
                      <span className="px-3 py-1.5 rounded-lg text-white font-black tracking-wide text-[10px]" style={{ backgroundColor: THEME_COLOR }}>
                        {inv.franchise_id}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-medium text-gray-500 max-w-xs truncate">
                      {inv.customer_address || "No Address Provided"}
                    </td>
                    <td className="px-8 py-6 text-right whitespace-nowrap font-black text-xs text-black">
                      ₹{inv.total_amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- 5. INVOICE POPUP MODAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedInvoice(null)}
          />

          {/* Modal Content */}
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl relative z-10 animate-scaleUp flex flex-col print:w-full print:max-w-none print:h-full print:max-h-none print:rounded-none">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 print:hidden">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider">Invoice Details</h2>
                <p className="text-xs text-gray-400 font-bold">{selectedInvoice.id}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-black"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#F8F9FA] print:p-0 print:bg-white print:overflow-visible">

              {/* Reusing existing logic inside the render */}
              {(() => {
                const inv = selectedInvoice;
                const items = inv.invoice_items || [];
                const companyDetails = getCompanyDetails(inv.franchise_id);
                const selectedLogo = getCompanyLogo(companyDetails.company_name);
                const taxable = (inv.total_amount / 1.18);
                const totalTax = inv.total_amount - taxable;

                return (
                  <>
                    {/* Quick View Card (Screen Only) */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-8 print:hidden">
                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Items */}
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            Order Items
                          </h4>
                          <div className="space-y-3">
                            {items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 last:border-0">
                                <div>
                                  <span className="font-bold text-gray-800 block">{item.item_name}</span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.quantity} {item.unit} x ₹{Number(item.price).toFixed(2)}</span>
                                </div>
                                <span className="font-black text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Info & Actions */}
                        <div className="md:w-72 flex flex-col gap-4">
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex justify-between text-base font-black text-black pt-2 uppercase">
                              <span>Total</span>
                              <span style={{ color: THEME_COLOR }}>₹{inv.total_amount?.toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => window.print()}
                            className="w-full py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                            style={{ backgroundColor: THEME_COLOR }}
                          >
                            <FiPrinter size={18} /> Print Invoice
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ACTUAL INVOICE DOCUMENT (Print Only) */}
                    <div className="hidden print:block print:w-full print:h-full">
                      <div className="bg-white text-black font-sans text-xs w-full max-w-[210mm] relative flex flex-col min-h-[296mm] h-[296mm] print:h-screen print:w-screen print:max-w-none shadow-none p-6 print:p-6 overflow-hidden mx-auto">
                        <div className="border-2 border-black h-full flex flex-col relative">
                          {/* HEADER */}
                          <div className="text-center py-2 bg-white">
                            <h1 className="text-xl font-bold underline uppercase tracking-wider leading-none text-black">Tax Invoice</h1>
                          </div>
                          {/* COMPANY DETAILS */}
                          <div className="flex border-b-2 border-black">
                            <div className="w-1/2 p-3 flex flex-col justify-center">
                              <p className="font-bold text-[11px] mb-0.5 underline uppercase text-black">Registered Office:</p>
                              <p className="whitespace-pre-line text-[11px] font-bold uppercase leading-tight text-black">
                                {companyDetails.company_address || "Address Not Available"}
                              </p>
                              <div className="mt-2 text-[11px] font-medium leading-relaxed text-black">
                                <p><span className="font-black">GSTIN:</span> {companyDetails.company_gst || "N/A"}</p>
                                <p><span className="font-black">Email:</span> {companyDetails.company_email || "N/A"}</p>
                              </div>
                            </div>
                            <div className="w-1/2 p-2 flex flex-col items-end justify-center text-right">
                              <div className="flex flex-col items-center">
                                <div className="mb-1">
                                  {selectedLogo ? <img src={selectedLogo} alt="Logo" className="h-16 w-auto object-contain" /> : <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black">NO LOGO</div>}
                                </div>
                                <h2 className="text-xl font-black uppercase leading-none text-black">{companyDetails.company_name || "T Vanamm"}</h2>
                              </div>
                            </div>
                          </div>
                          {/* INVOICE NO & DATE */}
                          <div className="flex border-b-2 border-black text-[11px] text-black">
                            <div className="w-1/2 border-r-2 border-black p-2 flex justify-between items-center">
                              <span className="font-black">Invoice No:</span>
                              <span className="font-bold uppercase">{inv.id.substring(0, 8)}</span>
                            </div>
                            <div className="w-1/2 p-2 flex justify-between items-center">
                              <span className="font-black">Invoice Date:</span>
                              <span className="font-bold">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                          {/* BILL TO */}
                          <div className="flex border-b-2 border-black bg-white text-black">
                            <div className="w-1/2 border-r-2 border-black p-3">
                              <h3 className="font-black underline mb-1 uppercase text-xs">Bill To:</h3>
                              <p className="font-bold uppercase text-[13px] leading-tight">{inv.customer_name}</p>
                              <p className="text-[11px] uppercase mt-1 leading-tight font-medium">{inv.customer_address}</p>
                            </div>
                            <div className="w-1/2 p-3 flex flex-col justify-center gap-2 text-[11px]">
                              <div className="flex justify-between">
                                <span className="font-black uppercase">Franchise ID:</span>
                                <span className="font-bold">{inv.franchise_id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-black uppercase">Phone Number:</span>
                                <span className="font-bold uppercase">{inv.customer_phone || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                          {/* ITEMS TABLE */}
                          <div className="flex-grow overflow-hidden relative">
                            <div className="flex bg-white text-center border-b-2 border-black font-bold uppercase text-[11px] py-2 sticky top-0 z-10 text-black">
                              <div className="border-r border-black w-10">S.No</div>
                              <div className="border-r border-black flex-1 text-left px-2">Item Description</div>
                              <div className="border-r border-black w-20">HSN/SAC</div>
                              <div className="border-r border-black w-16">Qty</div>
                              <div className="border-r border-black w-24">Rate</div>
                              <div className="border-r border-black w-16">GST %</div>
                              <div className="w-28 px-2 text-right">Amount</div>
                            </div>
                            {items.map((item, i) => (
                              <div key={item.id || i} className="flex border-b border-black text-center items-center text-[10px] py-1 text-black">
                                <div className="border-r border-black w-10 h-full flex items-center justify-center">{i + 1}</div>
                                <div className="border-r border-black flex-1 text-left px-2 font-bold h-full flex items-center uppercase text-wrap">{item.item_name}</div>
                                <div className="border-r border-black w-20 h-full flex items-center justify-center">{item.stocks?.hsn_code || item.hsn_code || "-"}</div>
                                <div className="border-r border-black w-16 h-full flex items-center justify-center font-bold">{item.quantity} {item.unit}</div>
                                <div className="border-r border-black w-24 text-right px-2 h-full flex items-center justify-end">{(Number(item.price)).toFixed(2)}</div>
                                <div className="border-r border-black w-16 h-full flex items-center justify-center">{item.gst_rate || 0}%</div>
                                <div className="w-28 text-right px-2 font-black h-full flex items-center justify-end">{(item.price * item.quantity).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                          {/* FOOTER */}
                          <div className="flex border-t-2 border-black mt-auto text-black">
                            <div className="w-full flex">
                              <div className="w-1/2 border-r-2 border-black flex flex-col justify-end">
                                <div className="p-2 border-b border-black">
                                  <span className="text-[10px] font-bold underline uppercase">Amount in Words:</span>
                                  <p className="text-[10px] font-black uppercase mt-1 leading-tight">{numberToWords(Math.round(inv.total_amount || 0))}</p>
                                </div>
                                <div className="p-2 border-b border-black">
                                  <h4 className="font-black underline text-[10px] uppercase">Bank Details:</h4>
                                  <div className="text-[10px] leading-tight mt-1 space-y-0.5 font-bold">
                                    <p>Bank: {companyDetails.bank_name || "N/A"}</p>
                                    <p>A/C: {companyDetails.bank_acc_no || "N/A"}</p>
                                    <p>IFSC: {companyDetails.bank_ifsc || "N/A"}</p>
                                  </div>
                                </div>
                                <div className="p-2">
                                  <h4 className="font-black underline text-[10px] uppercase">Terms:</h4>
                                  <p className="text-[9px] whitespace-pre-line leading-tight font-medium text-black">
                                    {companyDetails.terms || "No terms available."}
                                  </p>
                                </div>
                              </div>
                              <div className="w-1/2 flex flex-col text-[11px]">
                                {/* Totals Section reused */}
                                <div className="flex justify-between px-3 py-1.5 border-b border-black">
                                  <span className="font-bold">Taxable Amount</span>
                                  <span className="font-bold">₹{taxable.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between px-3 py-1 border-b border-black">
                                  <span>CGST (9%)</span>
                                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between px-3 py-1 border-b border-black">
                                  <span>SGST (9%)</span>
                                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between px-3 py-2 border-b-2 border-black bg-white font-black text-[12px] text-black">
                                  <span>TOTAL AMOUNT</span>
                                  <span>₹{Number(inv.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex-grow flex flex-col justify-center items-center py-4 px-3 text-center">
                                  <span className="font-black uppercase text-[10px]">For {companyDetails.company_name || "T VANAMM"}</span>
                                  <div className="h-8 mt-2"></div>
                                  <span className="text-[9px] font-bold uppercase text-black">(Authorized Signatory)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute -bottom-5 right-0 text-[10px] font-bold text-black">Page 1 of 1</div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      )}
    </div>

  );
}

export default InvoicesBilling;