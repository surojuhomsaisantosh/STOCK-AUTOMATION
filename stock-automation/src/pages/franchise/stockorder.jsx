import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiShoppingCart,
  FiAlertTriangle, FiX, FiCheck, FiFilter, FiBell,
  FiMinus, FiPlus, FiTrash2, FiDownload, FiInfo,
  FiRefreshCw
} from "react-icons/fi";
// --- ASSETS ---
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";

// --- CONSTANTS ---
const BRAND_COLOR = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 15;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// --- UTILS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// --- SESSION STORAGE HELPER ---
const getSessionData = (key, defaultValue) => {
  const stored = sessionStorage.getItem(key);
  if (stored === null) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultValue;
  }
};

const getPriceMultiplier = (baseUnit, selectedUnit) => {
  if (!baseUnit || !selectedUnit || baseUnit === selectedUnit) return 1;

  const b = baseUnit.toLowerCase().trim();
  const s = selectedUnit.toLowerCase().trim();

  const isKg = (u) => u === 'kg' || u === 'kilogram';
  const isG = (u) => ['g', 'gm', 'gms', 'gram', 'grams'].includes(u);
  const isL = (u) => u === 'l' || u === 'ltr' || u === 'liter';
  const isMl = (u) => ['ml', 'milliliter'].includes(u);

  if (isKg(b) && isG(s)) return 0.001;
  if (isG(b) && isKg(s)) return 1000;
  if (isL(b) && isMl(s)) return 0.001;
  if (isMl(b) && isL(s)) return 1000;

  return 1;
};

const getMOQ = (item, currentUnit) => {
  if (!item) return 1;
  if (item.alt_unit && item.alt_unit !== "None" && currentUnit === item.alt_unit) {
    return Number(item.min_order_quantity_alt) || 1;
  }
  return Number(item.min_order_quantity) || 1;
};

// --- CORE LOGIC: VALIDATE AND CLAMP QUANTITY ---
const validateAndClampQty = (item, requestedQty, inputUnit) => {
  const factor = getPriceMultiplier(item.unit, inputUnit);
  const availableStock = Number(item.quantity);
  const neededBaseQty = requestedQty * factor;

  if (neededBaseQty > availableStock) {
    const maxPossible = Math.floor((availableStock / factor) * 1000) / 1000;
    return { valid: false, clamped: maxPossible, msg: `Limit: ${availableStock} ${item.unit}` };
  }
  return { valid: true, clamped: requestedQty, msg: "" };
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
  // FIXED: Added space before "Rupees" to prevent formatting issues
  return inWords(num) + " Rupees Only";
};

// --- SUB-COMPONENTS ---
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none print:hidden">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 bg-white ${toast.type === 'error' ? 'border-red-100 text-red-600' : 'border-emerald-100 text-emerald-600'}`}
      >
        {toast.type === 'error' ? <FiAlertTriangle className="shrink-0" /> : <FiCheck className="shrink-0" />}
        <p className="text-[11px] font-black uppercase tracking-tight flex-1">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-black transition-colors"><FiX /></button>
      </div>
    ))}
  </div>
);

const StockSkeleton = () => (
  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-3 animate-pulse">
    <div className="h-3 w-1/3 bg-slate-100 rounded-md"></div>
    <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
    <div className="h-20 w-full bg-slate-50 rounded-xl mt-2"></div>
  </div>
);

