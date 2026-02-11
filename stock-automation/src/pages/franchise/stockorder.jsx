
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

// --- ASSET IMPORTS ---
import jkshLogo from "../../assets/jksh_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";

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
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("All");
  const [dateMode, setDateMode] = useState("date"); 
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
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
      const matchesSearch = (inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (inv.franchise_id?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFranchise = selectedFranchiseId === "All" || inv.franchise_id === selectedFranchiseId;
      const orderDate = new Date(inv.created_at).toISOString().split('T')[0];
      let matchesDate = true;
      if (dateMode === "date" && singleDate) matchesDate = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) matchesDate = orderDate >= startDate && orderDate <= endDate;
      return matchesSearch && matchesFranchise && matchesDate;
    });
  }, [invoices, searchQuery, selectedFranchiseId, dateMode, singleDate, startDate, endDate]);

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
      <nav className="border-b border-slate-200 px-8 py-5 bg-white sticky top-0 z-50 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-60 transition-all text-black">
          <FiArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black">Invoices Billing</h1>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 print:w-full print:max-w-none print:px-0 print:mt-0">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="py-32 text-center font-black uppercase text-xs tracking-[0.3em] text-slate-300 animate-pulse">Loading...</td></tr>
                ) : filteredInvoices.map((inv, idx) => {
                  const isExpanded = expandedInvoice === inv.id;
                  const companyDetails = getCompanyDetails(inv.franchise_id);
                  const selectedLogo = getCompanyLogo(companyDetails.company_name);
                  
                  const taxable = (inv.total_amount / 1.18);
                  const totalTax = inv.total_amount - taxable;
                  const cgst = totalTax / 2;
                  const sgst = totalTax / 2;
                  const items = inv.invoice_items || [];

                  return (
                    <React.Fragment key={inv.id}>
                      <tr onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)} className={`group cursor-pointer transition-all print:hidden ${isExpanded ? 'bg-gray-100 border-l-4 border-black' : 'hover:bg-slate-50'}`}>
                        <td className="px-8 py-6 font-black text-black text-xs whitespace-nowrap opacity-70">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-8 py-6 whitespace-nowrap font-black text-xs uppercase">{inv.customer_name || "N/A"}</td>
                        <td className="px-8 py-6 text-right whitespace-nowrap font-black text-xs">₹{inv.total_amount?.toLocaleString()}</td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 print:bg-white">
                          <td colSpan="6" className="p-0 print:block print:w-full">
                            <div className="p-8 print:p-0 flex flex-col items-center">
                              
                              {/* SINGLE PAGE CONTAINER */}
                              <div className="bg-white text-black font-sans text-xs w-full max-w-[210mm] relative flex flex-col min-h-[296mm] h-[296mm] shadow-lg print:shadow-none p-6 overflow-hidden">
                                
                                <div className="border-2 border-black h-full flex flex-col relative">

                                    {/* --- HEADER (TIGHTENED & NO BORDER) --- */}
                                    <div className="text-center pt-2 pb-0 bg-slate-50 print:bg-white">
                                        <h1 className="text-xl font-bold underline uppercase tracking-wider leading-none m-0">Tax Invoice</h1>
                                    </div>

                                    {/* --- COMPANY DETAILS (REMOVED BORDER-T-2) --- */}
                                    <div className="flex border-b-2 border-black">
                                        <div className="w-1/2 p-3 flex flex-col justify-center">
                                            <p className="font-bold text-[11px] mb-0.5 underline uppercase">Registered Office:</p>
                                            <p className="whitespace-pre-line text-[11px] font-bold uppercase leading-tight text-black">
                                                {companyDetails.company_address || "Address Not Available"}
                                            </p>
                                            <div className="mt-2 text-[11px] font-medium leading-relaxed">
                                                <p><span className="font-black">GSTIN:</span> {companyDetails.company_gst || "N/A"}</p>
                                                <p><span className="font-black">Email:</span> {companyDetails.company_email || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="w-1/2 p-2 flex flex-col items-end justify-center text-right">
                                            <div className="mb-1">
                                                {selectedLogo ? <img src={selectedLogo} alt="Logo" className="h-16 w-auto object-contain" /> : <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px]">NO LOGO</div>}
                                            </div>
                                            <h2 className="text-xl font-black uppercase leading-none text-black">{companyDetails.company_name || "T Vanamm"}</h2>
                                        </div>
                                    </div>

                                    {/* --- INVOICE NO & DATE --- */}
                                    <div className="flex border-b-2 border-black text-[11px]">
                                        <div className="w-1/2 border-r-2 border-black p-2 flex justify-between items-center">
                                            <span className="font-black">Invoice No:</span>
                                            <span className="font-bold uppercase">{inv.id.substring(0,8)}</span>
                                        </div>
                                        <div className="w-1/2 p-2 flex justify-between items-center">
                                            <span className="font-black">Invoice Date:</span>
                                            <span className="font-bold">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
                                        </div>
                                    </div>

                                    {/* --- BILL TO --- */}
                                    <div className="flex border-b-2 border-black bg-slate-50 print:bg-white">
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

                                    {/* --- ITEMS TABLE --- */}
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex bg-slate-100 print:bg-white text-center border-b-2 border-black font-bold uppercase text-[11px] py-2">
                                            <div className="border-r border-black w-10">S.No</div>
                                            <div className="border-r border-black flex-1 text-left px-2">Item Description</div>
                                            <div className="border-r border-black w-20">HSN/SAC</div>
                                            <div className="border-r border-black w-16">Qty</div>
                                            <div className="border-r border-black w-24">Rate</div>
                                            <div className="border-r border-black w-16">GST %</div>
                                            <div className="w-28 px-2 text-right">Amount</div>
                                        </div>

                                        {items.map((item, i) => (
                                            <div key={item.id || i} className="flex border-b border-black text-center items-center text-[10px] py-1">
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

                                    {/* --- FOOTER (Pinned to Bottom) --- */}
                                    <div className="flex border-t-2 border-black mt-auto"> 
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
                                                    <p className="text-[9px] whitespace-pre-line leading-tight font-medium opacity-90">
                                                        {companyDetails.terms || "No terms available."}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-1/2 flex flex-col text-[11px]">
                                                <div className="flex justify-between px-3 py-1.5 border-b border-black">
                                                    <span className="font-bold">Taxable Amount</span>
                                                    <span className="font-bold">₹{taxable.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between px-3 py-1 border-b border-black">
                                                    <span>CGST (9%)</span>
                                                    <span>₹{cgst.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between px-3 py-1 border-b border-black">
                                                    <span>SGST (9%)</span>
                                                    <span>₹{sgst.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between px-3 py-2 border-b-2 border-black bg-slate-100 print:bg-slate-100 font-black text-[12px]">
                                                    <span>TOTAL AMOUNT</span>
                                                    <span>₹{Number(inv.total_amount).toFixed(2)}</span>
                                                </div>
                                                <div className="flex-grow flex flex-col justify-center items-center py-4 px-3 text-center">
                                                    <span className="font-black uppercase text-[10px]">For {companyDetails.company_name || "T VANAMM"}</span>
                                                    <div className="h-8 mt-2"></div> 
                                                    <span className="text-[9px] font-bold uppercase opacity-70">(Authorized Signatory)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- PAGE NUMBER AT THE BOTTOM --- */}
                                    <div className="absolute -bottom-5 right-0 text-[10px] font-bold text-gray-400">
                                        Page 1 of 1
                                    </div>

                                </div> 
                              </div>

                              <div className="mt-8 mb-20 flex justify-center print:hidden">
                                <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="bg-black text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center gap-3">
                                  <FiPrinter size={20} /> Print A4 Invoice
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicesBilling;