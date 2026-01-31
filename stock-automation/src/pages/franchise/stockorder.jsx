import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiShoppingCart, 
  FiAlertTriangle, FiX, FiCheck, FiFilter, FiBell, 
  FiMinus, FiPlus, FiTrash2, FiRefreshCw
} from "react-icons/fi";

// --- ASSETS ---
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";

const BRAND_COLOR = "rgb(0, 100, 55)";

// --- INTERNAL TOAST COMPONENT (Updated Position) ---
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    // UPDATED: Fixed bottom on mobile, Top right on desktop
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-auto md:top-4 z-[100] flex flex-col gap-2 pointer-events-none items-center md:items-end">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`pointer-events-auto w-full md:w-auto md:min-w-[300px] p-4 rounded-xl shadow-2xl border-l-4 flex items-start gap-3 animate-in slide-in-from-bottom md:slide-in-from-right duration-300 bg-white ${
            toast.type === 'error' ? 'border-rose-500' : 'border-emerald-500'
          }`}
        >
          <div className={`mt-0.5 ${toast.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
            {toast.type === 'error' ? <FiAlertTriangle /> : <FiCheck />}
          </div>
          <div className="flex-1">
            <h4 className={`text-xs font-black uppercase ${toast.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
              {toast.title}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{toast.message}</p>
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-slate-300 hover:text-black transition-colors">
            <FiX />
          </button>
        </div>
      ))}
    </div>
  );
};

// --- SKELETON LOADER ---
const StockSkeleton = () => (
  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-3 animate-pulse">
    <div className="h-3 w-1/3 bg-slate-100 rounded-md"></div>
    <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
    <div className="h-8 w-1/2 bg-slate-100 rounded-md mt-2"></div>
    <div className="mt-auto h-10 w-full bg-slate-100 rounded-xl"></div>
  </div>
);

// --- HELPER: Unit Conversion ---
const getConversionFactor = (unit) => {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();
  const gramVariants = ["g", "grams", "gram", "gm", "gms"];
  const mlVariants = ["ml", "millilitre", "millilitres", "ml."];
  if (gramVariants.includes(u)) return 0.001;
  if (mlVariants.includes(u)) return 0.001;
  return 1;
};

// --- HELPER: Number to Words ---
const amountToWords = (price) => {
  if (!price) return "";
  const num = Math.round(price);
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return; 
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  }
  return inWords(num) + "Rupees Only";
};

// --- INVOICE COMPONENT ---
const FullPageInvoice = ({ data, profile, orderId, companyDetails }) => {
  if (!data) return null;

  const companyName = companyDetails?.company_name || profile?.company || "TVANAMM";
  const parentComp = companyDetails?.parent_company || companyName;
  const isTLeaf = parentComp.toLowerCase().includes("leaf");
  const currentLogo = isTLeaf ? tleafLogo : tvanammLogo;

  const dateObj = new Date();
  const invDate = dateObj.toLocaleDateString('en-GB');
  const dueDate = dateObj.toLocaleDateString('en-GB'); 

  const taxableAmount = data.subtotal || 0;
  const totalGst = data.totalGst || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const grandTotal = data.roundedBill || 0;

  const termsList = companyDetails?.terms 
    ? companyDetails.terms.split('\n').filter(t => t.trim() !== '')
    : [
        "Goods once sold will not be taken back or exchanged",
        "Payments terms : 100% advance payments",
        "Once placed order cannot be cancelled",
        "All legal matters subject to Hyderabad jurisdiction",
        "Delivery lead time 3-5 working days"
      ];

  return (
    <div className="w-full bg-white text-black font-sans p-8 print:p-0 box-border text-xs leading-normal h-full">
      <div className="w-full border-2 border-black flex flex-col relative h-full print:h-[277mm] print:border-2">
        {/* Header */}
        <div className="p-4 border-b-2 border-black relative">
            <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
                <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4">TAX INVOICE</h1>
            </div>
            <div className="flex justify-between items-start mt-4">
                <div className="z-10"><img src={currentLogo} alt="Logo" className="h-20 w-auto object-contain" /></div>
                <div className="text-right z-10 max-w-[45%] mt-6">
                    <h2 className="text-lg font-black uppercase text-[#006437]">{companyName}</h2>
                    <p className="font-bold leading-tight mt-1 text-[10px] whitespace-pre-line">
                        {companyDetails?.company_address || "Registered Office\nHyderabad, Telangana - 500081"}<br />
                        GSTIN: <span className="font-black">{companyDetails?.company_gst || "36ABCDE1234F1Z5"}</span>
                        {companyDetails?.company_email && <><br />Email: {companyDetails.company_email}</>}
                    </p>
                </div>
            </div>
        </div>
        {/* Meta */}
        <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent">
            <div className="flex-1 border-r-2 border-black p-2"><span className="font-bold text-slate-500 uppercase text-[9px] print:text-black">Invoice No:</span><p className="font-black text-sm">#{orderId || 'PENDING'}</p></div>
            <div className="flex-1 border-r-2 border-black p-2"><span className="font-bold text-slate-500 uppercase text-[9px] print:text-black">Invoice Date:</span><p className="font-black text-sm">{invDate}</p></div>
            <div className="flex-1 p-2"><span className="font-bold text-slate-500 uppercase text-[9px] print:text-black">Due Date:</span><p className="font-black text-sm">{dueDate}</p></div>
        </div>
        {/* Bill To */}
        <div className="flex border-b-2 border-black">
            <div className="w-[70%] p-3 border-r-2 border-black">
                <span className="font-black uppercase underline text-[10px] tracking-widest text-slate-500 mb-2 block print:text-black">Bill To:</span>
                <h3 className="text-sm font-black uppercase text-black leading-tight">{profile?.name || "Franchise Store"}</h3>
                <p className="font-bold text-[10px] mt-1 text-black uppercase leading-relaxed">
                    {profile?.address || "Address Not Provided"}<br/>
                    {profile?.city ? `${profile.city}` : ''} {profile?.state ? `, ${profile.state}` : ''} {profile?.pincode ? ` - ${profile.pincode}` : ''}
                </p>
            </div>
            <div className="w-[30%] p-3 flex flex-col justify-center pl-4">
                <div className="mb-2"><span className="text-[10px] font-bold text-black uppercase block mb-1">ID: </span><span className="text-sm font-black text-black block">{profile?.franchise_id || "N/A"}</span></div>
                {profile?.phone && (<div><span className="text-[10px] font-bold text-black uppercase block mb-1">Ph: </span><span className="text-sm font-black text-black block">{profile.phone}</span></div>)}
            </div>
        </div>
        {/* Table */}
        <div className="flex-1 border-b-2 border-black">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-[10px] border-b-2 border-black print:bg-gray-100">
                    <tr>
                        <th className="p-2 border-r-2 border-black w-12 text-center">S.No</th>
                        <th className="p-2 border-r-2 border-black">Item Description</th>
                        <th className="p-2 border-r-2 border-black w-24 text-center">HSN/SAC</th>
                        <th className="p-2 border-r-2 border-black w-16 text-center">Qty</th>
                        <th className="p-2 border-r-2 border-black w-24 text-right">Rate</th>
                        <th className="p-2 border-r-2 border-black w-16 text-right">Tax %</th>
                        <th className="p-2 w-28 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold">
                    {data.items && data.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0">
                            <td className="p-2 border-r-2 border-black text-center">{idx + 1}</td>
                            <td className="p-2 border-r-2 border-black uppercase truncate max-w-[200px]">{item.item_name}</td>
                            <td className="p-2 border-r-2 border-black text-center">{item.hsn_code || '-'}</td> 
                            <td className="p-2 border-r-2 border-black text-center">{item.displayQty} {item.cartUnit}</td>
                            <td className="p-2 border-r-2 border-black text-right">₹{item.price}</td>
                            <td className="p-2 border-r-2 border-black text-right">{item.gst_rate || 0}%</td>
                            <td className="p-2 text-right">₹{item.preciseSubtotal.toFixed(2)}</td>
                        </tr>
                    ))}
                    <tr className="h-full"><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td></tr>
                </tbody>
            </table>
        </div>
        {/* Footer */}
        <div className="flex border-t-2 border-black">
            <div className="w-[60%] border-r-2 border-black flex flex-col">
                <div className="p-2 border-b-2 border-black min-h-[40px] flex flex-col justify-center bg-slate-50 print:bg-transparent">
                    <span className="font-bold text-[9px] text-slate-500 uppercase print:text-black">Total Amount in Words:</span>
                    <p className="font-black italic capitalize text-xs mt-0.5">{amountToWords(grandTotal)}</p>
                </div>
                <div className="p-2 border-b-2 border-black">
                    <p className="font-black uppercase underline text-[9px] mb-1">Bank Details</p>
                    <div className="grid grid-cols-[60px_1fr] gap-y-0.5 text-[9px] font-bold uppercase leading-tight">
                        <span>Name:</span> <span>{companyDetails?.company_name || "JKSH FOOD ENTERPRISES"}</span>
                        <span>Bank:</span> <span>{companyDetails?.bank_name || "AXIS BANK BASHEERBAGH"}</span>
                        <span>A/c No:</span> <span>{companyDetails?.bank_acc_no || "920020057250778"}</span>
                        <span>IFSC:</span> <span>{companyDetails?.bank_ifsc || "UTIB0001380"}</span>
                    </div>
                </div>
                <div className="p-2 flex-1">
                    <p className="font-black uppercase underline text-[9px] mb-1">Terms & Conditions</p>
                    <ol className="list-decimal list-inside text-[8px] font-bold leading-tight text-slate-600 uppercase print:text-black">
                        {termsList.map((term, i) => (<li key={i}>{term.replace(/^\d+\)\s*/, '')}</li>))}
                    </ol>
                </div>
            </div>
            <div className="w-[40%] flex flex-col text-[10px]">
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">Taxable Amount</span><span className="font-bold">₹{taxableAmount.toFixed(2)}</span></div>
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">CGST</span><span className="font-bold">₹{cgst.toFixed(2)}</span></div>
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">SGST</span><span className="font-bold">₹{sgst.toFixed(2)}</span></div>
                <div className="flex justify-between p-1.5 border-b-2 border-black"><span className="font-bold text-slate-600 uppercase print:text-black">Round Off</span><span className="font-bold">{data.roundOff >= 0 ? '+' : ''} ₹{data.roundOff?.toFixed(2) || "0.00"}</span></div>
                <div className="flex justify-between p-3 border-b-2 border-black bg-slate-200 print:bg-gray-200"><span className="font-black uppercase text-sm">Total Amount</span><span className="font-black text-sm">₹{grandTotal}</span></div>
                <div className="flex justify-between p-2 border-b-2 border-black"><span className="font-bold uppercase text-slate-600 print:text-black">Received Amount</span><span className="font-bold">₹{grandTotal}</span></div>
                <div className="flex-1 flex flex-col justify-end p-4 text-center min-h-[100px]"><p className="font-black border-t border-black pt-1 uppercase text-[9px]">Authorized Signature</p></div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null); 
  const [isCentral, setIsCentral] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // States
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Status States
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [stockAlert, setStockAlert] = useState({ show: false, itemName: "", maxAvailable: 0, unit: "" });
  
  // Print States
  const [printData, setPrintData] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  // --- TOAST SYSTEM ---
  const addToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoadingStocks(true);
    setFetchError(false);
    try {
      // 1. User/Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profileData) {
          setProfile(profileData);
          if (profileData.role === 'central' || profileData.franchise_id === 'CENTRAL') {
            setIsCentral(true);
          }
        }
      }

      // 2. Company Details
      const { data: companyData } = await supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (companyData) setCompanyDetails(companyData);

      // 3. Stocks
      const { data: stockData, error: stockError } = await supabase.from("stocks").select("*").eq('online_store', true).order("item_name");
      if (stockError) throw stockError;

      const stocks = stockData || [];
      setStocks(stocks);

      // Initialize Inputs
      const units = {};
      const initialQtys = {};
      stocks.forEach(item => {
        units[item.id] = item.unit || 'pcs';
        initialQtys[item.id] = 0;
      });
      setSelectedUnit(units);
      setQtyInput(initialQtys);

    } catch (err) {
      console.error("Critical Fetch Error:", err);
      setFetchError(true);
      addToast('error', 'Connection Failed', 'Could not load inventory. Please check your internet.');
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- HANDLERS ---
  const handleNotifyMe = async (item) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addToast('error', 'Login Required', 'You must be logged in to request stock.');
        return;
      }
      const { error } = await supabase.from("stock_requests").insert([{
        stock_id: item.id,
        item_name: item.item_name,
        franchise_id: profile?.franchise_id || "N/A",
        user_id: user.id,
        user_name: profile?.name || "Unknown User",
        status: 'pending'
      }]);
      if (error) throw error;
      addToast('success', 'Request Sent', `Admin notified for ${item.item_name}`);
    } catch (error) {
      addToast('error', 'Request Failed', error.message);
    }
  };

  const handleQtyInputChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
    const currentVal = qtyInput[itemId] || 0;

    let numVal;
    if (isStepButton) {
      if (isGrams) {
        if (direction === 1) numVal = currentVal < 0 ? 0 : currentVal + 50;
        else numVal = currentVal <= 0 ? 0 : currentVal - 50;
      } else {
        numVal = direction === 1 ? currentVal + 1 : Math.max(0, currentVal - 1);
      }
    } else {
      numVal = val === "" ? 0 : Number(val);
    }

    const factor = getConversionFactor(unit);
    const requestedBaseQty = parseFloat((numVal * factor).toFixed(3));
    const availableBaseQty = parseFloat(Number(item.quantity).toFixed(3));

    if (requestedBaseQty > availableBaseQty) {
      setStockAlert({ show: true, itemName: item.item_name, maxAvailable: availableBaseQty, unit: item.unit });
      numVal = Math.floor((availableBaseQty / factor) * 1000) / 1000;
    }

    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
  };

  const handleAddToCart = (itemId) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    const numVal = qtyInput[itemId];
    if (!numVal || numVal <= 0) {
        addToast('error', 'Invalid Quantity', 'Please enter a valid quantity greater than 0');
        return;
    }

    const unit = selectedUnit[itemId] || item.unit;
    const factor = getConversionFactor(unit);
    const finalBaseQty = numVal * factor;

    setCart(prev => {
      const exists = prev.find(c => c.id === itemId);
      let newCart;
      if (exists) {
        newCart = prev.map(c => c.id === itemId ? { ...c, qty: finalBaseQty, displayQty: numVal, cartUnit: unit } : c);
        addToast('success', 'Cart Updated', `${item.item_name} updated to ${numVal} ${unit}`);
      } else {
        newCart = [...prev, { ...item, qty: finalBaseQty, displayQty: numVal, cartUnit: unit }];
        addToast('success', 'Added to Cart', `${item.item_name} added successfully`);
      }
      return newCart;
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
  };

  // --- ORDER LOGIC ---
  const calculations = useMemo(() => {
    const details = cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      const gstRate = item.gst_rate || 0; 
      const itemGstAmt = itemSubtotal * (gstRate / 100);
      return { ...item, preciseSubtotal: itemSubtotal, preciseGst: itemGstAmt, hsn_code: item.hsn_code };
    });
    const totalSubtotal = details.reduce((acc, curr) => acc + curr.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, curr) => acc + curr.preciseGst, 0);
    const exactBill = totalSubtotal + totalGst;
    const roundedBill = Math.round(exactBill);
    return { items: details, subtotal: totalSubtotal, totalGst: totalGst, exactBill: exactBill, roundedBill: roundedBill, roundOff: roundedBill - exactBill };
  }, [cart]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setProcessingOrder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("User session expired. Please log in again.");

      const orderItems = cart.map(item => ({
        stock_id: item.id,
        item_name: item.item_name,
        quantity: item.qty,
        unit: item.cartUnit,
        price: item.price
      }));

      // Snapshot for print
      const snapshotCalculations = { ...calculations };
      setPrintData(snapshotCalculations);

      const { data: result, error } = await supabase.rpc('place_stock_order', {
        p_total_amount: calculations.roundedBill,
        p_created_by: user.id,
        p_customer_name: profile?.name || "Unknown",
        p_customer_email: profile?.email || null,
        p_customer_phone: profile?.phone || null,
        p_customer_address: profile?.address || null,
        p_branch_location: profile?.branch_location || "",
        p_franchise_id: profile?.franchise_id || null,
        p_items: orderItems
      });

      if (error) throw error;

      setLastOrderId(result?.order_id || "INV-" + Date.now());
      addToast('success', 'Order Successful!', 'Preparing invoice for print...');
      
      // Delay to ensure DOM update
      setTimeout(() => {
        window.print();
        setCart([]); 
        setQtyInput({}); 
        setIsCartOpen(false); 
        fetchData(); // Refresh stock levels
      }, 800);

    } catch (error) {
      console.error(error);
      addToast('error', 'Order Failed', error.message || 'Something went wrong processing your order.');
    } finally {
      setProcessingOrder(false);
    }
  };

  // --- FILTERS ---
  const dynamicCategories = useMemo(() => {
    const uniqueCats = [...new Set(stocks.map(s => s.category).filter(Boolean))];
    return ["All", ...uniqueCats.sort()];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.item_code && item.item_code.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesAvailability = showOnlyAvailable ? item.quantity > 0 : true;
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [stocks, search, selectedCategory, showOnlyAvailable]);

  // --- RENDER ---
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Print Section (Hidden on screen) */}
      <div className="print-only hidden print:block">
        <FullPageInvoice data={printData} profile={profile} orderId={lastOrderId} companyDetails={companyDetails} />
      </div>

      <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-black relative">
        {/* Cart Drawer */}
        {isCartOpen && (
            <>
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                <div className="fixed inset-y-0 right-0 z-[70] w-full md:w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-white">
                        <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2"><FiShoppingCart /> Your Order ({cart.length})</h2>
                        <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FiX size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4">
                                <FiShoppingCart size={48} />
                                <p className="text-xs font-black uppercase tracking-widest">Cart is Empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex gap-4 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black uppercase mb-1">{item.item_name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.displayQty} {item.cartUnit}</p>
                                        <p className="text-sm font-black mt-2">₹{(item.price * item.qty).toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="self-center p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><FiTrash2 size={18} /></button>
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                    <div className="p-6 border-t-2 border-slate-100 bg-white">
                        <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Subtotal</span><span className="text-black">₹{calculations.subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>GST</span><span className="text-black">+ ₹{calculations.totalGst.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Round Off</span><span className="text-black">{calculations.roundOff >= 0 ? '+' : ''} ₹{calculations.roundOff.toFixed(2)}</span></div>
                            <div className="h-px bg-slate-200 my-2"></div>
                            <div className="flex justify-between items-center text-sm font-black uppercase"><span>Total Payable</span><span className="text-xl">₹{calculations.roundedBill}</span></div>
                        </div>
                        <button onClick={handlePlaceOrder} disabled={processingOrder} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {processingOrder ? <span className="animate-spin text-lg"><FiRefreshCw /></span> : <FiCheck size={16}/>} 
                            {processingOrder ? "Processing..." : "Confirm & Print Invoice"}
                        </button>
                    </div>
                    )}
                </div>
            </>
        )}

        {/* Stock Alert Modal */}
        {stockAlert.show && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-rose-500 text-center animate-in zoom-in-95 duration-200">
                    <FiAlertTriangle size={40} className="text-rose-600 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase mb-2 text-black">Limit Reached</h3>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6 uppercase">
                        Available Stock: <span className="text-black font-black">{stockAlert.maxAvailable} {stockAlert.unit}</span>
                        <br/><span className="text-[10px]">Adjusting quantity automatically.</span>
                    </p>
                    <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs active:scale-95 transition-all hover:bg-slate-900">Understood</button>
                </div>
            </div>
        )}

        {/* Sticky Header */}
        <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between shadow-sm transition-all">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-all">
                <FiArrowLeft size={18} /> <span>Back</span>
            </button>
            <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black text-center absolute left-1/2 -translate-x-1/2">Inventory</h1>
            <div className="flex items-center gap-3">
                {/* UPDATED: Removed 'hidden' class so ID shows on mobile */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID :</span>
                    <span className="text-[10px] sm:text-xs font-black text-black bg-white border border-slate-200 px-2 sm:px-3 py-1 rounded-lg shadow-sm">{profile?.franchise_id || "..."}</span>
                </div>
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 md:p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-black transition-all shadow-sm text-black group active:scale-95">
                    <FiShoppingCart size={20} className="md:w-5 md:h-5" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 text-white text-[9px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-in zoom-in" style={{ backgroundColor: BRAND_COLOR }}>{cart.length}</span>
                    )}
                </button>
            </div>
        </nav>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-6 md:mt-8">
            {/* Filters */}
            <div className="sticky top-16 md:top-20 z-30 bg-[#F8F9FA]/95 backdrop-blur-sm py-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative w-full md:flex-1 group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={16} />
                        <input placeholder="SEARCH ITEM NAME OR CODE..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-12 md:h-14 pl-10 md:pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] md:text-sm outline-none focus:border-black transition-all text-black font-black placeholder:text-slate-300 uppercase shadow-sm focus:shadow-md" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                        <button onClick={() => setShowOnlyAvailable(!showOnlyAvailable)} className={`flex items-center gap-2 px-4 h-12 md:h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm whitespace-nowrap flex-shrink-0 active:scale-95 ${showOnlyAvailable ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-100 text-slate-400 hover:border-black"}`}>
                            <FiFilter size={14} className={showOnlyAvailable ? "text-emerald-600" : "text-slate-300"} />
                            <span className="hidden sm:inline">Show Available Only</span><span className="sm:hidden">Available</span>
                        </button>
                        <div className="flex items-center gap-2 bg-white px-4 h-12 md:h-14 rounded-2xl border-2 border-slate-100 shadow-sm font-black text-xs uppercase text-black flex-shrink-0 whitespace-nowrap"><FiCalendar size={16} className="opacity-40" /> {today}</div>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar touch-pan-x">
                    {dynamicCategories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap flex-shrink-0 active:scale-95 ${selectedCategory === cat ? "text-white border-transparent shadow-md transform scale-105" : "bg-white text-black border-slate-100 hover:border-black shadow-sm"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}} >{cat}</button>
                    ))}
                </div>
            </div>

            {/* ERROR STATE */}
            {fetchError && !loadingStocks && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-red-50 p-6 rounded-full mb-4"><FiAlertTriangle size={48} className="text-red-500" /></div>
                    <h3 className="text-xl font-black uppercase text-slate-700 mb-2">Connection Failed</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-6">Unable to load inventory data.</p>
                    <button onClick={fetchData} className="px-8 py-3 bg-black text-white font-black uppercase text-xs rounded-xl hover:opacity-80 transition-all flex items-center gap-2"><FiRefreshCw /> Retry</button>
                </div>
            )}

            {/* LOADING STATE */}
            {loadingStocks && !fetchError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
                    {[...Array(8)].map((_, i) => <StockSkeleton key={i} />)}
                </div>
            )}

            {/* EMPTY STATE */}
            {!loadingStocks && !fetchError && filteredStocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 p-6 rounded-full mb-4 grayscale opacity-50"><FiSearch size={48} className="text-slate-400" /></div>
                    <h3 className="text-xl font-black uppercase text-slate-700 mb-2">No Items Found</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">Try adjusting your search or filters.</p>
                </div>
            )}

            {/* GRID */}
            {!loadingStocks && !fetchError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
                {filteredStocks.map((item) => {
                    const isOutOfStock = item.quantity <= 0;
                    const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
                    const isInCart = cart.some(c => c.id === item.id);
                    const currentQty = qtyInput[item.id] || 0;

                    return (
                    <div key={item.id} className={`relative bg-white p-4 md:p-5 rounded-2xl transition-all flex flex-col border-2 group ${isOutOfStock ? 'border-slate-100 bg-slate-50/50' : isInCart ? `border-emerald-500 shadow-lg ring-1 ring-emerald-500` : 'border-slate-200 hover:border-black hover:shadow-xl'}`}>
                        {isInCart && (<div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 animate-in zoom-in"><FiCheck size={10} /> Added</div>)}
                        <span className="text-[9px] font-black uppercase text-slate-400 mb-1">CODE: {item.item_code || '---'}</span>
                        <h3 className="font-black text-sm md:text-base uppercase text-black leading-tight mb-3 line-clamp-2 min-h-[40px] group-hover:text-emerald-800 transition-colors">{item.item_name}</h3>
                        <div className="mb-4">
                            <p className="text-lg md:text-xl font-black text-black">₹{item.price}<span className="ml-1 text-[10px] font-black text-black opacity-40 uppercase">/ {item.unit}</span></p>
                            {isCentral && (<p className={`text-[9px] font-black mt-1 uppercase tracking-wider ${isOutOfStock ? 'text-rose-500' : 'text-emerald-700'}`}>{isOutOfStock ? "OUT OF STOCK" : `Stock: ${item.quantity} ${item.unit}`}</p>)}
                        </div>
                        <div className="mt-auto space-y-3">
                            {!isOutOfStock ? (
                                <>
                                <div className="flex items-center gap-2 h-10">
                                    <div className={`flex flex-1 items-center border-2 rounded-lg h-full overflow-hidden bg-white transition-colors ${isInCart ? 'border-emerald-200' : 'border-slate-200 group-hover:border-slate-300'}`}>
                                        <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, -1)} className="w-10 h-full flex items-center justify-center border-r border-slate-100 active:bg-slate-100 text-black hover:bg-slate-50"><FiMinus size={12} /></button>
                                        <input type="number" value={qtyInput[item.id] || ""} placeholder="0" onChange={(e) => handleQtyInputChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black text-sm outline-none bg-transparent text-black" />
                                        <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, 1)} className="w-10 h-full flex items-center justify-center border-l border-slate-100 active:bg-slate-100 text-black hover:bg-slate-50"><FiPlus size={12} /></button>
                                    </div>
                                    <div className="relative h-full">
                                        <select value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="w-16 bg-slate-50 border-2 border-slate-200 rounded-lg h-full px-1 text-[9px] font-black uppercase outline-none focus:border-black appearance-none text-center cursor-pointer text-black hover:bg-slate-100 transition-colors">
                                            <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                                            {item.alt_unit && item.alt_unit !== item.unit && (<option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {isInCart ? (
                                    <button onClick={() => handleAddToCart(item.id)} className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white hover:opacity-90 active:scale-95 bg-emerald-600 shadow-md">Update Cart</button>
                                ) : (
                                    <button onClick={() => handleAddToCart(item.id)} disabled={currentQty <= 0} className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-95 shadow-md hover:shadow-lg disabled:shadow-none" style={{ backgroundColor: BRAND_COLOR }}>Add to Cart</button>
                                )}
                                </>
                            ) : (
                                <button onClick={() => handleNotifyMe(item)} className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-rose-600 border-2 border-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center gap-2"><FiBell size={14} /> Notify Restock</button>
                            )}
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
            body { overflow: hidden; height: 100%; }
            .min-h-screen { display: none !important; }
            .print-only { 
                visibility: visible; position: fixed; left: 0; top: 0; 
                width: 210mm; height: 297mm; padding: 10mm; 
                box-sizing: border-box; display: block !important; 
                background: white; z-index: 9999; overflow: hidden; 
            }
            .print-only .h-full { height: 100% !important; max-height: 277mm; }
            @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}

export default StockOrder;