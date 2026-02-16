import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiCalendar, FiShoppingCart,
  FiAlertTriangle, FiX, FiCheck, FiFilter, FiBell,
  FiMinus, FiPlus, FiTrash2, FiRefreshCw, FiDownload
} from "react-icons/fi";
// --- ASSETS ---
import tvanammLogo from "../../assets/tvanamm_logo.jpeg";
import tleafLogo from "../../assets/tleaf_logo.jpeg";
// --- CONSTANTS ---
const BRAND_COLOR = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 12;
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
  return (
    <div className="w-full bg-white text-black font-sans p-8 print:p-6 box-border text-xs leading-normal h-full relative print:break-after-page print:h-[297mm]">
      <div className="w-full border-2 border-black flex flex-col relative h-full">
        <div className="p-4 border-b-2 border-black relative">
          <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
            <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4">TAX INVOICE</h1>
          </div>
          {totalPages > 1 && <div className="absolute top-2 right-2 text-[10px] font-black">Page {pageIndex + 1} of {totalPages}</div>}
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
              <img src={currentLogo} alt="Logo" className="h-16 w-auto object-contain mb-1" />
              <h2 className="text-lg font-black uppercase text-[#006437] break-words text-center">{companyName}</h2>
            </div>
          </div>
        </div>
        <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent">
          <div className="w-1/2 border-r-2 border-black p-2">
            <span className="font-bold text-slate-500 uppercase text-[9px]">Invoice No:</span>
            <p className="font-black text-sm">#{orderId || 'PENDING'}</p>
          </div>
          <div className="w-1/2 p-2">
            <span className="font-bold text-slate-500 uppercase text-[9px]">Invoice Date:</span>
            <p className="font-black text-sm">{invDate}</p>
          </div>
        </div>
        <div className="flex border-b-2 border-black">
          <div className="w-[70%] p-3 border-r-2 border-black">
            <span className="font-black uppercase underline text-[10px] tracking-widest text-slate-500 mb-2 block">Bill To:</span>
            <h3 className="text-sm font-black uppercase leading-tight">{profile?.name || ""}</h3>
            <p className="font-bold text-[10px] mt-1 uppercase leading-relaxed whitespace-pre-wrap break-words">
              {profile?.address || ""}<br />
              {profile?.city ? `${profile.city}` : ''} {profile?.state ? `, ${profile.state}` : ''} {profile?.pincode ? ` - ${profile.pincode}` : ''}
            </p>
          </div>
          <div className="w-[30%] p-3 flex flex-col justify-center pl-4">
            <div className="mb-2"><span className="text-[10px] font-bold block mb-1">ID: </span><span className="text-sm font-black block">{profile?.franchise_id || ""}</span></div>
            {profile?.phone && (<div><span className="text-[10px] font-bold block mb-1">Ph: </span><span className="text-sm font-black block">{profile.phone}</span></div>)}
          </div>
        </div>
        <div className="flex-1 border-b-2 border-black relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-[10px] border-b-2 border-black">
              <tr>
                <th className="p-2 border-r-2 border-black w-10 text-center">S.No</th>
                <th className="p-2 border-r-2 border-black">Item Description</th>
                <th className="p-2 border-r-2 border-black w-14 text-center">Qty</th>
                <th className="p-2 border-r-2 border-black w-20 text-right">Rate</th>
                <th className="p-2 w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-[10px] font-bold">
              {itemsChunk.map((item, idx) => (
                <tr key={idx} className="h-[35px]">
                  <td className="p-2 border-r-2 border-b border-black text-center">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                  <td className="p-2 border-r-2 border-b border-black uppercase truncate max-w-[150px]">{item.item_name}</td>
                  <td className="p-2 border-r-2 border-b border-black text-center">{item.displayQty} {item.cartUnit}</td>
                  <td className="p-2 border-r-2 border-b border-black text-right">{formatCurrency(item.price)}</td>
                  <td className="p-2 border-b border-black text-right">{formatCurrency(item.preciseSubtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex border-t-2 border-black mt-auto">
          <div className="w-[60%] border-r-2 border-black flex flex-col">
            <div className="p-2 border-b-2 border-black min-h-[40px] flex flex-col justify-center bg-slate-50">
              <span className="font-bold text-[9px] text-slate-500 uppercase">Total Amount in Words:</span>
              <p className="font-black italic capitalize text-[11px] mt-0.5">{amountToWords(data.roundedBill || 0)}</p>
            </div>
            <div className="p-3">
              <p className="font-black uppercase underline text-xs mb-2">Bank Details</p>
              <div className="grid grid-cols-[60px_1fr] gap-y-1 text-[10px] font-bold uppercase">
                <span>Bank:</span> <span>{companyDetails?.bank_name || ""}</span>
                <span>A/c No:</span> <span>{companyDetails?.bank_acc_no || ""}</span>
                <span>IFSC:</span> <span>{companyDetails?.bank_ifsc || ""}</span>
              </div>
            </div>
          </div>
          <div className="w-[40%] flex flex-col text-[10px]">
            <div className="flex justify-between p-1.5 border-b border-black"><span>Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>
            <div className="flex justify-between p-1.5 border-b border-black"><span>GST</span><span>{formatCurrency(cgst + sgst)}</span></div>
            <div className="flex justify-between p-2 border-b-2 border-black bg-slate-200"><span className="font-black uppercase">Total</span><span className="font-black">{formatCurrency(data.roundedBill || 0)}</span></div>
            <div className="flex-1 flex flex-col justify-end p-4 text-center"><p className="font-black border-t border-black pt-1 uppercase text-[8px]">Authorized Signature</p></div>
          </div>
        </div>
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
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

  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => { localStorage.setItem("stockOrderCart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("notifiedStockItems", JSON.stringify([...notifiedItems])); }, [notifiedItems]);

  useEffect(() => {
    document.body.style.overflow = (isCartOpen || orderSuccess) ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen, orderSuccess]);

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
      const { data: stockData } = await supabase.from("stocks").select("*").eq('online_store', true).order("item_name");
      setStocks(stockData || []);
    } catch (err) {
      addToast('error', 'Sync Failed', 'Could not refresh inventory.');
    } finally { setLoadingStocks(false); }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

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
    const baseList = stocks.filter(item => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch = item.item_name.toLowerCase().includes(query) || item.item_code?.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesAvailability = showOnlyAvailable ? item.quantity > 0 : true;
      return matchesSearch && matchesCategory && matchesAvailability;
    });
    return baseList.sort((a, b) => {
      if (a.quantity > 0 && b.quantity <= 0) return -1;
      if (a.quantity <= 0 && b.quantity > 0) return 1;
      return 0;
    });
  }, [stocks, debouncedSearch, selectedCategory, showOnlyAvailable]);

  const handleQtyInputChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const currentVal = qtyInput[itemId] || 0;
    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
    let numVal = isStepButton ? (isGrams ? (direction === 1 ? currentVal + 50 : Math.max(0, currentVal - 50)) : (direction === 1 ? currentVal + 1 : Math.max(0, currentVal - 1))) : (val === "" ? 0 : Math.max(0, Number(val)));
    const factor = getConversionFactor(unit);
    const requestedBaseQty = parseFloat((numVal * factor).toFixed(3));
    if (requestedBaseQty > item.quantity) {
      addToast('error', 'Limit Reached', `Only ${item.quantity} ${item.unit} available.`, 1000, `limit-${itemId}`);
      numVal = Math.floor((item.quantity / factor) * 1000) / 1000;
    }
    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const updateCartQty = (itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;

        // Check availability
        const stockItem = stocks.find(s => s.id === itemId);
        if (stockItem) {
          const factor = getConversionFactor(item.cartUnit);
          const requestedBase = newQty * factor;
          if (requestedBase > stockItem.quantity) {
            addToast('error', 'Limit Reached', `Only ${stockItem.quantity} ${stockItem.unit} available.`, 1000, `limit-${itemId}`);
            return item;
          }
        }
        return { ...item, qty: newQty, displayQty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleAddToCart = (itemId) => {
    const item = stocks.find(s => s.id === itemId);
    const isInCart = cart.some(c => c.id === itemId);

    if (isInCart) {
      updateCartQty(itemId, 1);
    } else {
      const unit = selectedUnit[itemId] || item.unit;
      const inputQty = qtyInput[itemId];
      const qtyToAdd = (inputQty && inputQty > 0) ? inputQty : 1;
      setCart(prev => [...prev, { ...item, qty: qtyToAdd, displayQty: qtyToAdd, cartUnit: unit }]);
      setQtyInput(prev => ({ ...prev, [itemId]: qtyToAdd }));
    }
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
    setQtyInput(prev => ({ ...prev, [id]: 0 }));
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

      const itemIds = cart.map(i => i.id);
      const { data: liveStocks } = await supabase.from('stocks').select('id, quantity').in('id', itemIds);
      for (const item of cart) {
        const live = liveStocks.find(l => l.id === item.id);
        if (!live || live.quantity < (item.qty * getConversionFactor(item.cartUnit))) throw new Error(`${item.item_name} stock changed.`);
      }

      const orderItems = cart.map(i => ({ stock_id: i.id, item_name: i.item_name, quantity: i.qty, unit: i.cartUnit, price: i.price, gst_rate: i.gst_rate }));

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
            p_order_time: formattedTime
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

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="print-only hidden print:block">
        {orderSuccess && printData && (
          <FullPageInvoice
            data={printData}
            profile={profile}
            orderId={lastOrderId}
            companyDetails={companyDetails}
            itemsChunk={printData.items}
            pageIndex={0}
            totalPages={1}
          />
        )}
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
                <button onClick={() => { setOrderSuccess(false); setCart([]); setQtyInput({}); setIsCartOpen(false); fetchData(); }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px]">Continue Shopping</button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating Cart Button - changed to black and perfectly round */}
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

        {/* Cart Drawer */}
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
                ) : cart.map(item => (
                  <div key={item.id} className="flex gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm items-center">
                    <div className="flex-1">
                      <h4 className="text-[12px] font-black uppercase leading-tight mb-1">{item.item_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mb-2">{item.cartUnit} @ {formatCurrency(item.price)}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 h-8">
                          <button onClick={() => updateCartQty(item.id, -1)} className="px-3 h-full hover:bg-slate-200"><FiMinus size={12} /></button>
                          <span className="w-8 text-center text-[11px] font-black">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} className="px-3 h-full hover:bg-slate-200"><FiPlus size={12} /></button>
                        </div>
                        <p className="text-sm font-black">{formatCurrency(item.price * item.qty)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><FiTrash2 size={20} /></button>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-white shadow-inner">
                  <div className="space-y-2 mb-6 p-4 bg-slate-50 rounded-2xl text-[11px] font-black uppercase">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Total GST</span><span>{formatCurrency(calculations.totalGst)}</span></div>
                    <div className="flex justify-between text-lg pt-2 border-t border-slate-200 mt-2"><span>Total Bill</span><span>{formatCurrency(calculations.roundedBill)}</span></div>
                    <p className="text-[9px] text-slate-400 normal-case mt-3 text-center italic">* GST breakdown will be clearly shown in the invoice when downloaded.</p>
                  </div>
                  <button onClick={handlePlaceOrder} disabled={processingOrder} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                    {processingOrder ? <FiRefreshCw className="animate-spin" /> : <FiCheck size={18} />}
                    {processingOrder ? "Securing Payment..." : "Checkout Now"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between relative">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-black uppercase text-sm sm:text-base hover:text-slate-500 transition-colors shrink-0 z-30">
              <FiArrowLeft size={20} /> <span>Back</span>
            </button>

            <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg sm:text-3xl font-black text-black tracking-wider text-center w-full pointer-events-none z-10">
              INVENTORY
            </h1>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0 z-30">
              <span className="text-[10px] sm:text-sm font-black uppercase bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-slate-700 border border-slate-200 whitespace-nowrap">
                ID: {profile?.franchise_id || '---'}
              </span>
              <button onClick={() => setIsCartOpen(true)} className="hidden sm:block relative p-2 sm:p-2.5 bg-white border border-slate-200 rounded-md hover:border-black transition-all shadow-sm group">
                <FiShoppingCart size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-black h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-md shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_COLOR }}>
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </nav>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">
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
                  <FiFilter /> {showOnlyAvailable ? "Available" : "All"}
                </button>
                <button onClick={fetchData} className="w-11 sm:w-12 h-11 sm:h-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 shadow-sm transition-all">
                  <FiRefreshCw size={20} />
                </button>
                <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-5 h-12 rounded-2xl border border-slate-200 text-sm font-black uppercase shadow-sm">
                  <FiCalendar size={16} /> {today}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
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

        <main className="max-w-7xl mx-auto px-3 sm:px-4 mt-5 sm:mt-6 pb-20">
          {loadingStocks ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              <StockSkeleton /><StockSkeleton /><StockSkeleton /><StockSkeleton /><StockSkeleton />
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-24 sm:py-32 bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-200">
              <FiSearch size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="uppercase font-black text-sm text-slate-400 tracking-widest">No matching items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {filteredStocks.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
                const isInCart = cart.some(c => c.id === item.id);
                const isNotified = notifiedItems.has(item.id);

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
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${item.quantity > 5 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600'}`}>
                          {item.quantity} {item.unit}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-[11px] sm:text-[13px] uppercase leading-tight sm:leading-snug mb-1 sm:mb-2 group-hover:text-emerald-900 transition-colors line-clamp-2 h-8 sm:h-10">
                      {item.item_name}
                    </h3>

                    <div className="mb-4 sm:mb-6">
                      <p className="text-base sm:text-lg font-black tracking-tighter">{formatCurrency(item.price)}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ {item.unit}</p>
                    </div>

                    <div className="mt-auto space-y-2 sm:space-y-3">
                      {!isOutOfStock ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:border-black transition-all">
                              <button onClick={() => isInCart ? updateCartQty(item.id, -1) : handleQtyInputChange(item.id, null, item.quantity, true, -1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiMinus size={14} /></button>
                              <input
                                type="number"
                                value={isInCart ? cart.find(c => c.id === item.id).qty : (qtyInput[item.id] || "")}
                                onChange={(e) => {
                                  handleQtyInputChange(item.id, e.target.value, item.quantity);
                                  if (isInCart) {
                                    const val = e.target.value;
                                    const numVal = val === "" ? 0 : Math.max(0, Number(val));
                                    if (numVal === 0) removeFromCart(item.id);
                                    else setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: numVal, displayQty: numVal } : c));
                                  }
                                }}
                                className="w-full text-center font-black text-xs sm:text-[13px] bg-transparent outline-none p-0"
                                placeholder="0"
                              />
                              <button onClick={() => isInCart ? updateCartQty(item.id, 1) : handleQtyInputChange(item.id, null, item.quantity, true, 1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiPlus size={14} /></button>
                            </div>

                            <div className="relative w-full">
                              <select
                                value={unit}
                                onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase py-2 pl-3 pr-8 text-left outline-none hover:border-slate-400 cursor-pointer appearance-none"
                              >
                                <option value={item.unit}>{item.unit}</option>
                                {item.alt_unit && item.alt_unit !== item.unit && <option value={item.alt_unit}>{item.alt_unit}</option>}
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
                            {isInCart ? "Add (+1)" : "Add"}
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
                      )
                      }
                    </div >
                  </div >
                );
              })}
            </div >
          )
          }
        </main >
      </div >

      <style>{`
       @media print {
         body { background: white; margin: 0; }
         .min-h-[100dvh] { display: none !important; }
         .print-only { display: block !important; width: 100%; }
         @page { size: A4; margin: 0; }
       }

       /* Visible horizontal scrollbar for categories */
       .scrollbar-thin {
         scrollbar-width: thin;
         scrollbar-color: #cbd5e1 #f1f5f9;
       }
       .scrollbar-thin::-webkit-scrollbar {
         height: 6px;
       }
       .scrollbar-thin::-webkit-scrollbar-track {
         background: #f1f5f9;
         border-radius: 10px;
       }
       .scrollbar-thin::-webkit-scrollbar-thumb {
         background: #cbd5e1;
         border-radius: 10px;
       }
       .scrollbar-thin::-webkit-scrollbar-thumb:hover {
         background: #94a3b8;
       }

       input[type="number"]::-webkit-inner-spin-button,
       input[type="number"]::-webkit-outer-spin-button {
         -webkit-appearance: none;
         margin: 0;
       }
     `}</style>
    </>
  );
}

export default StockOrder;