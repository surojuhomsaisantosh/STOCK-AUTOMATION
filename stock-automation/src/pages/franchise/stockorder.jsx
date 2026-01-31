import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiSearch, FiCalendar, FiShoppingCart, 
  FiAlertTriangle, FiX, FiCheck, FiFilter, FiBell, FiMinus, FiPlus, FiTrash2
} from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const getConversionFactor = (unit) => {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();
  const gramVariants = ["g", "grams", "gram", "gm", "gms"];
  const mlVariants = ["ml", "millilitre", "millilitres", "ml."];

  if (gramVariants.includes(u)) return 0.001;
  if (mlVariants.includes(u)) return 0.001;
  return 1;
};

function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isCentral, setIsCentral] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockAlert, setStockAlert] = useState({ show: false, itemName: "", maxAvailable: 0, unit: "" });

  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    fetchStocks();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileData) {
      setProfile(profileData);
      if (profileData.role === 'central' || profileData.franchise_id === 'CENTRAL') {
        setIsCentral(true);
      }
    }
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from("stocks")
        .select("*")
        .eq('online_store', true)
        .order("item_name");

      if (error) throw error;

      const stockData = data || [];
      setStocks(stockData);

      const units = {};
      const initialQtys = {};
      stockData.forEach(item => {
        units[item.id] = item.unit || 'pcs';
        initialQtys[item.id] = 0;
      });
      setSelectedUnit(units);
      setQtyInput(initialQtys);

    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleNotifyMe = async (item) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login to request stock.");
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
      alert(`Request for ${item.item_name} sent to Admin!`);
    } catch (error) {
      alert("Failed to send request: " + error.message);
    }
  };

  const calculations = useMemo(() => {
    const details = cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      const gstRate = item.gst_rate || 0; 
      const itemGstAmt = itemSubtotal * (gstRate / 100);
      
      return {
        ...item,
        preciseSubtotal: itemSubtotal,
        preciseGst: itemGstAmt,
      };
    });

    const totalSubtotal = details.reduce((acc, curr) => acc + curr.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, curr) => acc + curr.preciseGst, 0);
    
    const exactBill = totalSubtotal + totalGst;
    const roundedBill = Math.round(exactBill);
    const roundOff = roundedBill - exactBill;

    return {
      items: details,
      subtotal: totalSubtotal,
      totalGst: totalGst,
      exactBill: exactBill,
      roundedBill: roundedBill,
      roundOff: roundOff
    };
  }, [cart]);

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
    if (!numVal || numVal <= 0) return;

    const unit = selectedUnit[itemId] || item.unit;
    const factor = getConversionFactor(unit);
    const finalBaseQty = numVal * factor;

    setCart(prev => {
      const exists = prev.find(c => c.id === itemId);
      if (exists) {
        return prev.map(c => c.id === itemId ? { ...c, qty: finalBaseQty, displayQty: numVal, cartUnit: unit } : c);
      }
      return [...prev, { ...item, qty: finalBaseQty, displayQty: numVal, cartUnit: unit }];
    });
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const orderItems = cart.map(item => ({
        stock_id: item.id,
        item_name: item.item_name,
        quantity: item.qty,
        unit: item.cartUnit,
        price: item.price
      }));

      const { error } = await supabase.rpc('place_stock_order', {
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

      alert("ORDER PLACED SUCCESSFULLY!");
      setCart([]); setQtyInput({}); setIsCartOpen(false); fetchStocks();
    } catch (error) {
      alert("FAILED: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10 font-sans text-black relative">
      
      {/* --- CART DRAWER (Responsive Modal) --- */}
      {isCartOpen && (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-[70] w-full md:w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                        <FiShoppingCart /> Your Order ({cart.length})
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <FiX size={20} />
                    </button>
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
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {item.displayQty} {item.cartUnit}
                                    </p>
                                    <p className="text-sm font-black mt-2">₹{(item.price * item.qty).toFixed(2)}</p>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id)}
                                    className="self-center p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* --- DETAILED BREAKDOWN FOOTER --- */}
                {cart.length > 0 && (
                  <div className="p-6 border-t-2 border-slate-100 bg-white">
                      <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                              <span>Subtotal</span>
                              <span className="text-black">₹{calculations.subtotal.toFixed(2)}</span>
                          </div>
                          {/* UPDATED: Unified GST Row */}
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                              <span>GST</span>
                              <span className="text-black">+ ₹{calculations.totalGst.toFixed(2)}</span>
                          </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                              <span>Round Off</span>
                              <span className="text-black">{calculations.roundOff >= 0 ? '+' : ''} ₹{calculations.roundOff.toFixed(2)}</span>
                          </div>
                          <div className="h-px bg-slate-200 my-2"></div>
                          <div className="flex justify-between items-center text-sm font-black uppercase">
                              <span>Total Payable</span>
                              <span className="text-xl">₹{calculations.roundedBill}</span>
                          </div>
                      </div>

                      <button 
                          onClick={handlePlaceOrder}
                          disabled={loading}
                          className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                          {loading ? <span className="animate-spin">C</span> : <FiCheck size={16}/>} 
                          {loading ? "Processing..." : "Confirm Order"}
                      </button>
                  </div>
                )}
            </div>
        </>
      )}

      {/* Stock Alert Modal */}
      {stockAlert.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-rose-500 text-center animate-in zoom-in-95 duration-200">
            <FiAlertTriangle size={40} className="text-rose-600 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase mb-2 text-black">Stock Limit</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6 uppercase">
              Available: <span className="text-black">{stockAlert.maxAvailable} {stockAlert.unit}</span>.
              <br /><br />Contact Admin for bulk orders.
            </p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs active:scale-95 transition-all">OK</button>
          </div>
        </div>
      )}

      {/* --- STICKY HEADER (Desktop & Mobile) --- */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-all">
                <FiArrowLeft size={18} /> <span className="hidden md:inline">BACK</span>
            </button>
        </div>
        
        <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-black text-center absolute left-1/2 -translate-x-1/2">
            Inventory
        </h1>
        
        {/* --- TOP RIGHT ID BOX & CART --- */}
        <div className="flex items-center gap-3">
             {/* ID BOX (Visible on ALL screens) */}
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">ID :</span>
                <span className="text-[10px] sm:text-xs font-black text-black bg-white border border-slate-200 px-2 sm:px-3 py-1 rounded-lg shadow-sm">
                    {profile?.franchise_id || "CENTRAL"}
                </span>
            </div>

            {/* CART ICON */}
             <button 
                onClick={() => setIsCartOpen(true)} 
                className="relative p-2 md:p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-black transition-all shadow-sm text-black group"
            >
              <FiShoppingCart size={20} className="md:w-5 md:h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 text-white text-[9px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-in zoom-in" style={{ backgroundColor: BRAND_COLOR }}>
                    {cart.length}
                </span>
              )}
            </button>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-6 md:mt-8">
        
        {/* Sticky Filters / Toolbar */}
        <div className="sticky top-16 md:top-20 z-30 bg-[#F8F9FA]/95 backdrop-blur-sm py-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {/* Search */}
                <div className="relative w-full md:flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black opacity-60" size={16} />
                    <input 
                        placeholder="SEARCH ITEM..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full h-12 md:h-14 pl-10 md:pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] md:text-sm outline-none focus:border-black transition-all text-black font-black placeholder:text-slate-300 uppercase shadow-sm" 
                    />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                     <button 
                        onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                        className={`flex items-center gap-2 px-4 h-12 md:h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm whitespace-nowrap flex-shrink-0 ${showOnlyAvailable ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-100 text-slate-400 hover:border-black"}`}
                        >
                        <FiFilter size={14} className={showOnlyAvailable ? "text-emerald-600" : "text-slate-300"} />
                        <span className="hidden sm:inline">Show Available Only</span>
                        <span className="sm:hidden">Available</span>
                    </button>

                    <div className="flex items-center gap-2 bg-white px-4 h-12 md:h-14 rounded-2xl border-2 border-slate-100 shadow-sm font-black text-xs uppercase text-black flex-shrink-0 whitespace-nowrap">
                        <FiCalendar size={16} className="opacity-40" /> {today}
                    </div>
                </div>
            </div>
             {/* Categories */}
             <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar touch-pan-x">
                {dynamicCategories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap flex-shrink-0 ${selectedCategory === cat ? "text-white border-transparent shadow-md" : "bg-white text-black border-slate-100 hover:border-black shadow-sm"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}} >{cat}</button>
                ))}
            </div>
        </div>

        {/* --- STOCK GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
          {filteredStocks.map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
            const isInCart = cart.some(c => c.id === item.id);
            const currentQty = qtyInput[item.id] || 0;

            return (
              <div
                key={item.id}
                className={`relative bg-white p-4 md:p-5 rounded-2xl transition-all flex flex-col border-2 
                    ${isOutOfStock ? 'border-slate-100 bg-slate-50/50' :
                    isInCart ? `border-emerald-500 shadow-md ring-1 ring-emerald-500` :
                      'border-slate-200 hover:border-black'}`}
              >
                {isInCart && (
                  <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                    <FiCheck size={10} /> Added
                  </div>
                )}

                <span className="text-[9px] font-black uppercase text-slate-400 mb-1">CODE: {item.item_code || '---'}</span>
                <h3 className="font-black text-sm md:text-base uppercase text-black leading-tight mb-3 line-clamp-2 min-h-[40px]">{item.item_name}</h3>

                <div className="mb-4">
                  <p className="text-lg md:text-xl font-black text-black">₹{item.price}<span className="ml-1 text-[10px] font-black text-black opacity-40 uppercase">/ {item.unit}</span></p>

                  {isCentral && (
                    <p className={`text-[9px] font-black mt-1 uppercase tracking-wider ${isOutOfStock ? 'text-rose-500' : 'text-emerald-700'}`}>
                      {isOutOfStock ? "OUT OF STOCK" : `Stock: ${item.quantity} ${item.unit}`}
                    </p>
                  )}
                </div>

                <div className="mt-auto space-y-3">
                  {!isOutOfStock ? (
                    <>
                      <div className="flex items-center gap-2 h-10">
                        <div className={`flex flex-1 items-center border-2 rounded-lg h-full overflow-hidden bg-white ${isInCart ? 'border-emerald-200' : 'border-slate-200'}`}>
                          <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, -1)} className="w-10 h-full flex items-center justify-center border-r border-slate-100 active:bg-slate-100 text-black"><FiMinus size={12} /></button>
                          <input type="number" value={qtyInput[item.id] || ""} placeholder="0" onChange={(e) => handleQtyInputChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black text-sm outline-none bg-transparent text-black" />
                          <button onClick={() => handleQtyInputChange(item.id, null, item.quantity, true, 1)} className="w-10 h-full flex items-center justify-center border-l border-slate-100 active:bg-slate-100 text-black"><FiPlus size={12} /></button>
                        </div>
                        <select value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="w-16 bg-slate-50 border-2 border-slate-200 rounded-lg h-full px-1 text-[9px] font-black uppercase outline-none focus:border-black appearance-none text-center cursor-pointer text-black">
                          <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                          {item.alt_unit && item.alt_unit !== item.unit && (<option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option>)}
                        </select>
                      </div>

                      {isInCart ? (
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white hover:opacity-90 active:scale-95 bg-emerald-600"
                        >
                          UPDATE CART
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          disabled={currentQty <= 0}
                          className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-95"
                          style={{ backgroundColor: BRAND_COLOR }}
                        >
                          ADD TO CART
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleNotifyMe(item)}
                      className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-rose-600 border-2 border-rose-600 hover:bg-rose-50 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <FiBell size={14} /> Notify
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default StockOrder;