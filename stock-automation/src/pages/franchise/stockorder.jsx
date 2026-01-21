import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiAlertCircle, FiLock, FiX, FiCalendar } from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";
const GST_RATE = 0.18; 

const UNIT_MAP = {
  g: { base: "kg", factor: 0.001, min: 0, step: 100 },
  kg: { base: "kg", factor: 1, min: 0, step: 1 },
  ml: { base: "litre", factor: 0.001, min: 0, step: 100 },
  litre: { base: "litre", factor: 1, min: 0, step: 1 },
  pcs: { base: "pcs", factor: 1, min: 0, step: 1 },
};

function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockAlert, setStockAlert] = useState({ show: false, max: 0, unit: "" });

  // Get formatted date
  const today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  useEffect(() => {
    fetchStocks();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("name, branch_location, franchise_id").eq("id", user.id).single();
    setProfile(data);
  };

  const fetchStocks = async () => {
    const { data } = await supabase.from("stocks").select("*").order("item_name");
    setStocks(data || []);
    const units = {};
    const initialQtys = {};
    data?.forEach(item => {
      units[item.id] = item.unit || 'kg';
      initialQtys[item.id] = 0; 
    });
    setSelectedUnit(units);
    setQtyInput(initialQtys);
  };

  const syncCart = (itemId, newDisplayQty, unit, itemData) => {
    const conversion = UNIT_MAP[unit];
    const totalBaseQty = newDisplayQty * conversion.factor;

    if (newDisplayQty <= 0) {
      setCart(prev => prev.filter(c => c.id !== itemId));
      return;
    }

    setCart(prev => {
      const exists = prev.find(c => c.id === itemId);
      if (exists) {
        return prev.map(c => c.id === itemId 
          ? { ...c, qty: totalBaseQty, displayQty: newDisplayQty, cartUnit: unit } 
          : c
        );
      }
      return [...prev, { ...itemData, qty: totalBaseQty, displayQty: newDisplayQty, cartUnit: unit }];
    });
  };

  const handleQtyChange = (itemId, val, maxAvailable) => {
    const item = stocks.find(s => s.id === itemId);
    const unit = selectedUnit[itemId] || 'kg';
    const config = UNIT_MAP[unit];
    let numVal = Math.max(0, Number(val));
    
    if (numVal * config.factor > maxAvailable) {
      setStockAlert({ show: true, max: maxAvailable, unit: config.base });
      numVal = Math.floor(maxAvailable / config.factor);
    }

    setQtyInput({ ...qtyInput, [itemId]: numVal });
    syncCart(itemId, numVal, unit, item);
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit({ ...selectedUnit, [itemId]: newUnit });
    setQtyInput({ ...qtyInput, [itemId]: 0 });
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const addToCartIncrement = (item) => {
    const unit = selectedUnit[item.id];
    const config = UNIT_MAP[unit];
    const currentVal = Number(qtyInput[item.id] || 0);
    const step = config.step || 1;
    const newVal = currentVal + step;

    handleQtyChange(item.id, newVal, item.quantity);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((c) => c.id !== id));
    setQtyInput({ ...qtyInput, [id]: 0 });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const gstAmount = subtotal * GST_RATE;
  const totalBill = subtotal + gstAmount;

  return (
    <div className="min-h-screen bg-white pb-10 font-sans text-black">
      {/* HEADER */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 h-20 grid grid-cols-3 items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-bold uppercase text-xs tracking-widest hover:opacity-70 transition-opacity">
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-center text-2xl font-black tracking-tighter text-black uppercase">Inventory</h1>
        <div className="flex items-center justify-end gap-6">
          <div className="text-right hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-bold text-black uppercase opacity-40">Franchise ID:</span>
            <span className="text-lg font-black text-black">{profile?.franchise_id || "3"}</span>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-white border-2 border-slate-100 rounded-xl transition-all active:scale-95 hover:border-black">
            <FiShoppingCart size={20} style={{ color: BRAND_COLOR }} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        
        {/* SEARCH BAR AREA WITH DATE */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          <div className="relative w-full max-w-xl text-black">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-black opacity-60" size={18} />
            <input
              placeholder="Search item name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-black transition-all text-black font-bold placeholder:text-black/30 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-100 whitespace-nowrap">
            <FiCalendar size={18} className="text-black opacity-40" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-black opacity-40 uppercase leading-none mb-1">Today's Date</span>
              <span className="text-sm font-black text-black uppercase tracking-tight">{today}</span>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stocks.filter(s => s.item_name.toLowerCase().includes(search.toLowerCase())).map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const unit = selectedUnit[item.id];
            const isInCart = cart.some(c => c.id === item.id);
            
            return (
              <div 
                key={item.id} 
                className={`relative bg-white p-6 rounded-[2rem] transition-all flex flex-col shadow-sm border-2 
                ${isOutOfStock ? 'border-slate-100 opacity-60' : isInCart ? 'border-black' : 'border-slate-100 hover:border-black'}`}
              >
                {isOutOfStock && (
                  <div className="absolute inset-0 z-10 bg-white/40 rounded-[2rem] flex flex-col items-center justify-center p-4 text-center">
                     <FiLock className="text-red-600 mb-2" size={24} />
                     <span className="font-black text-xs uppercase text-red-600">Out of Stock</span>
                  </div>
                )}
                <div className="mb-4 text-black">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-black uppercase opacity-40">Code: {item.item_code || 'N/A'}</span>
                    <p className="text-lg font-black text-black">₹{item.price}</p>
                  </div>
                  <h3 className="font-black text-black text-md leading-tight uppercase min-h-[40px]">{item.item_name}</h3>
                </div>

                <div className="space-y-3 mt-auto">
                  <select 
                    disabled={isOutOfStock} 
                    value={unit} 
                    onChange={(e) => handleUnitChange(item.id, e.target.value)} 
                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-black text-black appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "1em"
                    }}
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>

                  <div className="flex items-center border-2 border-slate-100 rounded-xl h-12 overflow-hidden bg-white">
                    <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] || 0) - (UNIT_MAP[unit]?.step || 1), item.quantity)} className="w-12 h-full flex items-center justify-center hover:bg-slate-50 border-r border-slate-100 text-black"><FiMinus /></button>
                    <input type="number" value={qtyInput[item.id] === 0 ? "" : qtyInput[item.id]} placeholder="0" onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black outline-none text-black bg-transparent" />
                    <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] || 0) + (UNIT_MAP[unit]?.step || 1), item.quantity)} className="w-12 h-full flex items-center justify-center hover:bg-slate-50 border-l border-slate-100 text-black"><FiPlus /></button>
                  </div>
                  <button 
                    onClick={() => addToCartIncrement(item)} 
                    disabled={isOutOfStock} 
                    className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md" 
                    style={{ backgroundColor: isOutOfStock ? '#f1f5f9' : BRAND_COLOR, color: isOutOfStock ? '#cbd5e1' : 'white' }}
                  >
                    {isOutOfStock ? "CONTACT ADMIN" : isInCart ? "ADD MORE" : "ADD TO CART"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="text-black">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Order Summary</h2>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Review your selected items</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-3 hover:bg-slate-50 rounded-full transition-colors text-black"><FiX size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <FiShoppingCart size={48} className="mx-auto mb-4 text-black opacity-10" />
                  <p className="text-black opacity-40 font-bold uppercase text-xs">Your cart is currently empty</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="py-4 text-[10px] font-black uppercase tracking-widest text-black opacity-40">Code</th>
                        <th className="py-4 text-[10px] font-black uppercase tracking-widest text-black opacity-40">Item Name</th>
                        <th className="py-4 text-[10px] font-black uppercase tracking-widest text-black opacity-40 text-right">Unit Price</th>
                        <th className="py-4 text-[10px] font-black uppercase tracking-widest text-black opacity-40 text-right">Qty</th>
                        <th className="py-4 text-[10px] font-black uppercase tracking-widest text-black opacity-40 text-right">Subtotal</th>
                        <th className="py-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50 transition-colors text-black font-bold">
                          <td className="py-5 text-xs uppercase">{item.item_code || 'N/A'}</td>
                          <td className="py-5">
                            <p className="font-black text-sm uppercase leading-none mb-1">{item.item_name}</p>
                            <p className="text-[9px] opacity-40 font-bold uppercase">{item.cartUnit}</p>
                          </td>
                          <td className="py-5 text-right text-sm">₹{item.price}</td>
                          <td className="py-5 text-right font-black text-sm">{item.displayQty} {item.cartUnit}</td>
                          <td className="py-5 text-right font-black text-sm">₹{Math.round(item.price * item.qty)}</td>
                          <td className="py-5 text-center">
                            <button onClick={() => removeFromCart(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                <FiTrash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-8 bg-slate-50 border-t border-slate-100 text-black">
                <div className="max-w-xs ml-auto space-y-3">
                  <div className="flex justify-between text-sm font-bold opacity-60 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{Math.round(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold opacity-60 uppercase tracking-widest">
                    <span>GST (18%)</span>
                    <span>₹{Math.round(gstAmount)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Bill</span>
                    <span className="text-3xl font-black leading-none">₹{Math.round(totalBill)}</span>
                  </div>
                  <button 
                    disabled={loading}
                    className="w-full mt-6 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {loading ? "Processing..." : "Place Final Order"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STOCK ALERT MODAL */}
      {stockAlert.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setStockAlert({ ...stockAlert, show: false })} />
          <div className="relative bg-white p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl border border-slate-100 text-black">
            <FiAlertCircle size={40} className="mx-auto mb-4 text-amber-600" />
            <h3 className="text-xl font-black uppercase">Stock Limit Reached</h3>
            <p className="text-sm opacity-60 mt-2 font-medium">Only {stockAlert.max} {stockAlert.unit} available.</p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg">Update Quantity</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;