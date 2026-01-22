import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiAlertCircle, FiLock, FiX, FiCalendar, FiCheckCircle, FiLayers, FiCreditCard, FiAlertTriangle } from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const getConversionFactor = (unit) => {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();
  if (u === "g" || u === "grams" || u === "gram") return 0.001;
  if (u === "ml" || u === "millilitre" || u === "millilitres") return 0.001;
  return 1;
};

function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
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
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  };

  const fetchStocks = async () => {
    const { data } = await supabase.from("stocks").select("*").order("item_name");
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
  };

  const totals = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemSubtotal = item.price * item.qty; 
      const itemGstTotal = itemSubtotal * ((item.gst_rate || 0) / 100);
      acc.subtotal += itemSubtotal;
      acc.totalGst += itemGstTotal;
      return acc;
    }, { subtotal: 0, totalGst: 0 });
  }, [cart]);

  const cgst = totals.totalGst / 2;
  const sgst = totals.totalGst / 2;
  const totalBill = totals.subtotal + totals.totalGst;

  const handleQtyChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram"].includes(unit.toLowerCase().trim());
    const currentVal = qtyInput[itemId] || 0;
    
    let numVal;
    if (isStepButton) {
      if (isGrams) {
        if (direction === 1) numVal = currentVal < 100 ? 100 : currentVal + 50;
        else numVal = currentVal <= 100 ? 0 : currentVal - 50;
      } else {
        numVal = direction === 1 ? currentVal + 1 : Math.max(0, currentVal - 1);
      }
    } else {
      numVal = val === "" ? 0 : Number(val);
    }

    const factor = getConversionFactor(unit);
    // FIX: Using toFixed to avoid floating point math errors (0.700000000001)
    const requestedBaseQty = parseFloat((numVal * factor).toFixed(3)); 
    const availableBaseQty = parseFloat(Number(maxAvailable).toFixed(3));

    if (requestedBaseQty > availableBaseQty) {
      setStockAlert({ show: true, itemName: item.item_name, maxAvailable: availableBaseQty, unit: item.unit });
      numVal = Math.floor((availableBaseQty / factor) * 1000) / 1000; 
    }

    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
    
    const finalBaseQty = numVal * factor;
    if (numVal <= 0) {
      setCart(prev => prev.filter(c => c.id !== itemId));
    } else {
      setCart(prev => {
        const exists = prev.find(c => c.id === itemId);
        if (exists) {
          return prev.map(c => c.id === itemId ? { ...c, qty: finalBaseQty, displayQty: numVal, cartUnit: unit } : c);
        }
        return [...prev, { ...item, qty: finalBaseQty, displayQty: numVal, cartUnit: unit }];
      });
    }
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    const item = stocks.find(s => s.id === itemId);
    handleQtyChange(itemId, 0, item.quantity);
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
        quantity: item.displayQty, 
        unit: item.cartUnit,       
        price: item.price
      }));

      // CALLING THE DATABASE FUNCTION (RPC)
      const { error } = await supabase.rpc('place_stock_order', {
        p_total_amount: Math.round(totalBill),
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

      alert("ORDER PLACED & STOCK UPDATED!");
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
      const isAvailable = item.quantity > 0;
      return showAvailableOnly ? (matchesSearch && matchesCategory && isAvailable) : (matchesSearch && matchesCategory);
    });
  }, [stocks, search, selectedCategory, showAvailableOnly]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10 font-sans text-black">
      {stockAlert.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-rose-500 text-center">
            <FiAlertTriangle size={40} className="text-rose-600 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase mb-2">Stock Limit</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6 uppercase">
              Available in Godown: <span className="text-black">{stockAlert.maxAvailable} {stockAlert.unit}</span>.
              <br/><br/>Contact Admin for bulk orders.
            </p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs active:scale-95 transition-all">OK</button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-white border-b-2 border-slate-100 px-8 py-5 h-20 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:opacity-50 transition-all"><FiArrowLeft size={18} /> BACK</button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em]">Order Inventory</h1>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>
           <span className="text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{profile?.franchise_id || "..."}</span>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full max-w-xl">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-black opacity-60" size={18} />
            <input placeholder="SEARCH ITEM NAME OR CODE..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-black transition-all text-black font-black placeholder:text-slate-300 uppercase shadow-sm" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black border-2 transition-all text-xs uppercase tracking-widest flex-1 md:flex-none ${showAvailableOnly ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-md" : "bg-white text-slate-400 border-slate-100 hover:border-black"}`} >
              <FiCheckCircle size={18} className={showAvailableOnly ? "text-emerald-600" : "inherit"} /> Available Only
            </button>
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 whitespace-nowrap shadow-sm flex-1 md:flex-none font-black text-sm uppercase"><FiCalendar size={18} className="opacity-40" /> {today}</div>
            <button onClick={() => setIsCartOpen(true)} className="relative p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-black transition-all shadow-sm text-black group">
              <FiShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
              {cart.length > 0 && <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_COLOR }}>{cart.length}</span>}
            </button>
          </div>
        </div>

        <div className="mb-10 text-black">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {dynamicCategories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${selectedCategory === cat ? "text-white border-transparent shadow-md" : "bg-white text-black border-slate-100 hover:border-black shadow-sm"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}} >{cat}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredStocks.map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const isInCart = cart.some(c => c.id === item.id);
            const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
            return (
              <div key={item.id} className={`relative bg-white p-6 rounded-[2.5rem] transition-all flex flex-col border-2 ${isOutOfStock ? 'border-slate-100 opacity-40' : isInCart ? 'border-black shadow-2xl scale-[1.02]' : 'border-slate-100 hover:border-black shadow-sm'}`}>
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase opacity-30">#{item.item_code || '---'}</span>
                    <p className={`text-xl font-black tracking-tighter ${isInCart ? 'text-emerald-700' : ''}`}>
                      ₹{item.price}<span className="ml-1 text-xs font-black px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-500 uppercase">/ {item.unit}</span>
                    </p>
                  </div>
                  <h3 className="font-black text-lg uppercase min-h-[50px] tracking-tight">{item.item_name}</h3>
                </div>
                <div className="space-y-4 mt-auto">
                  <select disabled={isOutOfStock} value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-black appearance-none cursor-pointer">
                    <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                    {item.alt_unit && item.alt_unit !== item.unit && ( <option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option> )}
                  </select>
                  <div className={`flex items-center border-2 rounded-xl h-14 overflow-hidden bg-white ${isInCart ? 'border-black' : 'border-slate-100'}`}>
                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, -1)} className="w-14 h-full flex items-center justify-center border-r border-slate-100 hover:bg-slate-50 transition-colors"><FiMinus /></button>
                    <input type="number" value={qtyInput[item.id] || ""} placeholder="0" onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black outline-none bg-transparent" />
                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, 1)} className="w-14 h-full flex items-center justify-center border-l border-slate-100 hover:bg-slate-50 transition-colors"><FiPlus /></button>
                  </div>
                  <button onClick={() => handleQtyChange(item.id, qtyInput[item.id], item.quantity)} disabled={isOutOfStock} className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all text-white shadow-md" style={{ backgroundColor: isOutOfStock ? '#f8f9fa' : BRAND_COLOR }}>{isOutOfStock ? "NOT AVAILABLE" : isInCart ? "UPDATE CART" : "ADD TO CART"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-7xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-slate-100 text-black">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Order Summary</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-3 rounded-full hover:bg-slate-50 transition-colors"><FiX size={24} /></button>
            </div>
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              <div className="flex-[3] overflow-y-auto p-8 border-r-2 border-slate-100">
                {!cart.length ? ( <div className="text-center py-20 opacity-20"><FiShoppingCart size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Your cart is empty</p></div> ) : (
                  <div className="w-full overflow-hidden rounded-2xl border-2 border-slate-100">
                    <table className="w-full text-left border-collapse font-black">
                      <thead><tr style={{ backgroundColor: BRAND_COLOR }} className="text-white"><th className="py-5 px-6 text-[10px] uppercase">Item Details</th><th className="py-5 px-4 text-[10px] uppercase text-center">GST %</th><th className="py-5 px-4 text-[10px] uppercase text-center">Quantity & Unit</th><th className="py-5 px-6 text-[10px] uppercase text-right">Subtotal</th><th className="py-5 px-4 text-center"></th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {cart.map((item) => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-5 px-6 uppercase text-sm">{item.item_name}</td>
                            <td className="py-5 px-4 text-center text-xs opacity-60">{item.gst_rate}%</td>
                            <td className="py-5 px-4">
                               <div className="flex items-center gap-2 justify-center">
                                  <select value={item.cartUnit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-[9px] font-black uppercase outline-none w-24">
                                    <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                                    {item.alt_unit && item.alt_unit !== item.unit && ( <option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option> )}
                                  </select>
                                  <div className="flex items-center border-2 border-slate-200 rounded-lg h-9 bg-white overflow-hidden">
                                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, -1)} className="px-2 h-full hover:bg-slate-50 border-r border-slate-200"><FiMinus size={10}/></button>
                                    <input type="number" value={item.displayQty} onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-12 text-center outline-none bg-transparent text-xs" />
                                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, 1)} className="px-2 h-full hover:bg-slate-50 border-l border-slate-200"><FiPlus size={10}/></button>
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 px-6 text-right text-sm font-bold">₹{Math.round(item.price * item.qty).toLocaleString()}</td>
                            <td className="py-5 px-4 text-center"><button onClick={() => removeFromCart(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><FiTrash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex-1 bg-slate-50/50 p-8 flex flex-col justify-between">
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-black uppercase opacity-60"><span>Items Cost</span><span>₹{Math.round(totals.subtotal).toLocaleString()}</span></div>
                  <div className="pt-4 border-t border-dashed border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-xs font-black text-emerald-700 uppercase"><span>CGST (Central)</span><span>₹{Math.round(cgst).toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-xs font-black text-emerald-700 uppercase"><span>SGST (State)</span><span>₹{Math.round(sgst).toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-slate-100 text-emerald-900 uppercase"><span>Total GST</span><span>₹{Math.round(totals.totalGst).toLocaleString()}</span></div>
                  </div>
                  <div className="pt-6 border-t-2 border-black"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Net Payable</p><p className="text-4xl font-black tracking-tighter">₹{Math.round(totalBill).toLocaleString()}</p></div></div>
                </div>
                <button onClick={handlePlaceOrder} disabled={loading || !cart.length} className="w-full py-5 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-8" style={{ backgroundColor: BRAND_COLOR }}>{loading ? "PROCESSING..." : "Confirm & Pay Now"} <FiCreditCard /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;