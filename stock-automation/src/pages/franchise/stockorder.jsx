import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiTrash2, FiPlus, FiMinus, FiShoppingCart, FiAlertCircle } from "react-icons/fi";

const BRAND_COLOR = "rgb(0, 100, 55)";

const UNIT_MAP = {
  g: { base: "kg", factor: 0.001 },
  kg: { base: "kg", factor: 1 },
  ml: { base: "litre", factor: 0.001 },
  litre: { base: "litre", factor: 1 },
  pcs: { base: "pcs", factor: 1 },
};

function StockOrder() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [qtyInput, setQtyInput] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [stockAlert, setStockAlert] = useState({ show: false, max: 0, unit: "" });

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
  };

  const handleQtyChange = (itemId, val, maxAvailable, unit) => {
    const numVal = Math.max(0, Number(val));
    const conversion = UNIT_MAP[unit] || { factor: 1 };
    if (numVal * conversion.factor > maxAvailable) {
      setStockAlert({ show: true, max: maxAvailable, unit: unit });
      setQtyInput({ ...qtyInput, [itemId]: Math.floor(maxAvailable / conversion.factor) });
    } else {
      setQtyInput({ ...qtyInput, [itemId]: numVal });
    }
  };

  const addToCart = (item) => {
    const currentQty = Number(qtyInput[item.id] || 0);
    if (currentQty <= 0) return;
    const conversion = UNIT_MAP[item.unit] || { factor: 1 };
    const desiredQty = currentQty * conversion.factor;

    if (desiredQty > item.quantity) {
      setStockAlert({ show: true, max: item.quantity, unit: item.unit });
      return;
    }

    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      setCart(cart.map((c) => (c.id === item.id ? { ...c, qty: desiredQty, displayQty: currentQty } : c)));
    } else {
      setCart([...cart, { ...item, qty: desiredQty, displayQty: currentQty }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((c) => c.id !== id));
    setQtyInput((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: invoice } = await supabase.from("invoices").insert([{
        total_amount: totalAmount, created_by: user.id, customer_name: prof.name,
        branch_location: prof.branch_location, customer_phone: prof.phone,
      }]).select().single();

      await supabase.from("invoice_items").insert(
        cart.map((item) => ({
          invoice_id: invoice.id, stock_id: item.id, item_name: item.item_name,
          quantity: item.qty, unit: item.unit, price: item.price,
        }))
      );

      await Promise.all(cart.map((item) => supabase.from("stocks").update({ quantity: item.quantity - item.qty }).eq("id", item.id)));
      setCart([]); setQtyInput({}); setIsCartOpen(false); fetchStocks(); setShowSuccessModal(true);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white pb-10 font-sans text-black">
      {/* COMPACT TOP BAR - INCREASED HEIGHT FOR LARGER TEXT */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-6 h-20 flex items-center">
        <div className="flex-1 flex items-center">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-black transition-colors">
            <FiArrowLeft size={24} />
          </button>
        </div>
        
        {/* CENTERED HEADING - INCREASED SIZE */}
        <h1 className="flex-1 text-center text-3xl font-black tracking-tighter text-black uppercase">
          Inventory
        </h1>
        
        <div className="flex-1 flex items-center justify-end gap-6">
          {/* FRANCHISE ID - INCREASED SIZE */}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Franchise ID</p>
            <p className="text-xl font-black uppercase text-black leading-none">{profile?.franchise_id || "3"}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all active:scale-95">
            <FiShoppingCart size={22} style={{ color: BRAND_COLOR }} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 text-white text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        {/* SEARCH BAR */}
        <div className="relative mb-10 flex justify-center">
          <div className="relative w-full max-w-xl group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={20} />
            <input
              placeholder="Search premium inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:border-black shadow-sm transition-all"
            />
          </div>
        </div>

        {/* 4-COLUMN GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {stocks.filter(s => s.item_name.toLowerCase().includes(search.toLowerCase())).map((item) => (
            <div key={item.id} className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] hover:border-black transition-all flex flex-col justify-between h-64 shadow-sm hover:shadow-xl">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">{item.unit}</span>
                  <p className="text-xl font-black text-black leading-none">₹{item.price}</p>
                </div>
                {/* ITEM NAME - BOLD & LARGER */}
                <h3 className="font-black text-black text-lg leading-tight line-clamp-2 uppercase tracking-tight">
                  {item.item_name}
                </h3>
              </div>

              <div className="mt-auto pt-4">
                <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 h-12 overflow-hidden mb-3">
                  <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] || 0) - 1, item.quantity, item.unit)} className="w-12 h-full flex items-center justify-center hover:bg-slate-200 text-black">
                    <FiMinus size={16} />
                  </button>
                  <input
                    type="number"
                    value={qtyInput[item.id] || ""}
                    onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity, item.unit)}
                    placeholder="0"
                    className="w-full bg-transparent text-center font-black text-lg outline-none border-none text-black"
                  />
                  <button onClick={() => handleQtyChange(item.id, (qtyInput[item.id] || 0) + 1, item.quantity, item.unit)} className="w-12 h-full flex items-center justify-center hover:bg-slate-200 text-black">
                    <FiPlus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  disabled={!qtyInput[item.id]}
                  className="w-full py-3.5 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 shadow-md hover:brightness-110"
                  style={{ backgroundColor: qtyInput[item.id] ? BRAND_COLOR : '' }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STOCK LIMIT ALERT */}
      {stockAlert.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[110] p-4 text-black text-center">
          <div className="bg-white p-10 rounded-[3rem] max-w-sm w-full shadow-2xl">
            <FiAlertCircle size={48} className="mx-auto mb-6 text-red-600" />
            <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">Stock Limit<br/>Reached</h3>
            <p className="text-slate-500 text-sm mt-4 leading-relaxed font-medium">
              Only <span className="font-black text-black">{stockAlert.max} {stockAlert.unit}</span> left in stock. <br/>Contact <span className="font-black text-black">ADMIN</span> for bulk ordering.
            </p>
            <button onClick={() => setStockAlert({ ...stockAlert, show: false })} className="mt-8 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl">
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col">
             <div className="flex justify-between items-center mb-8 border-b-2 border-slate-100 pb-6">
                <h2 className="text-xl font-black tracking-widest uppercase text-black">Shopping Cart ({cart.length})</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-black transition-colors"><FiPlus className="rotate-45" size={32} /></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[2rem] border-2 border-slate-100 transition-all hover:bg-white hover:border-black group">
                    <div className="flex-1 pr-4">
                      <p className="font-black text-sm uppercase text-black mb-1 leading-tight">{item.item_name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.displayQty} {item.unit} x ₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="font-black text-lg text-black">₹{item.price * item.qty}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-600 transition-colors"><FiTrash2 size={20} /></button>
                    </div>
                  </div>
                ))}
             </div>
             <div className="pt-8 border-t-2 border-slate-100 mt-6">
                <div className="flex justify-between mb-8 items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Amount</span>
                  <span className="text-4xl font-black leading-none text-black tracking-tighter">₹{totalAmount}</span>
                </div>
                <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:translate-y-1 flex justify-center items-center gap-4" style={{ backgroundColor: BRAND_COLOR }}>
                  {loading ? "PROCESSING..." : <>PLACE ORDER <FiShoppingCart size={20}/></>}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex justify-center items-center z-[120] p-4">
          <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: 'rgba(0, 100, 55, 0.1)' }}>
              <FiShoppingCart size={32} style={{ color: BRAND_COLOR }} />
            </div>
            <h3 className="text-2xl font-black uppercase text-black leading-tight">Order<br/>Received</h3>
            <p className="text-slate-500 text-xs mt-4 font-bold tracking-wide uppercase">Inventory synced successfully</p>
            <button onClick={() => setShowSuccessModal(false)} className="mt-10 w-full py-5 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95">CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;