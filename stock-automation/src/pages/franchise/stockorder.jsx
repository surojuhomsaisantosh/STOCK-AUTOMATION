import { useEffect, useState, useMemo, useCallback, useRef } from "react"; 
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiShoppingCart, 
  FiAlertTriangle, FiX, FiCheck, FiFilter, FiBell, 
  FiMinus, FiPlus, FiTrash2, FiRefreshCw, FiPrinter, FiDownload
} from "react-icons/fi";

// --- ASSETS ---
// Ensure these paths are correct in your project structure
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";

// --- CONSTANTS ---
const BRAND_COLOR = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 12; 
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID; 

// --- UTILS ---

// Standardized Currency Formatter (INR)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const getConversionFactor = (unit) => {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();
  if (["g", "gram", "grams", "gm", "gms"].includes(u)) return 0.001;
  if (["ml", "milliliter"].includes(u)) return 0.001;
  return 1;
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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

// --- SUB-COMPONENTS ---

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none items-start print:hidden">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl border-l-4 flex items-start gap-3 animate-in slide-in-from-left duration-300 bg-white ${
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

const StockSkeleton = () => (
  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-3 animate-pulse">
    <div className="h-3 w-1/3 bg-slate-100 rounded-md"></div>
    <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
    <div className="h-8 w-1/2 bg-slate-100 rounded-md mt-2"></div>
    <div className="mt-auto h-10 w-full bg-slate-100 rounded-xl"></div>
  </div>
);