// --- INVOICE COMPONENT ---
const FullPageInvoice = ({ data, profile, orderId, companyDetails, pageIndex, totalPages, itemsChunk }) => {
  if (!data) return null;
  const companyName = companyDetails?.company_name || "";
  const parentComp = companyDetails?.parent_company || "";
  const isTLeaf = parentComp.toLowerCase().includes("leaf");
  const currentLogo = isTLeaf ? tleafLogo : tvanammLogo;
  const invDate = new Date().toLocaleDateString('en-GB');
  const taxableAmount = data.subtotal || 0;
  const cgst = (data.totalGst || 0) / 2;
  const sgst = (data.totalGst || 0) / 2;

  const emptyRowsCount = Math.max(0, ITEMS_PER_INVOICE_PAGE - itemsChunk.length);

  return (
    <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
      <div className="w-full border-2 border-black flex flex-col relative flex-1">
        {/* Header Section */}
        <div className="p-3 border-b-2 border-black relative">
          <div className="absolute top-2 left-0 w-full text-center pointer-events-none">
            <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4 text-black">TAX INVOICE</h1>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3">
            <div className="text-left z-10 w-[55%]">
              <div className="font-bold leading-relaxed text-[10px]">
                <span className="uppercase underline mb-1 block text-black font-black">Registered Office:</span>
                <p className="whitespace-pre-wrap break-words text-black leading-tight">{companyDetails?.company_address || ""}</p>
                <div className="mt-1 space-y-0.5">
                  {companyDetails?.company_gst && <p className="text-black">GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
                  {companyDetails?.company_email && <p className="text-black">Email: {companyDetails.company_email}</p>}
                </div>
              </div>
            </div>
            <div className="z-10 flex flex-col items-center text-center max-w-[40%]">
              <img src={currentLogo} alt="Logo" className="h-12 w-auto object-contain mb-1" />
              <h2 className="text-base font-black uppercase text-black break-words text-center leading-tight">{companyName}</h2>
            </div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent text-black">
          <div className="w-1/2 border-r-2 border-black py-1 px-3">
            <span className="font-bold text-black uppercase text-[9px]">Invoice No:</span>
            <p className="font-black text-sm text-black">#{orderId || 'PENDING'}</p>
          </div>
          <div className="w-1/2 py-1 px-3">
            <span className="font-bold text-black uppercase text-[9px]">Invoice Date:</span>
            <p className="font-black text-sm text-black">{invDate}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="flex border-b-2 border-black text-black">
          <div className="w-[70%] p-2 border-r-2 border-black">
            <span className="font-black uppercase underline text-[10px] tracking-widest text-black mb-1 block">Bill To:</span>
            <h3 className="text-sm font-black uppercase leading-tight text-black">{profile?.name || ""}</h3>
            <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">
              {profile?.address || ""}<br />
              {profile?.city ? `${profile.city}` : ''} {profile?.state ? `, ${profile.state}` : ''} {profile?.pincode ? ` - ${profile.pincode}` : ''}
            </p>
          </div>
          <div className="w-[30%] p-2 flex flex-col justify-center pl-4 text-black">
            <div className="mb-1.5"><span className="text-[10px] font-bold block mb-0.5">ID: </span><span className="text-sm font-black block text-black leading-none">{profile?.franchise_id || ""}</span></div>
            {profile?.phone && (<div><span className="text-[10px] font-bold block mb-0.5">Ph: </span><span className="text-sm font-black block text-black leading-none">{profile.phone}</span></div>)}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 border-b-2 border-black relative">
          <table className="w-full text-left border-collapse text-black">
            <thead className="bg-slate-100 text-[10px] border-b-2 border-black text-black">
              <tr>
                <th className="py-1 px-2 border-r-2 border-black w-10 text-center">S.No</th>
                <th className="py-1 px-2 border-r-2 border-black">Item Description</th>
                <th className="py-1 px-2 border-r-2 border-black w-14 text-center">Qty</th>
                <th className="py-1 px-2 border-r-2 border-black w-20 text-right">Rate</th>
                <th className="py-1 px-2 border-r-2 border-black w-12 text-center">GST%</th>
                <th className="py-1 px-2 border-r-2 border-black w-16 text-right">GST Amt</th>
                <th className="py-1 px-2 w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-[10px] font-bold text-black">
              {itemsChunk.map((item, idx) => (
                <tr key={idx} className="h-[26px] overflow-hidden">
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[150px] text-black overflow-hidden whitespace-nowrap">{item.item_name}</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{item.displayQty} {item.cartUnit}</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(item.effectivePrice || item.price)}</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{item.gst_rate || 0}%</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(item.preciseGst || 0)}</td>
                  <td className="py-0.5 px-2 border-b border-black text-right text-black">{formatCurrency(item.preciseSubtotal + (item.preciseGst || 0))}</td>
                </tr>
              ))}

              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-[26px]">
                  <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-transparent">-</td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                  <td className="py-0.5 px-2 border-r-2 border-b border-black"></td>
                  <td className="py-0.5 px-2 border-b border-black"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex mt-auto text-black">
          <div className="w-[60%] border-r-2 border-black flex flex-col">
            <div className="py-1.5 px-2 border-b-2 border-black min-h-[30px] flex flex-col justify-center bg-slate-50">
              <span className="font-bold text-[9px] text-black uppercase">Total Amount in Words:</span>
              <p className="font-black italic capitalize text-[10px] mt-0.5 text-black leading-tight">{amountToWords(data.roundedBill || 0)}</p>
            </div>
            <div className="p-2 flex-1 flex flex-col justify-between">
              <div>
                <p className="font-black uppercase underline text-[11px] mb-1.5 text-black">Bank Details</p>
                <div className="grid grid-cols-[50px_1fr] gap-y-0.5 text-[10px] font-bold uppercase text-black leading-tight">
                  <span>Bank:</span> <span className="text-black">{companyDetails?.bank_name || ""}</span>
                  <span>A/c No:</span> <span className="text-black">{companyDetails?.bank_acc_no || ""}</span>
                  <span>IFSC:</span> <span className="text-black">{companyDetails?.bank_ifsc || ""}</span>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-300">
                <p className="font-black uppercase underline text-[10px] mb-1 text-black">Terms & Conditions:</p>
                <p className="text-[8px] text-black whitespace-pre-wrap leading-tight">{companyDetails?.terms || "No terms available."}</p>
              </div>
            </div>
          </div>

          <div className="w-[40%] flex flex-col text-[10px] text-black">
            <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>

            <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Total GST</span><span>{formatCurrency(data.totalGst || 0)}</span></div>
            <div className="flex justify-between py-0.5 px-2 border-b border-slate-300 text-black text-[9px] bg-slate-50 pl-4"><span>CGST</span><span>{formatCurrency(cgst)}</span></div>
            <div className="flex justify-between py-0.5 px-2 border-b border-black text-black text-[9px] bg-slate-50 pl-4"><span>SGST</span><span>{formatCurrency(sgst)}</span></div>

            <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Round Off</span><span>{formatCurrency(data.roundOff || 0)}</span></div>
            <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200 text-black"><span className="font-black uppercase text-black">Total</span><span className="font-black text-black">{formatCurrency(data.roundedBill || 0)}</span></div>
            <div className="flex-1 flex flex-col justify-end p-2 text-center">
              {pageIndex < totalPages - 1 && <p className="text-[8px] mb-1 font-bold italic text-slate-500">Continued on next page...</p>}
              <p className="font-black border-t border-black pt-1 uppercase text-[8px] text-black">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE NUMBER ADDED AT THE BOTTOM RIGHT */}
      <div className="absolute bottom-1 right-2 print:bottom-1.5 print:right-2 text-[9px] font-black text-black">
        Page {pageIndex + 1} of {totalPages}
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [isCentral, setIsCentral] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [toasts, setToasts] = useState([]);

  // --- SESSION STORAGE INITIALIZATION ---
  const [search, setSearch] = useState(() => getSessionData("stock_search", ""));
  const [selectedCategory, setSelectedCategory] = useState(() => getSessionData("stock_category", "All"));
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(() => getSessionData("stock_available", false));

  // --- SESSION STORAGE FOR INPUTS & INVOICE RECOVERY ---
  const [qtyInput, setQtyInput] = useState(() => getSessionData("stock_qty_input", {}));
  const [selectedUnit, setSelectedUnit] = useState(() => getSessionData("stock_selected_unit", {}));

  const [printData, setPrintData] = useState(() => getSessionData("stock_print_data", null));
  const [lastOrderId, setLastOrderId] = useState(() => getSessionData("stock_last_order_id", null));
  const [orderSuccess, setOrderSuccess] = useState(() => getSessionData("stock_order_success", false));

  // --- PREVENT BACKGROUND SCROLLING WHEN MODALS OPEN ---
  useEffect(() => {
    if (isCartOpen || orderSuccess) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen, orderSuccess]);

  // Cart Management (LocalStorage)
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("stockOrderCart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) { return []; }
  });

  const [notifiedItems, setNotifiedItems] = useState(() => {
    try {
      const saved = localStorage.getItem("notifiedStockItems");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) { return new Set(); }
  });

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { sessionStorage.setItem("stock_search", JSON.stringify(search)); }, [search]);
  useEffect(() => { sessionStorage.setItem("stock_category", JSON.stringify(selectedCategory)); }, [selectedCategory]);
  useEffect(() => { sessionStorage.setItem("stock_available", JSON.stringify(showOnlyAvailable)); }, [showOnlyAvailable]);

  useEffect(() => { sessionStorage.setItem("stock_qty_input", JSON.stringify(qtyInput)); }, [qtyInput]);
  useEffect(() => { sessionStorage.setItem("stock_selected_unit", JSON.stringify(selectedUnit)); }, [selectedUnit]);
  useEffect(() => { sessionStorage.setItem("stock_print_data", JSON.stringify(printData)); }, [printData]);
  useEffect(() => { sessionStorage.setItem("stock_last_order_id", JSON.stringify(lastOrderId)); }, [lastOrderId]);
  useEffect(() => { sessionStorage.setItem("stock_order_success", JSON.stringify(orderSuccess)); }, [orderSuccess]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => { localStorage.setItem("stockOrderCart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("notifiedStockItems", JSON.stringify([...notifiedItems])); }, [notifiedItems]);

  const addToast = useCallback((type, title, message, duration = 4000, customId = null) => {
    const id = customId || Date.now();
    setToasts(prev => {
      const others = prev.filter(t => t.id !== id);
      return [...others, { id, type, title, message }];
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoadingStocks(true);
    try {
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

      const { data: stockData } = await supabase.from("stocks")
        .select("*")
        .eq('online_store', true)
        .order("item_name");
      setStocks(stockData || []);
    } catch (err) {
      addToast('error', 'Sync Failed', 'Could not refresh inventory.');
    } finally { setLoadingStocks(false); }
  }, [addToast]);

  useEffect(() => {
    fetchData();
    const stockSubscription = supabase
      .channel('public:stocks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        (payload) => { fetchData(true); }
      )
      .subscribe();

    return () => { supabase.removeChannel(stockSubscription); };
  }, [fetchData]);

  useEffect(() => { loadRazorpayScript(); }, []);

  useEffect(() => {
    if (stocks.length === 0) return;
    setCart(prevCart => {
      let hasChanges = false;
      const updatedCart = prevCart.map(cartItem => {
        const liveItem = stocks.find(s => s.id === cartItem.id);
        if (liveItem) {
          const check = validateAndClampQty(liveItem, cartItem.qty, cartItem.cartUnit);
          if (!check.valid && check.clamped !== cartItem.qty) {
            hasChanges = true;
            return { ...cartItem, qty: check.clamped, displayQty: check.clamped };
          }
        }
        return cartItem;
      }).filter(item => item.qty > 0);

      return hasChanges ? updatedCart : prevCart;
    });
  }, [stocks]);

  const sortedCategories = useMemo(() => {
    const uniqueCats = [...new Set(stocks.map(s => s.category).filter(Boolean))].sort();
    return ["All", ...uniqueCats];
  }, [stocks]);

  const liveCart = useMemo(() => {
    return cart.map(cartItem => {
      const liveData = stocks.find(s => s.id === cartItem.id);
      if (liveData) {
        return {
          ...cartItem,
          ...liveData,
          qty: cartItem.qty,
          displayQty: cartItem.displayQty,
          cartUnit: cartItem.cartUnit
        };
      }
      return cartItem;
    });
  }, [cart, stocks]);

  const calculations = useMemo(() => {
    const details = liveCart.map(item => {
      const multiplier = getPriceMultiplier(item.unit, item.cartUnit);
      const effectivePrice = item.price * multiplier;
      const subtotal = effectivePrice * item.qty;
      const gstAmt = subtotal * ((item.gst_rate || 0) / 100);

      return {
        ...item,
        effectivePrice,
        preciseSubtotal: subtotal,
        preciseGst: gstAmt
      };
    });
    const totalSub = details.reduce((acc, c) => acc + c.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, c) => acc + c.preciseGst, 0);
    const exactBill = parseFloat((totalSub + totalGst).toFixed(2));
    const roundedBill = Math.ceil(exactBill);
    return { items: details, subtotal: totalSub, totalGst, roundedBill, roundOff: roundedBill - exactBill };
  }, [liveCart]);

  const filteredStocks = useMemo(() => {
    const baseList = stocks.filter(item => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch = item.item_name.toLowerCase().includes(query) || item.item_code?.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesAvailability = showOnlyAvailable ? Number(item.quantity) > 0 : true;
      return matchesSearch && matchesCategory && matchesAvailability;
    });
    return baseList.sort((a, b) => {
      if (Number(a.quantity) > 0 && Number(b.quantity) <= 0) return -1;
      if (Number(a.quantity) <= 0 && Number(b.quantity) > 0) return 1;
      return 0;
    });
  }, [stocks, debouncedSearch, selectedCategory, showOnlyAvailable]);

  const handleUnitChange = (itemId, newUnit) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    const newMOQ = getMOQ(item, newUnit);

    const cartItem = cart.find(c => c.id === itemId);

    if (cartItem) {
      let newQty = cartItem.qty;

      if (newQty < newMOQ) {
        newQty = newMOQ;
      }

      const check = validateAndClampQty(item, newQty, newUnit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg, 2000, `limit-${itemId}`);
        newQty = check.clamped;
      }

      if (newQty > 0) {
        setCart(prev => prev.map(c =>
          c.id === itemId ? { ...c, cartUnit: newUnit, qty: newQty, displayQty: newQty } : c
        ));
        setQtyInput(prev => ({ ...prev, [itemId]: newQty }));
      } else {
        setCart(prev => prev.filter(i => i.id !== itemId));
        setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
      }
    } else {
      setQtyInput(prev => ({ ...prev, [itemId]: newMOQ }));
    }
  };

  const handleQtyInputChange = (itemId, val, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    const currentUnit = selectedUnit[itemId] || item.unit;
    const currentVal = qtyInput[itemId] || 0;
    const moq = getMOQ(item, currentUnit);
    const isGrams = ["g", "grams", "gram", "gm", "gms", "ml", "milliliter"].includes(currentUnit.toLowerCase().trim());
    const stepSize = isGrams ? 50 : 1;

    let numVal;
    if (isStepButton) {
      if (direction === 1) numVal = currentVal === 0 ? moq : currentVal + stepSize;
      else numVal = currentVal <= moq ? 0 : Math.max(0, currentVal - stepSize);
    } else {
      numVal = val === "" ? 0 : Math.max(0, Number(val));
    }

    const check = validateAndClampQty(item, numVal, currentUnit);
    if (!check.valid) {
      addToast('error', 'Limit Reached', check.msg, 2000, `limit-${itemId}`);
      numVal = check.clamped;
    }

    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
  };

  const updateCartQty = (itemId, delta) => {
    setCart(prev => {
      let updatedCart = prev.map(item => {
        if (item.id === itemId) {
          const isGrams = ["g", "grams", "gram", "gm", "gms", "ml", "milliliter"].includes(item.cartUnit.toLowerCase().trim());
          const step = isGrams ? 50 : 1;
          const stockItem = stocks.find(s => s.id === itemId);
          const moq = getMOQ(stockItem, item.cartUnit);

          let newQty = delta === 1 ? item.qty + step : (item.qty <= moq ? 0 : item.qty - step);

          if (newQty <= 0) return null;

          if (stockItem) {
            const check = validateAndClampQty(stockItem, newQty, item.cartUnit);
            if (!check.valid) {
              addToast('error', 'Limit Reached', check.msg);
              return { ...item, qty: check.clamped, displayQty: check.clamped };
            }
          }
          return { ...item, qty: newQty, displayQty: newQty };
        }
        return item;
      }).filter(Boolean);

      // FIXED: Also explicitly reset the UI input box to 0 if an item drops out of the cart via minus button
      if (!updatedCart.find(i => i.id === itemId)) {
        setQtyInput(qPrev => ({ ...qPrev, [itemId]: 0 }));
      }

      return updatedCart;
    });
  };

  const handleAddToCart = (itemId) => {
    const item = stocks.find(s => s.id === itemId);
    const isInCart = cart.some(c => c.id === itemId);

    if (isInCart) {
      updateCartQty(itemId, 1);
    } else {
      const unit = selectedUnit[itemId] || item.unit;
      const moq = getMOQ(item, unit);
      const inputQty = qtyInput[itemId];

      let qtyToAdd = (inputQty && inputQty > 0) ? inputQty : moq;

      if (qtyToAdd < moq) {
        addToast('error', 'MOQ Alert', `Minimum order is ${moq} ${unit}`);
        qtyToAdd = moq;
      }

      const check = validateAndClampQty(item, qtyToAdd, unit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg);
        qtyToAdd = check.clamped;
      }

      if (qtyToAdd > 0) {
        setCart(prev => [...prev, { ...item, qty: qtyToAdd, displayQty: qtyToAdd, cartUnit: unit }]);
        setQtyInput(prev => ({ ...prev, [itemId]: qtyToAdd }));
      }
    }
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
    setQtyInput(prev => ({ ...prev, [id]: 0 }));
  };

  const handleManualInputCart = (item, val) => {
    const numVal = val === "" ? 0 : Math.max(0, Number(val));
    if (numVal === 0) {
      removeFromCart(item.id);
      return;
    }

    const stockItem = stocks.find(s => s.id === item.id);
    if (stockItem) {
      const check = validateAndClampQty(stockItem, numVal, item.cartUnit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg, 2000, `limit-${item.id}`);
        setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: check.clamped, displayQty: check.clamped } : c));
        return;
      }
    }

    setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: numVal, displayQty: numVal } : c));
  };

  const handleNotifyMe = async (item) => {
    if (notifiedItems.has(item.id)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return addToast('error', 'Login Required', 'Please log in.');
      await supabase.from("stock_requests").insert([{ stock_id: item.id, item_name: item.item_name, franchise_id: profile?.franchise_id || "N/A", user_id: user.id, user_name: profile?.name || "User", status: 'pending' }]);
      setNotifiedItems(prev => new Set(prev).add(item.id));
      addToast('success', 'Requested', `We'll notify you for ${item.item_name}`);
    } catch (e) { addToast('error', 'Failed', e.message); }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setProcessingOrder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) throw new Error("Authentication failed.");

      const orderItems = calculations.items.map(i => ({
        stock_id: i.id,
        item_name: i.item_name,
        quantity: i.qty,
        unit: i.cartUnit,
        price: i.effectivePrice,
        gst_rate: i.gst_rate
      }));

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) throw new Error("Gateway error.");
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(calculations.roundedBill * 100),
        currency: "INR",
        name: companyDetails?.company_name || "Tvanamm",
        handler: async (response) => {
          const successTime = new Date();
          const formattedTime = successTime.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          });

          const { data: result, error: rpcError } = await supabase.rpc('place_stock_order', {
            p_created_by: user.id,
            p_customer_name: profile.name,
            p_customer_email: profile.email,
            p_customer_phone: profile.phone,
            p_customer_address: profile.address,
            p_branch_location: profile.branch_location || "",
            p_franchise_id: profile.franchise_id,
            p_payment_id: response.razorpay_payment_id,
            p_items: orderItems,
            p_subtotal: calculations.subtotal,
            p_tax_amount: calculations.totalGst,
            p_round_off: calculations.roundOff,
            p_total_amount: calculations.roundedBill,
            p_order_time: formattedTime,
            p_snapshot_company_name: companyDetails?.company_name || "",
            p_snapshot_company_address: companyDetails?.company_address || "",
            p_snapshot_company_gst: companyDetails?.company_gst || "",
            p_snapshot_bank_details: {
              bank_name: companyDetails?.bank_name || "",
              bank_acc_no: companyDetails?.bank_acc_no || "",
              bank_ifsc: companyDetails?.bank_ifsc || ""
            },
            p_snapshot_terms: companyDetails?.terms || ""
          });

          if (rpcError) throw rpcError;

          setLastOrderId(result.order_id);
          setPrintData({ ...calculations, roundedBill: result.real_amount, orderTime: formattedTime });
          setOrderSuccess(true);
          setProcessingOrder(false);
          fetchData();
          setCart([]);
          setQtyInput({});
          setIsCartOpen(false);
        },
        prefill: { name: profile.name, email: profile.email, contact: profile.phone },
        theme: { color: BRAND_COLOR },
        modal: { ondismiss: () => setProcessingOrder(false) }
      };
      new window.Razorpay(options).open();
    } catch (error) {
      addToast('error', 'Order Error', error.message);
      setProcessingOrder(false);
    }
  };

  const printChunks = useMemo(() => {
    if (!printData || !printData.items) return [];
    const chunks = [];
    for (let i = 0; i < printData.items.length; i += ITEMS_PER_INVOICE_PAGE) {
      chunks.push(printData.items.slice(i, i + ITEMS_PER_INVOICE_PAGE));
    }
    return chunks;
  }, [printData]);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="print-only hidden print:block bg-white">
        {orderSuccess && printData && printChunks.map((chunk, index) => (
          <FullPageInvoice
            key={index}
            data={printData}
            profile={profile}
            orderId={lastOrderId}
            companyDetails={companyDetails}
            itemsChunk={chunk}
            pageIndex={index}
            totalPages={printChunks.length}
          />
        ))}
      </div>

      <div className="min-h-[100dvh] bg-[#F3F4F6] pb-24 font-sans text-black relative print:hidden">
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><FiCheck size={40} /></div>
              <h2 className="text-2xl font-black uppercase mb-2">Success!</h2>
              <p className="text-slate-500 font-bold text-xs mb-8">Your order #{lastOrderId} has been placed.</p>
              <div className="space-y-3">
                <button onClick={() => window.print()} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"><FiDownload /> Print Invoice</button>

                <button
                  onClick={() => {
                    setOrderSuccess(false);
                    setPrintData(null);
                    setLastOrderId(null);
                    setCart([]);
                    setQtyInput({});
                    setIsCartOpen(false);

                    sessionStorage.removeItem("stock_print_data");
                    sessionStorage.removeItem("stock_last_order_id");
                    sessionStorage.removeItem("stock_order_success");
                    sessionStorage.removeItem("stock_qty_input");

                    fetchData();
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px]"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="sm:hidden fixed bottom-6 right-6 z-[45] w-14 h-14 bg-black rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-90 hover:scale-105"
          >
            <FiShoppingCart size={24} />
            <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shadow-md border border-white">
              {cart.length}
            </span>
          </button>
        )}

        {isCartOpen && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><FiShoppingCart /> Cart ({cart.length})</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><FiX size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                    <FiShoppingCart size={48} />
                    <p className="text-[11px] font-black uppercase tracking-widest">Cart is empty</p>
                  </div>
                ) : liveCart.map(item => {
                  const multiplier = getPriceMultiplier(item.unit, item.cartUnit);
                  const displayPrice = item.price * multiplier;
                  const cartItemMoq = getMOQ(item, item.cartUnit);
                  const cartItemMoqPrice = displayPrice * cartItemMoq;

                  return (
                    <div key={item.id} className="flex gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm items-center">
                      <div className="flex-1">
                        <h4 className="text-[12px] font-black uppercase leading-tight mb-1">{item.item_name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mb-2">
                          @ {cartItemMoq} {item.cartUnit} = {formatCurrency(cartItemMoqPrice)}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 h-8">
                            <button onClick={() => updateCartQty(item.id, -1)} className="px-3 h-full hover:bg-slate-200"><FiMinus size={12} /></button>
                            <span className="w-8 text-center text-[11px] font-black">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.id, 1)} className="px-3 h-full hover:bg-slate-200"><FiPlus size={12} /></button>
                          </div>
                          <p className="text-sm font-black">{formatCurrency(displayPrice * item.qty)}</p>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><FiTrash2 size={20} /></button>
                    </div>
                  );
                })}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-white shadow-inner">
                  <div className="space-y-2 mb-6 p-4 bg-slate-50 rounded-2xl text-[11px] font-black uppercase">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Total GST</span><span>{formatCurrency(calculations.totalGst)}</span></div>
                    <div className="flex justify-between text-slate-400 border-b border-slate-100 pb-2 mb-2"><span>Round Off</span><span>{formatCurrency(calculations.roundOff)}</span></div>
                    <div className="flex justify-between text-lg pt-1"><span>Total Bill</span><span>{formatCurrency(calculations.roundedBill)}</span></div>
                  </div>

                  <button onClick={handlePlaceOrder} disabled={processingOrder} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                    {processingOrder ? <FiRefreshCw className="animate-spin" /> : <FiCheck size={18} />}
                    {processingOrder ? "Securing Payment..." : "Checkout Now"}
                  </button>

                  <p className="text-[9px] text-slate-400 text-center mt-4 italic flex items-center justify-center gap-1">
                    <FiInfo size={10} /> Detailed tax breakdown & HSN summary available in the downloadable invoice after payment.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- NEW HEADER INTEGRATED --- */}
        <header className="print:hidden" style={styles.header}>
          <div style={styles.headerInner}>
            <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} style={styles.backBtn}>
              <FiArrowLeft size={18} /> <span>Back</span>
            </button>

            <h1 style={styles.heading}>
              Stock <span style={{ color: BRAND_COLOR }}>Inventory</span>
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={styles.idBox}>
                ID : {profile?.franchise_id || '---'}
              </div>
              <button onClick={() => setIsCartOpen(true)} className="hidden sm:block relative p-2 bg-white border border-slate-200 rounded-md hover:border-black transition-all shadow-sm group cursor-pointer">
                <FiShoppingCart size={18} className="group-hover:scale-110 transition-transform text-black" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_COLOR }}>
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="w-full px-4 sm:px-6 pt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="SEARCH ITEMS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 sm:h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-black focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 h-11 sm:h-12 rounded-2xl border font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition-all shadow-sm ${showOnlyAvailable ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"}`}
                >
                  <FiFilter /> {showOnlyAvailable ? "Show Available Only" : "Show All Items"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto pb-3 scrollbar-thin">
              <div className="flex gap-2 min-w-max py-1">
                {sortedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase border-2 transition-all active:scale-95 ${selectedCategory === cat ? "text-white border-transparent shadow-lg" : "bg-white text-black border-slate-200 hover:border-black"}`}
                    style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <main className="w-full px-4 sm:px-6 mt-5 sm:mt-6 pb-20">
          {loadingStocks ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {[...Array(5)].map((_, i) => <StockSkeleton key={i} />)}
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-24 sm:py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <FiSearch size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="uppercase font-black text-sm text-slate-400 tracking-widest">No matching items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {filteredStocks.map((item) => {
                const isOutOfStock = Number(item.quantity) <= 0;
                const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
                const isInCart = cart.some(c => c.id === item.id);
                const isNotified = notifiedItems.has(item.id);

                const multiplier = getPriceMultiplier(item.unit, unit);
                const displayPrice = item.price * multiplier;
                const currentMOQ = getMOQ(item, unit);

                return (
                  <div
                    key={item.id}
                    className={`group bg-white rounded-2xl sm:rounded-3xl border-2 p-3 sm:p-5 transition-all duration-300 flex flex-col relative min-h-[240px] sm:min-h-[280px] hover:shadow-2xl hover:-translate-y-1 ${isInCart ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-100'} ${isOutOfStock ? 'bg-slate-50/50' : ''}`}
                  >
                    {isInCart && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase rounded-full shadow-lg flex items-center gap-1 z-10">
                        <FiCheck size={10} /> In Cart
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-500 tracking-tight">{item.item_code || '---'}</span>
                      {isCentral && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${Number(item.quantity) > 5 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600'}`}>
                          {item.quantity} {item.unit}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-[11px] sm:text-[13px] uppercase leading-tight sm:leading-snug mb-1 group-hover:text-emerald-900 transition-colors line-clamp-1">
                      {item.item_name}
                    </h3>

                    <p className="text-[10px] font-medium text-slate-400 leading-snug mb-2 line-clamp-2 min-h-[2.5em]">
                      {item.description || "No description available"}
                    </p>

                    <div className="mb-4">
                      {/* Price Row */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-black tracking-tighter text-black">
                          {formatCurrency(displayPrice)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          / {unit}
                        </span>
                      </div>

                      {/* Minimum Order Badge */}
                      <div className="mt-1">
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          Minimum Order: {currentMOQ} {unit}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2 sm:space-y-3">
                      {!isOutOfStock ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:border-black transition-all">
                              <button onClick={() => isInCart ? updateCartQty(item.id, -1) : handleQtyInputChange(item.id, null, true, -1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiMinus size={14} /></button>

                              {/* FIXED: Added `|| ""` to ensure this input never becomes technically "uncontrolled" if undefined is passed */}
                              <input
                                type="number"
                                value={(isInCart ? liveCart.find(c => c.id === item.id)?.qty : qtyInput[item.id]) || ""}
                                onChange={(e) => {
                                  if (isInCart) {
                                    const cartItem = liveCart.find(c => c.id === item.id);
                                    handleManualInputCart(cartItem, e.target.value);
                                  } else {
                                    handleQtyInputChange(item.id, e.target.value);
                                  }
                                }}
                                className="w-full text-center font-black text-xs sm:text-[13px] bg-transparent outline-none p-0"
                                placeholder={currentMOQ}
                              />
                              <button onClick={() => isInCart ? updateCartQty(item.id, 1) : handleQtyInputChange(item.id, null, true, 1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiPlus size={14} /></button>
                            </div>
                            <div className="relative w-full">
                              <select
                                value={isInCart ? liveCart.find(c => c.id === item.id)?.cartUnit : unit}
                                onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                className={`w-full bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase py-2 pl-3 pr-8 text-left outline-none appearance-none hover:border-slate-400 focus:border-black cursor-pointer transition-colors`}
                              >
                                <option value={item.unit}>{item.unit}</option>
                                {item.alt_unit && item.alt_unit !== item.unit && item.alt_unit !== "None" && <option value={item.alt_unit}>{item.alt_unit}</option>}
                              </select>

                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            className="w-full py-3.5 sm:py-4 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all shadow-md active:scale-95 mt-1"
                            style={{ backgroundColor: BRAND_COLOR }}
                          >
                            {isInCart ? "Update Cart" : "Add to Cart"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => !isNotified && handleNotifyMe(item)}
                          className={`w-full py-3.5 sm:py-4 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${isNotified ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                        >
                          {isNotified ? <FiCheck size={12} /> : <FiBell size={12} />}
                          {isNotified ? "Sent" : "Notify"}
                        </button>
                      )}
                    </div >
                  </div >
                );
              })}
            </div >
          )}
        </main >
      </div >

      <style>{`
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .min-h-[100dvh] { display: none !important; }
          .print-only { display: block !important; width: 100%; }
          @page { size: A4; margin: 0; }
          .a4-page {
            width: 210mm;
            height: 296.5mm;
            padding: 5mm; 
            margin: 0 auto;
            page-break-after: always;
            box-sizing: border-box;
            overflow: hidden; 
          }
          .a4-page:last-child {
            page-break-after: auto;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </>
  );
}

// --- STYLES ---
const styles = {
  // --- INTEGRATED HEADER STYLES ---
  header: { background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }
};

export default StockOrder;