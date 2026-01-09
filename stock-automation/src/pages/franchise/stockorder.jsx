import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

/* UNIT CONVERSION MAP */
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
  const [search, setSearch] = useState("");
  const [qtyInput, setQtyInput] = useState({});
  const [unitInput, setUnitInput] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  /* FETCH STOCKS */
  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    const { data } = await supabase
      .from("stocks")
      .select("*")
      .order("item_name");

    setStocks(data || []);
  };

  /* ADD TO CART */
  const addToCart = (item) => {
    if (item.quantity <= 0) {
      alert(`❌ "${item.item_name}" is out of stock`);
      return;
    }

    const inputQty = Number(qtyInput[item.id] || 0);
    const selectedUnit = unitInput[item.id] || item.unit;

    if (inputQty <= 0) {
      alert("⚠️ Please enter a valid quantity");
      return;
    }

    const conversion = UNIT_MAP[selectedUnit];
    if (!conversion || conversion.base !== item.unit) {
      alert("❌ Invalid unit selected");
      return;
    }

    const finalQty = inputQty * conversion.factor;

    const existing = cart.find((c) => c.id === item.id);
    const alreadyInCartQty = existing ? existing.qty : 0;

    if (alreadyInCartQty + finalQty > item.quantity) {
      alert(
        `❌ Cannot add more than available stock.\nAvailable: ${item.quantity} ${item.unit}`
      );
      return;
    }

    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + finalQty } : c
        )
      );
    } else {
      setCart([...cart, { ...item, qty: finalQty }]);
    }

    setQtyInput({ ...qtyInput, [item.id]: "" });
  };

  /* TOTAL */
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  /* CHECKOUT */
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setLoading(true);

    /* RECHECK STOCK */
    const { data: latestStocks } = await supabase
      .from("stocks")
      .select("id, quantity");

    for (const item of cart) {
      const currentStock = latestStocks.find((s) => s.id === item.id);
      if (!currentStock || item.qty > currentStock.quantity) {
        alert(
          `❌ Stock changed for "${item.item_name}". Please refresh and try again.`
        );
        setLoading(false);
        return;
      }
    }

    /* AUTH USER */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("❌ User not authenticated");
      setLoading(false);
      return;
    }

    /* PROFILE SNAPSHOT */
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, address, branch_location, phone, email")
      .eq("id", user.id)
      .single();

    /* CREATE INVOICE */
    const { data: invoice } = await supabase
      .from("invoices")
      .insert([
        {
          total_amount: totalAmount,
          created_by: user.id,
          customer_name: profile.name,
          customer_address: profile.address,
          branch_location: profile.branch_location,
          customer_phone: profile.phone,
          customer_email: profile.email,
        },
      ])
      .select()
      .single();

    /* INSERT INVOICE ITEMS */
    await supabase.from("invoice_items").insert(
      cart.map((item) => ({
        invoice_id: invoice.id,
        stock_id: item.id,
        item_name: item.item_name,
        quantity: item.qty,
        unit: item.unit,
        price: item.price,
      }))
    );

    /* UPDATE STOCK */
    for (const item of cart) {
      await supabase
        .from("stocks")
        .update({
          quantity: item.quantity - item.qty,
        })
        .eq("id", item.id);
    }

    /* RESET STATE */
    setCart([]);
    setIsCartOpen(false);
    setLoading(false);
    fetchStocks();

    alert("✅ Invoice generated successfully");

    /* 👉 NAVIGATE TO INVOICE PAGE */
    navigate("/franchise/franchiseinvoices", {
      state: { invoiceId: invoice.id },
    });
  };

  const filteredStocks = stocks.filter((s) =>
    s.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-emerald-600 font-medium"
        >
          ← Back
        </button>

        <div className="flex gap-4">
          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border"
          />

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 bg-white border rounded-xl shadow"
          >
            🛒
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs px-2 rounded-full">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStocks.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold truncate">{item.item_name}</h3>
            <p className="text-emerald-600 font-black">₹{item.price}</p>
            <p className="text-xs text-slate-400 mb-2">
              Available: {item.quantity} {item.unit}
            </p>

            <div className="flex gap-2 my-3">
              <input
                type="number"
                placeholder="Qty"
                value={qtyInput[item.id] || ""}
                onChange={(e) =>
                  setQtyInput({ ...qtyInput, [item.id]: e.target.value })
                }
                className="w-2/3 px-3 py-2 rounded-xl border"
              />

              <select
                value={unitInput[item.id] || item.unit}
                onChange={(e) =>
                  setUnitInput({ ...unitInput, [item.id]: e.target.value })
                }
                className="w-1/3 px-2 py-2 rounded-xl border"
              >
                {Object.keys(UNIT_MAP)
                  .filter((u) => UNIT_MAP[u].base === item.unit)
                  .map((u) => (
                    <option key={u}>{u}</option>
                  ))}
              </select>
            </div>

            <button
              disabled={item.quantity <= 0}
              onClick={() => addToCart(item)}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:bg-slate-300"
            >
              {item.quantity > 0 ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        ))}
      </div>

      {/* CART */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">
              Cart ({cart.length})
            </h3>

            {cart.map((item) => (
              <div key={item.id} className="flex justify-between mb-2">
                <span>
                  {item.item_name} – {item.qty} {item.unit}
                </span>
                <span>₹{item.qty * item.price}</span>
              </div>
            ))}

            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between font-black mb-4">
                <span>Total</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black"
              >
                {loading ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;
