import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiAlertCircle, FiLock, FiX, FiCalendar, FiCheckCircle, FiLayers } from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";
const GST_RATE = 0.18; 

const getConversionFactor = (unit) => {
  const map = { g: 0.001, ml: 0.001, kg: 1, litre: 1, pcs: 1, bulk: 1 };
  return map[unit?.toLowerCase()] || 1;
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
  const [stockAlert, setStockAlert] = useState({ show: false, max: 0, unit: "" });

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

  // --- UPDATED PLACE ORDER LOGIC ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert into 'invoices' table with ALIGNED PROFILE DETAILS
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          total_amount: Math.round(totalBill),
          created_by: user.id,
          status: 'incoming',
          // Aligning exactly with your profiles table data
          customer_name: profile?.name || "Unknown",
          customer_email: profile?.email || null,
          customer_phone: profile?.phone || null,
          customer_address: profile?.address || null,
          branch_location: profile?.branch_location || "",
          // If you added the franchise_id column to invoices as discussed:
          franchise_id: profile?.franchise_id || null 
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 2. Prepare and Insert into 'invoice_items' table
      const invoiceItems = cart.map(item => ({
        invoice_id: invoiceData.id,
        stock_id: item.id,
        item_name: item.item_name,
        quantity: item.displayQty,
        unit: item.cartUnit,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      alert("ORDER PLACED SUCCESSFULLY!");
      setCart([]); 
      setQtyInput(Object.fromEntries(stocks.map(s => [s.id, 0]))); 
      setIsCartOpen(false);
      fetchStocks(); 

    } catch (error) {
      console.error("Error:", error);
      alert("FAILED TO SAVE ORDER: " + error.message);
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

  const handleQtyChange = (itemId, val, maxAvailable) => {
    const item = stocks.find(s => s.id === itemId);
    const unit = selectedUnit[itemId] || item.unit;
    const factor = getConversionFactor(unit);
    let numVal = Math.max(0, Number(val));
    
    if (numVal * factor > maxAvailable) {
      setStockAlert({ show: true, max: maxAvailable, unit: item.unit });
      numVal = Math.floor(maxAvailable / factor);
    }

    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
    
    const totalBaseQty = numVal * factor;
    if (numVal <= 0) {
      setCart(prev => prev.filter(c => c.id !== itemId));
    } else {
      setCart(prev => {
        const exists = prev.find(c => c.id === itemId);
        if (exists) {
          return prev.map(c => c.id === itemId ? { ...c, qty: totalBaseQty, displayQty: numVal, cartUnit: unit } : c);
        }
        return [...prev, { ...item, qty: totalBaseQty, displayQty: numVal, cartUnit: unit }];
      });
    }
  };

  const handleUnitChange = (itemId, newUnit) => {
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((c) => c.id !== id));
    setQtyInput(prev => ({ ...prev, [id]: 0 }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const gstAmount = subtotal * GST_RATE;
  const totalBill = subtotal + gstAmount;

  return (
    <div className="min-h-screen bg-white pb-10 font-sans text-black">
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-slate-100 px-6 h-20 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:opacity-50 transition-opacity">
          <FiArrowLeft size={20} /> BACK
        </button>
        <h1 className="text-2xl font-black tracking-tighter text-black uppercase">Order Inventory</h1>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block text-black">
            <span className="text-[10px] font-black uppercase opacity-40 block tracking-widest">Franchise ID</span>
            <span className="text-lg font-black">{profile?.franchise_id || "..."}</span>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-black transition-all shadow-sm text-black">
            <FiShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          <div className="relative w-full max-w-xl text-black">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-black opacity-60" size={18} />
            <input
              placeholder="SEARCH ITEM NAME OR CODE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-black transition-all text-black font-black placeholder:text-slate-300 uppercase shadow-sm"
            />
          </div>

          <button 
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black border-2 transition-all text-xs uppercase tracking-widest ${
              showAvailableOnly 
              ? "bg-white border-green-700 text-green-800 ring-4 ring-green-50" 
              : "bg-white text-slate-400 border-slate-100 hover:border-black hover:text-black"
            }`}
          >
            <FiCheckCircle size={18} style={{ color: showAvailableOnly ? BRAND_COLOR : "inherit" }} />
            Available Only
          </button>

          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 whitespace-nowrap shadow-sm text-black">
            <FiCalendar size={18} className="text-black opacity-40" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black opacity-40 uppercase leading-none mb-1">Date Today</span>
              <span className="text-sm font-black tracking-tight">{today.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="mb-10 text-black">
          <div className="flex items-center gap-2 mb-4">
            <FiLayers className="opacity-40" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Filter Category</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${
                  selectedCategory === cat 
                  ? "text-white border-transparent shadow-md" 
                  : "bg-white text-black border-slate-100 hover:border-black shadow-sm"
                }`}
                style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredStocks.map((item) => {
            const isOutOfStock = item.quantity <= 0;
            const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
            const isInCart = cart.some(c => c.id === item.id);
            
            return (
              <div key={item.id} className={`relative bg-white p-6 rounded-[2.5rem] transition-all flex flex-col border-2 ${isOutOfStock ? 'border-slate-100 opacity-40' : isInCart ? 'border-black shadow-xl shadow-slate-100' : 'border-slate-100 hover:border-black shadow-sm'}`}>
                {isOutOfStock && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center text-black">
                     <FiLock size={24} className="mb-2" />
                     <span className="font-black text-xs uppercase tracking-widest">Stock Empty</span>
                  </div>
                )}
                <div className="mb-6 text-black">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase opacity-30">#{item.item_code || '---'}</span>
                    <p className="text-xl font-black tracking-tighter">₹{item.price}</p>
                  </div>
                  <h3 className="font-black text-lg leading-tight uppercase min-h-[50px] tracking-tight">{item.item_name}</h3>
                </div>

                <div className="space-y-4 mt-auto">
                  <select 
                    disabled={isOutOfStock} 
                    value={unit} 
                    onChange={(e) => handleUnitChange(item.id, e.target.value)} 
                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-black text-black appearance-none cursor-pointer"
                  >
                    <option value={item.unit}>{item.unit?.toUpperCase()}</option>
                    {item.alt_unit && item.alt_unit !== item.unit && (
                       <option value={item.alt_unit}>{item.alt_unit.toUpperCase()}</option>
                    )}
                  </select>

                  <div className="flex items-center border-2 border-slate-100 rounded-xl h-14 overflow-hidden bg-white">
                    <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] ?? 0) - 1, item.quantity)} className="w-14 h-full flex items-center justify-center hover:bg-slate-50 border-r border-slate-100 text-black font-black"><FiMinus /></button>
                    <input type="number" value={qtyInput[item.id] || ""} placeholder="0" onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)} className="w-full text-center font-black outline-none text-black bg-transparent text-lg" />
                    <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] ?? 0) + 1, item.quantity)} className="w-14 h-full flex items-center justify-center hover:bg-slate-50 border-l border-slate-100 text-black font-black"><FiPlus /></button>
                  </div>
                  
                  <button 
                    onClick={() => handleQtyChange(item.id, (qtyInput[item.id] ?? 0) + 1, item.quantity)} 
                    disabled={isOutOfStock} 
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-md text-white" 
                    style={{ backgroundColor: isOutOfStock ? '#f8f9fa' : BRAND_COLOR, color: isOutOfStock ? '#adb5bd' : 'white' }}
                  >
                    {isOutOfStock ? "NOT AVAILABLE" : isInCart ? "UPDATE ORDER" : "ADD TO ORDER"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStocks.length === 0 && (
          <div className="py-40 text-center text-black">
            <FiSearch size={40} className="mx-auto mb-4 opacity-20" />
            <p className="font-black uppercase text-xs tracking-widest opacity-40">No matching products found</p>
          </div>
        )}
      </div>

      {/* CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-slate-100 text-black">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-white text-black">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Your Order</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-3 hover:bg-slate-50 rounded-full transition-colors text-black"><FiX size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {cart.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <FiShoppingCart size={48} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-xs">Your cart is empty</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse font-black">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="py-4 text-[10px] uppercase tracking-widest opacity-40">Code</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest opacity-40">Item Name</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest opacity-40 text-right">Qty</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest opacity-40 text-right">Subtotal</th>
                        <th className="py-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item) => (
                        <tr key={item.id}>
                          <td className="py-5 text-xs uppercase opacity-40">{item.item_code || '---'}</td>
                          <td className="py-5 uppercase text-sm">{item.item_name}</td>
                          <td className="py-5 text-right text-sm">{item.displayQty} {item.cartUnit}</td>
                          <td className="py-5 text-right text-sm">₹{Math.round(item.price * item.qty)}</td>
                          <td className="py-5 text-center">
                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-8 bg-slate-50 border-t-2 border-slate-100 text-black">
                <div className="max-w-xs ml-auto space-y-3">
                  <div className="flex justify-between text-xs font-black uppercase opacity-40">
                    <span>GST (18%)</span>
                    <span>₹{Math.round(gstAmount)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-black flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total</span>
                    <span className="text-3xl font-black tracking-tighter">₹{Math.round(totalBill)}</span>
                  </div>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full mt-6 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50" 
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {loading ? "PLACING ORDER..." : "Place Order Now"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;