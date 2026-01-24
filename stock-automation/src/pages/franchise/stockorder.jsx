import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiCalendar, FiCreditCard, FiAlertTriangle, FiX } from "react-icons/fi";

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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // REMOVED: showAvailableOnly state
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
    console.log("--- 🚀 STARTING STOCK FETCH ---");
    
    try {
        console.log("📡 Sending Query: .eq('online_store', true)");
        
        const { data, error } = await supabase
            .from("stocks")
            .select("*")
            .eq('online_store', true)
            .order("item_name");

        if (error) {
            console.error("❌ SUPABASE ERROR:", error);
            return;
        }

        console.log(`✅ Received ${data?.length || 0} items from DB`);
        
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
        console.error("❌ UNEXPECTED ERROR:", err);
    } finally {
        console.log("--- 🏁 END STOCK FETCH ---");
    }
  };

  const calculations = useMemo(() => {
    const details = cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      const itemGst = itemSubtotal * ((item.gst_rate || 0) / 100);
      return {
        ...item,
        preciseSubtotal: itemSubtotal,
        preciseGst: itemGst,
        preciseTotal: itemSubtotal + itemGst
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
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      exactBill: exactBill,
      roundedBill: roundedBill,
      roundOff: roundOff
    };
  }, [cart]);

  const handleQtyChange = (itemId, val, maxAvailable, isStepButton = false, direction = 0) => {
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;

    const unit = selectedUnit[itemId] || item.unit;
    const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
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
      
      const isAvailable = item.quantity > 0;
      
      return matchesSearch && matchesCategory && isAvailable;
    });
  }, [stocks, search, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10 font-sans text-black">
      {/* Stock Alert Modal */}
      {stockAlert.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-rose-500 text-center">
            <FiAlertTriangle size={40} className="text-rose-600 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase mb-2 text-black">Stock Limit</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6 uppercase">
              Available in Godown: <span className="text-black">{stockAlert.maxAvailable} {stockAlert.unit}</span>.
              <br/><br/>Contact Admin for bulk orders.
            </p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs active:scale-95 transition-all">OK</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-slate-100 px-8 py-5 h-20 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:opacity-50 transition-all"><FiArrowLeft size={18} /> BACK</button>
        <h1 className="text-xl font-black uppercase tracking-[0.2em] text-black">Order Inventory</h1>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franchise ID:</span>
           <span className="text-xs font-black text-black uppercase bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{profile?.franchise_id || "..."}</span>
        </div>
      </nav>

      {/* Search and Filters */}
      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full max-w-xl">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-black opacity-60" size={18} />
            <input placeholder="SEARCH ITEM NAME OR CODE..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-black transition-all text-black font-black placeholder:text-slate-300 uppercase shadow-sm" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 whitespace-nowrap shadow-sm flex-1 md:flex-none font-black text-sm uppercase text-black"><FiCalendar size={18} className="opacity-40" /> {today}</div>
            <button onClick={() => setIsCartOpen(true)} className="relative p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-black transition-all shadow-sm text-black group">
              <FiShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
              {cart.length > 0 && <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_COLOR }}>{cart.length}</span>}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-10 text-black">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {dynamicCategories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${selectedCategory === cat ? "text-white border-transparent shadow-md" : "bg-white text-black border-slate-100 hover:border-black shadow-sm"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}} >{cat}</button>
            ))}
          </div>
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStocks.map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
            
            return (
              <div key={item.id} className={`relative bg-white p-5 rounded-2xl transition-all flex flex-col border-2 ${isOutOfStock ? 'border-slate-100 opacity-40' : 'border-slate-200 hover:border-black'}`}>
                <span className="text-[10px] font-black uppercase text-black mb-1">ITEM CODE : {item.item_code || '---'}</span>
                <h3 className="font-black text-base uppercase text-black min-h-[48px] leading-tight mb-2">{item.item_name}</h3>
                <div className="mb-6">
                  <p className="text-xl font-black text-black">₹{item.price}<span className="ml-1 text-[10px] font-black text-black opacity-40 uppercase">/ {item.unit}</span></p>
                </div>
                <div className="mt-auto space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex flex-1 items-center border-2 rounded-lg h-10 overflow-hidden bg-white border-slate-200`}>
                      <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, -1)} className="w-8 h-full flex items-center justify-center border-r border-slate-100 hover:bg-slate-50 transition-colors text-black"><FiMinus size={12}/></button>
                      <input type="number" value={qtyInput[item.id] || ""} placeholder="0" onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black text-sm outline-none bg-transparent text-black" />
                      <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, 1)} className="w-8 h-full flex items-center justify-center border-l border-slate-100 hover:bg-slate-50 transition-colors text-black"><FiPlus size={12}/></button>
                    </div>
                    <select disabled={isOutOfStock} value={unit} onChange={(e) => handleUnitChange(item.id, e.target.value)} className="w-20 bg-slate-50 border-2 border-slate-200 rounded-lg h-10 px-1 text-[9px] font-black uppercase outline-none focus:border-black appearance-none text-center cursor-pointer text-black">
                      <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                      {item.alt_unit && item.alt_unit !== item.unit && ( <option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option> )}
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const currentVal = qtyInput[item.id] || 0;
                      const isGrams = ["g", "grams", "gram", "gm", "gms"].includes(unit.toLowerCase().trim());
                      const increment = isGrams ? 100 : 1;
                      handleQtyChange(item.id, currentVal + increment, item.quantity);
                    }} 
                    disabled={isOutOfStock} 
                    className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white" 
                    style={{ backgroundColor: isOutOfStock ? '#e2e8f0' : BRAND_COLOR }}
                  >
                    {isOutOfStock ? "NOT AVAILABLE" : "ADD TO CART"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Summary Popup */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-7xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-slate-100 text-black">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Order Summary</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-3 rounded-full hover:bg-slate-50 transition-colors text-black"><FiX size={24} /></button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              <div className="flex-[3] overflow-y-auto p-8 border-r-2 border-slate-100 bg-white">
                {!cart.length ? ( 
                  <div className="text-center py-20 opacity-20 text-black">
                    <FiShoppingCart size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase text-xs">Your cart is empty</p>
                  </div> 
                ) : (
                  <div className="w-full overflow-hidden rounded-2xl border-2 border-slate-100">
                    <table className="w-full text-left border-collapse font-black text-black">
                      <thead>
                        <tr style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                          <th className="py-5 px-6 text-[10px] uppercase">Item Details</th>
                          <th className="py-5 px-4 text-[10px] uppercase text-center">GST %</th>
                          <th className="py-5 px-4 text-[10px] uppercase text-center">Precise GST</th>
                          <th className="py-5 px-4 text-[10px] uppercase text-center">Quantity</th>
                          <th className="py-5 px-6 text-[10px] uppercase text-right">Subtotal</th>
                          <th className="py-5 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calculations.items.map((item) => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-5 px-6 uppercase text-sm font-black">{item.item_name}</td>
                            <td className="py-5 px-4 text-center text-xs opacity-60 font-black">{item.gst_rate}%</td>
                            <td className="py-5 px-4 text-center text-xs text-emerald-700 font-black">₹{item.preciseGst.toFixed(2)}</td>
                            <td className="py-5 px-4">
                               <div className="flex items-center gap-2 justify-center">
                                  <div className="flex items-center border-2 border-slate-200 rounded-lg h-9 bg-white overflow-hidden">
                                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, -1)} className="px-2 h-full hover:bg-slate-50 border-r border-slate-200 text-black"><FiMinus size={10}/></button>
                                    <input type="number" value={item.displayQty} onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-12 text-center outline-none bg-transparent text-xs font-black text-black" />
                                    <button onClick={() => handleQtyChange(item.id, null, item.quantity, true, 1)} className="px-2 h-full hover:bg-slate-50 border-l border-slate-200 text-black"><FiPlus size={10}/></button>
                                  </div>
                                  <span className="text-[10px] opacity-60 uppercase">{item.cartUnit}</span>
                               </div>
                            </td>
                            <td className="py-5 px-6 text-right text-sm font-black">₹{item.preciseSubtotal.toFixed(2)}</td>
                            <td className="py-5 px-4 text-center"><button onClick={() => removeFromCart(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><FiTrash2 size={18}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Billing Sidebar */}
              <div className="flex-1 bg-slate-50/50 p-8 flex flex-col justify-between">
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Billing Breakdown</h3>
                  
                  <div className="flex justify-between items-center text-xs font-black uppercase text-black">
                    <span>Items Subtotal</span>
                    <span>₹{calculations.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="pt-4 border-t border-dashed border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-xs font-black text-emerald-700 uppercase">
                      <span>Total GST</span>
                      <span>₹{calculations.totalGst.toFixed(2)}</span>
                    </div>

                    {/* CHANGED: Moved Round Off Adjustment HERE (above Exact Total Bill) */}
                    <div className="flex justify-between items-center text-[10px] font-black text-rose-600 uppercase italic">
                      <span>Round Off Adjustment</span>
                      <span>{calculations.roundOff >= 0 ? "+" : ""}{calculations.roundOff.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-slate-100 text-emerald-900 uppercase">
                      <span>Exact Total Bill</span>
                      <span>₹{calculations.exactBill.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t-2 border-black">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 text-black">Net Payable (Rounded)</p>
                      <p className="text-4xl font-black tracking-tighter text-black">₹{calculations.roundedBill.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePlaceOrder} 
                  disabled={loading || !cart.length} 
                  className="w-full py-6 text-white rounded-lg font-black text-sm uppercase tracking-[0.3em] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 mt-8 group relative overflow-hidden active:scale-[0.98]" 
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>SECURE PROCESSING...</span>
                    </div>
                  ) : (
                    <>
                      <span>Pay Now</span>
                      <FiCreditCard className="group-hover:translate-x-1 transition-transform" size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;