const FullPageInvoice = ({ data, profile, orderId, companyDetails, pageIndex, totalPages, itemsChunk }) => {
  if (!data) return null;

  const companyName = companyDetails?.company_name || ""; 
  const parentComp = companyDetails?.parent_company || "";
  const isTLeaf = parentComp.toLowerCase().includes("leaf");
  const currentLogo = isTLeaf ? tleafLogo : tvanammLogo;
  const dateObj = new Date();
  const invDate = dateObj.toLocaleDateString('en-GB');

  const taxableAmount = data.subtotal || 0;
  const cgst = (data.totalGst || 0) / 2;
  const sgst = (data.totalGst || 0) / 2;

  return (
    <div className="w-full bg-white text-black font-sans p-8 print:p-6 box-border text-xs leading-normal h-full relative print:break-after-page print:h-[297mm]">
      <div className="w-full border-2 border-black flex flex-col relative h-full">
        <div className="p-4 border-b-2 border-black relative">
            <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
                <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4">TAX INVOICE</h1>
            </div>
             {totalPages > 1 && (
              <div className="absolute top-2 right-2 text-[10px] font-black uppercase">
                Page {pageIndex + 1} of {totalPages}
              </div>
            )}
            <div className="flex justify-between items-center mt-6 pt-4">
                <div className="text-left z-10 w-[55%]">
                    <div className="font-bold leading-relaxed text-[10px]">
                        <span className="uppercase underline mb-1 block text-slate-500 font-black">Registered Office:</span>
                        <p className="whitespace-pre-wrap break-words">{companyDetails?.company_address || ""}</p>
                        <div className="mt-2 space-y-0.5">
                            {companyDetails?.company_gst && <p>GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
                            {companyDetails?.company_email && <p>Email: {companyDetails.company_email}</p>}
                        </div>
                    </div>
                </div>
                <div className="z-10 flex flex-col items-center text-center max-w-[40%]">
                    <img src={currentLogo} alt="Logo" className="h-16 w-auto object-contain mb-1" loading="eager" />
                    <h2 className="text-lg font-black uppercase text-[#006437] break-words text-center">{companyName}</h2>
                </div>
            </div>
        </div>
        <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent">
            <div className="w-1/2 border-r-2 border-black p-2">
                <span className="font-bold text-slate-500 uppercase text-[9px] print:text-black">Invoice No:</span>
                <p className="font-black text-sm">#{orderId || 'PENDING'}</p>
            </div>
            <div className="w-1/2 p-2">
                <span className="font-bold text-slate-500 uppercase text-[9px] print:text-black">Invoice Date:</span>
                <p className="font-black text-sm">{invDate}</p>
            </div>
        </div>
        <div className="flex border-b-2 border-black">
            <div className="w-[70%] p-3 border-r-2 border-black">
                <span className="font-black uppercase underline text-[10px] tracking-widest text-slate-500 mb-2 block print:text-black">Bill To:</span>
                <h3 className="text-sm font-black uppercase text-black leading-tight">{profile?.name || ""}</h3>
                <p className="font-bold text-[10px] mt-1 text-black uppercase leading-relaxed whitespace-pre-wrap break-words">
                    {profile?.address || ""}<br/>
                    {profile?.city ? `${profile.city}` : ''} {profile?.state ? `, ${profile.state}` : ''} {profile?.pincode ? ` - ${profile.pincode}` : ''}
                </p>
            </div>
            <div className="w-[30%] p-3 flex flex-col justify-center pl-4">
                <div className="mb-2"><span className="text-[10px] font-bold text-black uppercase block mb-1">ID: </span><span className="text-sm font-black text-black block">{profile?.franchise_id || ""}</span></div>
                {profile?.phone && (<div><span className="text-[10px] font-bold text-black uppercase block mb-1">Ph: </span><span className="text-sm font-black text-black block">{profile.phone}</span></div>)}
            </div>
        </div>
        <div className="flex-1 border-b-2 border-black relative">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-[10px] border-b-2 border-black print:bg-gray-100">
                    <tr>
                        <th className="p-2 border-r-2 border-black w-10 text-center">S.No</th>
                        <th className="p-2 border-r-2 border-black">Item Description</th>
                        <th className="p-2 border-r-2 border-black w-20 text-center">HSN</th>
                        <th className="p-2 border-r-2 border-black w-14 text-center">Qty</th>
                        <th className="p-2 border-r-2 border-black w-20 text-right">Rate</th>
                        <th className="p-2 border-r-2 border-black w-12 text-right">Tax</th>
                        <th className="p-2 w-24 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-[10px] font-bold">
                    {itemsChunk.map((item, idx) => (
                        <tr key={idx} className="h-[35px]">
                            <td className="p-2 border-r-2 border-b border-black text-center">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                            <td className="p-2 border-r-2 border-b border-black uppercase truncate max-w-[200px]">{item.item_name}</td>
                            <td className="p-2 border-r-2 border-b border-black text-center">{item.hsn_code || '-'}</td> 
                            <td className="p-2 border-r-2 border-b border-black text-center">{item.displayQty || item.quantity} {item.cartUnit}</td>
                            <td className="p-2 border-r-2 border-b border-black text-right">{formatCurrency(item.price)}</td>
                            <td className="p-2 border-r-2 border-b border-black text-right">{item.gst_rate || 0}%</td>
                            <td className="p-2 border-b border-black text-right">{formatCurrency(item.preciseSubtotal)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex border-t-2 border-black mt-auto">
            <div className="w-[60%] border-r-2 border-black flex flex-col">
                <div className="p-2 border-b-2 border-black min-h-[40px] flex flex-col justify-center bg-slate-50 print:bg-transparent">
                    <span className="font-bold text-[9px] text-slate-500 uppercase print:text-black">Total Amount in Words:</span>
                    <p className="font-black italic capitalize text-sm mt-0.5">{amountToWords(data.roundedBill || 0)}</p>
                </div>
                <div className="p-3 border-b-2 border-black">
                    <p className="font-black uppercase underline text-xs mb-2">Bank Details</p>
                    <div className="grid grid-cols-[70px_1fr] gap-y-1 text-xs font-bold uppercase leading-tight">
                        <span>Name:</span> <span>{companyDetails?.company_name || ""}</span>
                        <span>Bank:</span> <span>{companyDetails?.bank_name || ""}</span>
                        <span>A/c No:</span> <span>{companyDetails?.bank_acc_no || ""}</span>
                        <span>IFSC:</span> <span>{companyDetails?.bank_ifsc || ""}</span>
                    </div>
                </div>
                <div className="p-3 flex-1">
                    <p className="font-black uppercase underline text-xs mb-2">Terms & Conditions</p>
                    <ol className="list-decimal list-inside text-[10px] font-bold leading-tight text-black uppercase print:text-black space-y-0.5">
                        {companyDetails?.terms ? companyDetails.terms.split('\n').filter(t => t.trim() !== '').map((term, i) => (<li key={i}>{term.replace(/^\d+\)\s*/, '')}</li>)) : <li className="list-none"></li>}
                    </ol>
                </div>
            </div>
            <div className="w-[40%] flex flex-col text-[10px]">
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">Taxable Amount</span><span className="font-bold">{formatCurrency(taxableAmount)}</span></div>
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">CGST</span><span className="font-bold">{formatCurrency(cgst)}</span></div>
                <div className="flex justify-between p-1.5 border-b border-black"><span className="font-bold text-slate-600 uppercase print:text-black">SGST</span><span className="font-bold">{formatCurrency(sgst)}</span></div>
                <div className="flex justify-between p-1.5 border-b-2 border-black"><span className="font-bold text-slate-600 uppercase print:text-black">Round Off</span><span className="font-bold">{data.roundOff >= 0 ? '+' : ''} {formatCurrency(Math.abs(data.roundOff))}</span></div>
                <div className="flex justify-between p-3 border-b-2 border-black bg-slate-200 print:bg-gray-200"><span className="font-black uppercase text-base">Total Amount</span><span className="font-black text-base">{formatCurrency(data.roundedBill || 0)}</span></div>
                <div className="flex justify-between p-2 border-b-2 border-black"><span className="font-bold uppercase text-slate-600 print:text-black">Received Amount</span><span className="font-bold">{formatCurrency(data.roundedBill || 0)}</span></div>
                <div className="flex-1 flex flex-col justify-end p-4 text-center min-h-[80px]"><p className="font-black border-t border-black pt-1 uppercase text-[9px]">Authorized Signature</p></div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
function StockOrder() {
  const navigate = useNavigate();
  // State
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null); 
  const [isCentral, setIsCentral] = useState(false);
  
  // Filter & Search State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Performance: Debounce search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  
  // Interaction State
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [stockAlert, setStockAlert] = useState({ show: false, itemName: "", maxAvailable: 0, unit: "" });
  const [printData, setPrintData] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
   
  // --- PERSISTENT CART STATE ---
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("stockOrderCart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Failed to load cart", e);
      return [];
    }
  });

  // --- PERSISTENT NOTIFIED ITEMS STATE ---
  const [notifiedItems, setNotifiedItems] = useState(() => {
    try {
        const saved = localStorage.getItem("notifiedStockItems");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
        return new Set();
    }
  });

  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  // --- EFFECTS ---

  // Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [search]);

  // Sync Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem("stockOrderCart", JSON.stringify(cart));
  }, [cart]);

  // Sync Notified Items to LocalStorage
  useEffect(() => {
    localStorage.setItem("notifiedStockItems", JSON.stringify([...notifiedItems]));
  }, [notifiedItems]);

  // Scroll Lock
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen]);

  // --- HELPERS ---

  const addToast = useCallback((type, title, message) => {
    const id = Date.now();
    const duration = type === 'error' && title === 'Database Error' ? 20000 : 4000;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const fetchData = useCallback(async () => {
    setLoadingStocks(true);
    try {
      if (!RAZORPAY_KEY_ID) {
        console.warn('RAZORPAY_KEY_ID is missing');
        addToast('error', 'Config Error', 'Payment key missing. Contact Admin.');
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profileData) {
          setProfile(profileData);
          if (profileData.role === 'central' || profileData.franchise_id === 'CENTRAL') setIsCentral(true);
        }
      }
      
      const { data: companyData } = await supabase.from('companies').select('*').limit(1).single();
      if (companyData) setCompanyDetails(companyData);

      const { data: stockData } = await supabase.from("stocks").select("*").eq('online_store', true).order("item_name");
      setStocks(stockData || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      addToast('error', 'Fetch Error', 'Failed to sync with inventory.');
    } finally {
      setLoadingStocks(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- MEMOIZED CALCULATIONS ---

  const sortedCategories = useMemo(() => {
    const uniqueCats = [...new Set(stocks.map(s => s.category).filter(Boolean))].sort();
    return ["All", ...uniqueCats];
  }, [stocks]);

  const calculations = useMemo(() => {
    const details = cart.map(item => {
      const subtotal = item.price * item.qty;
      const gstAmt = subtotal * ((item.gst_rate || 0) / 100);
      return { ...item, preciseSubtotal: subtotal, preciseGst: gstAmt };
    });
    const totalSub = details.reduce((acc, c) => acc + c.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, c) => acc + c.preciseGst, 0);
    const exactBill = parseFloat((totalSub + totalGst).toFixed(2));
    const roundedBill = Math.ceil(exactBill);
    return { items: details, subtotal: totalSub, totalGst, roundedBill, roundOff: roundedBill - exactBill };
  }, [cart]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(item => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch = item.item_name.toLowerCase().includes(query) || (item.item_code?.toLowerCase().includes(query));
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesAvailability = showOnlyAvailable ? item.quantity > 0 : true;
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [stocks, debouncedSearch, selectedCategory, showOnlyAvailable]);

  // --- HANDLERS ---

  const handleQtyInputChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const currentVal = qtyInput[itemId] || 0;
    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
     
    let numVal;
    if (isStepButton) {
      if (isGrams) numVal = direction === 1 ? currentVal + 50 : Math.max(0, currentVal - 50);
      else numVal = direction === 1 ? currentVal + 1 : Math.max(0, currentVal - 1);
    } else {
      // Prevent negative input
      numVal = val === "" ? 0 : Math.max(0, Number(val));
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

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const handleAddToCart = (itemId) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const numVal = qtyInput[itemId];
    if (!numVal || numVal <= 0) { 
        return addToast('error', 'Invalid Quantity', 'Please enter a valid amount.'); 
    }
    const unit = selectedUnit[itemId] || item.unit;
     
    setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: numVal, displayQty: numVal, cartUnit: unit } : i);
        return [...prev, { ...item, qty: numVal, displayQty: numVal, cartUnit: unit }];
    });
  };

  const removeFromCart = (id) => {
      setCart(prev => prev.filter(i => i.id !== id));
      setQtyInput(prev => ({ ...prev, [id]: 0 }));
  };

  const handleNotifyMe = async (item) => {
    if (notifiedItems.has(item.id)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { addToast('error', 'Login Required', 'Please log in to request stock.'); return; }
      
      await supabase.from("stock_requests").insert([{
        stock_id: item.id, item_name: item.item_name,
        franchise_id: profile?.franchise_id || "N/A", user_id: user.id,
        user_name: profile?.name || "Unknown User", status: 'pending'
      }]);

      setNotifiedItems(prev => new Set(prev).add(item.id));
      addToast('success', 'Request Sent', `Admin notified for ${item.item_name}`);
    } catch (error) { addToast('error', 'Request Failed', error.message); }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setProcessingOrder(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("Please log in to continue.");
      if (!profile) throw new Error("User profile not loaded. Please refresh.");

      // Verify stock one last time
      const itemIds = cart.map(i => i.id);
      const { data: liveStocks, error: fetchErr } = await supabase
        .from('stocks')
        .select('id, quantity, item_name')
        .in('id', itemIds);

      if (fetchErr) throw new Error("Could not verify stock availability.");

      for (const item of cart) {
        const liveItem = liveStocks.find(l => l.id === item.id);
        const requestedBaseQty = item.qty * getConversionFactor(item.cartUnit);
        if (!liveItem || liveItem.quantity < requestedBaseQty) { 
           throw new Error(`Item "${item.item_name}" has insufficient stock.`);
        }
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) throw new Error("Payment gateway failed to load.");

      const orderItems = cart.map(i => ({
        stock_id: i.id,
        item_name: i.item_name,
        quantity: i.qty,
        unit: i.cartUnit,
        price: i.price
      }));

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(calculations.roundedBill * 100),
        currency: "INR",
        name: companyDetails?.company_name || "Tvanamm",
        description: `Order for ${profile?.name || 'Franchise'}`,
        notes: {
          user_id: user.id,
          customer_name: profile.name,
          customer_email: profile.email,
          customer_phone: profile.phone,
          customer_address: profile.address || "",
          franchise_id: profile.franchise_id,
          items: JSON.stringify(orderItems)
        },
        handler: async function (response) {
          try {
            const { data: result, error: rpcError } = await supabase.rpc('place_stock_order', {
              p_created_by: user.id,
              p_customer_name: profile.name,
              p_customer_email: profile.email,
              p_customer_phone: profile.phone,
              p_customer_address: profile.address,
              p_branch_location: profile.branch_location || "",
              p_franchise_id: profile.franchise_id,
              p_payment_id: response.razorpay_payment_id,
              p_items: orderItems
            });

            if (rpcError) throw rpcError;

            setLastOrderId(result.order_id);
            setPrintData({ ...calculations, roundedBill: result.real_amount });
            setOrderSuccess(true);
            setProcessingOrder(false);
            addToast('success', 'Order Placed', 'Invoice generated successfully.');
            fetchData(); 
          } catch (err) {
            console.error("Critical Failure:", err);
            addToast('error', 'Database Error', `Payment ID: ${response.razorpay_payment_id}. Screenshot this.`);
            setProcessingOrder(false);
          }
        },
        prefill: { name: profile?.name, email: profile?.email, contact: profile?.phone },
        theme: { color: BRAND_COLOR },
        modal: { ondismiss: () => setProcessingOrder(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      addToast('error', 'Order Blocked', error.message);
      setProcessingOrder(false);
    }
  };

  const closeSuccessModal = () => {
    setOrderSuccess(false);
    setCart([]);
    setQtyInput({});
    setIsCartOpen(false);
    fetchData(); 
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="print-only hidden print:block">
        {orderSuccess && printData && (
          <FullPageInvoice data={printData} profile={profile} orderId={lastOrderId} companyDetails={companyDetails} itemsChunk={printData.items} pageIndex={0} totalPages={1} />
        )}
      </div>

      <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-black relative print:hidden">
        {/* Success Modal */}
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
             <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center relative shadow-2xl">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><FiCheck size={40} /></div>
                <h2 className="text-2xl font-black uppercase mb-2">Order Placed!</h2>
                <p className="text-xl font-bold text-slate-700 mb-2">Thank You!</p>
                <p className="text-slate-500 font-bold text-sm mb-8">Your Invoice #{lastOrderId} is ready.</p>
                <div className="space-y-3">
                    <button onClick={() => window.print()} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors"><FiDownload size={20} /> Download Invoice</button>
                    <button onClick={closeSuccessModal} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-black transition-colors">Close & New Order</button>
                </div>
             </div>
          </div>
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
            <>
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                <div className="fixed inset-y-0 right-0 z-[70] w-full md:w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2"><FiShoppingCart /> Order ({cart.length})</h2>
                        <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><FiX size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                                <FiShoppingCart size={48} />
                                <p className="text-xs font-black uppercase">Cart is Empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex gap-4 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black uppercase mb-1">{item.item_name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.displayQty} {item.cartUnit}</p>
                                        <p className="text-sm font-black mt-2">{formatCurrency(item.price * item.qty)}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl"><FiTrash2 size={18} /></button>
                                </div>
                            ))
                        )}
                    </div>
                    {cart.length > 0 && (
                    <div className="p-6 border-t-2 border-slate-100">
                        <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase">
                            <div className="flex justify-between"><span>Subtotal</span><span className="text-black">{formatCurrency(calculations.subtotal)}</span></div>
                            <div className="flex justify-between"><span>GST</span><span className="text-black">+ {formatCurrency(calculations.totalGst)}</span></div>
                            <div className="flex justify-between"><span>Round Off</span><span className="text-black">{calculations.roundOff >= 0 ? '+' : '-'} {formatCurrency(Math.abs(calculations.roundOff))}</span></div>
                            <div className="h-px bg-slate-200 my-2"></div>
                            <div className="flex justify-between text-sm"><span>Total</span><span className="text-xl">{formatCurrency(calculations.roundedBill)}</span></div>
                        </div>
                        <button onClick={handlePlaceOrder} disabled={processingOrder} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-400 transition-colors">
                            {processingOrder ? <FiRefreshCw className="animate-spin" /> : <FiCheck />} 
                            {processingOrder ? "Processing..." : "Confirm & Pay"}
                        </button>
                    </div>
                    )}
                </div>
            </>
        )}

        {/* Stock Alert Modal */}
        {stockAlert.show && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full border-4 border-rose-500 text-center animate-in zoom-in-95">
                    <FiAlertTriangle size={40} className="text-rose-600 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase mb-2">Limit Reached</h3>
                    <p className="text-slate-500 text-sm font-bold uppercase mb-6">Max Available: {stockAlert.maxAvailable} {stockAlert.unit}</p>
                    <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs">Understood</button>
                </div>
            </div>
        )}

        <header className="sticky top-0 z-50 bg-[#F8F9FA]">
            <nav className="border-b-2 border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-black uppercase text-[10px]"><FiArrowLeft size={18} /> Back</button>
                <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] absolute left-1/2 -translate-x-1/2">Inventory</h1>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-white border px-3 py-1 rounded-lg uppercase">ID: {profile?.franchise_id || '...'}</span>
                    <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white border-2 border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <FiShoppingCart size={20} />
                        {cart.length > 0 && <span className="absolute -top-2 -right-2 text-white text-[9px] font-black h-5 w-5 flex items-center justify-center rounded-full" style={{ backgroundColor: BRAND_COLOR }}>{cart.length}</span>}
                    </button>
                </div>
            </nav>
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input placeholder="SEARCH ITEMS..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-black transition-colors" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setShowOnlyAvailable(!showOnlyAvailable)} className={`px-4 h-12 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center gap-2 ${showOnlyAvailable ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white"}`}><FiFilter /> Available</button>
                        <div className="flex items-center gap-2 bg-white px-4 h-12 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase whitespace-nowrap"><FiCalendar /> {today}</div>
                        <button onClick={fetchData} className="px-4 h-12 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center gap-2 bg-white hover:bg-slate-50"><FiRefreshCw /></button>
                    </div>
                </div>
                {/* --- FORCED SCROLLBAR --- */}
                <div className="flex gap-2 overflow-x-scroll py-4 pb-6 category-scrollbar">
                    {sortedCategories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 w-36 py-2 rounded-lg text-[10px] font-black uppercase border-2 flex items-center justify-center transition-all truncate px-2 ${selectedCategory === cat ? "text-white border-transparent" : "bg-white text-black border-slate-100"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}} >{cat}</button>
                    ))}
                </div>
            </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-2 md:px-6">
            {loadingStocks ? (
                // SKELETON LOADER
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6"><StockSkeleton /><StockSkeleton /><StockSkeleton /><StockSkeleton /></div>
            ) : filteredStocks.length === 0 ? (
                <div className="text-center py-20 uppercase font-black text-slate-400">No items found</div>
            ) : (
                // MAIN GRID
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
                {filteredStocks.map((item) => {
                    const isOutOfStock = item.quantity <= 0;
                    const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
                    const isInCart = cart.some(c => c.id === item.id);
                    const isNotified = notifiedItems.has(item.id);

                    return (
                    <div key={item.id} className={`p-2 md:p-5 rounded-2xl border-2 transition-all flex flex-col bg-white ${isOutOfStock ? 'opacity-100' : isInCart ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-black'}`}>
                        <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black uppercase text-slate-400 truncate max-w-[60px]">{item.item_code}</span>
                            {isCentral && (
                                <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded ${item.quantity > 5 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                    {item.quantity} {item.unit}
                                </span>
                            )}
                        </div>
                        
                        <h3 className="font-black text-xs md:text-sm uppercase mt-1 mb-2 line-clamp-2 h-8 md:h-10 leading-tight" title={item.item_name}>{item.item_name}</h3>
                        <p className="text-sm md:text-xl font-black mb-3">{formatCurrency(item.price)}<span className="text-[9px] opacity-40"> / {item.unit}</span></p>
                         
                        <div className="mt-auto space-y-2">
                            {!isOutOfStock ? (
                                <>
                                <div className="flex items-center gap-1 h-8 md:h-10">
                                    <div className="flex flex-1 items-center border-2 rounded-lg h-full overflow-hidden">
                                        <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, -1)} className="px-2 md:px-3 h-full hover:bg-slate-100 flex items-center justify-center transition-colors"><FiMinus size={10} /></button>
                                        <input 
                                            type="number" 
                                            value={qtyInput[item.id] || ""} 
                                            onChange={(e) => handleQtyInputChange(item.id, e.target.value, item.quantity)} 
                                            className="w-full text-center font-black text-xs outline-none p-0" 
                                            placeholder="0" 
                                            min="0"
                                        />
                                        <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, 1)} className="px-2 md:px-3 h-full hover:bg-slate-100 flex items-center justify-center transition-colors"><FiPlus size={10} /></button>
                                    </div>
                                    <select value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="w-12 md:w-16 border-2 rounded-lg h-full text-[9px] font-black uppercase text-center outline-none bg-white">
                                        <option value={item.unit}>{item.unit}</option>
                                        {item.alt_unit && item.alt_unit !== item.unit && <option value={item.alt_unit}>{item.alt_unit}</option>}
                                    </select>
                                </div>
                                <button onClick={() => handleAddToCart(item.id)} className={`w-full py-2 md:py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 ${isInCart ? 'bg-emerald-600' : ''}`} style={!isInCart ? {backgroundColor: BRAND_COLOR} : {}}>
                                    {isInCart ? "Update" : "Add"}
                                </button>
                                </>
                            ) : (
                                isNotified ? (
                                    <button 
                                        disabled
                                        className="w-full py-2 md:py-3 rounded-xl text-[9px] font-black uppercase border-2 flex items-center justify-center gap-2 transition-colors bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                    >
                                        <FiCheck /> Notified
                                    </button>
                                ) : (
                                    <button 
                                      onClick={() => handleNotifyMe(item)} 
                                      className="w-full py-2 md:py-3 rounded-xl text-[9px] font-black uppercase border-2 flex items-center justify-center gap-2 transition-colors bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                                    >
                                      <FiBell /> Notify
                                    </button>
                                )
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
        @media print {
            body { background: white; }
            .min-h-screen { display: none !important; }
            .print-only { display: block !important; width: 100%; }
            @page { size: A4; margin: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        /* --- HIGH CONTRAST SCROLLBAR STYLES --- */
        .category-scrollbar {
            overflow-x: scroll; /* Force scrollability */
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
            /* Firefox: Explicitly show it with colors */
            scrollbar-width: auto; 
            scrollbar-color: rgb(0, 100, 55) #e2e8f0; 
        }

        /* WEBKIT (Chrome, Safari, Edge, Mobile) */
        .category-scrollbar::-webkit-scrollbar {
            height: 16px; /* INCREASED SIZE to 16px */
            width: 16px;
            display: block; /* Forces display */
            background-color: #e2e8f0; /* Light gray track */
            -webkit-appearance: none;
        }

        .category-scrollbar::-webkit-scrollbar-track {
            background-color: #e2e8f0; 
            border-radius: 8px;
        }

        .category-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgb(0, 100, 55); /* BRAND COLOR */
            border-radius: 8px;
            border: 3px solid #e2e8f0; /* Creates a "pill" effect inside the track */
            min-width: 50px; /* Ensures the thumb is graspable */
        }

        .category-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #004d2a; /* Darker green on hover */
        }
      `}</style>
    </>
  );
}

export default StockOrder;