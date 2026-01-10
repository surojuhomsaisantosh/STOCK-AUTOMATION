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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  /* ADD TO CART — +1 AND SYNC */
  const addToCart = (item) => {
    const currentQty = Number(qtyInput[item.id] || 0);
    const newQty = currentQty + 1;

    const conversion = UNIT_MAP[item.unit];
    const desiredQty = newQty * conversion.factor;

    if (desiredQty > item.quantity) {
      alert(`You can only order up to ${item.quantity} ${item.unit}`);
      return;
    }

    setQtyInput({ ...qtyInput, [item.id]: newQty });

    const exists = cart.find((c) => c.id === item.id);

    if (exists) {
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, qty: desiredQty } : c
        )
      );
    } else {
      setCart([...cart, { ...item, qty: desiredQty }]);
    }
  };

  /* REMOVE / UPDATE FROM CART */
  const updateAfterMinus = (item) => {
    const currentQty = Number(qtyInput[item.id] || 0);
    const newQty = Math.max(currentQty - 1, 0);

    const conversion = UNIT_MAP[item.unit];
    const desiredQty = newQty * conversion.factor;

    setQtyInput({ ...qtyInput, [item.id]: newQty });

    if (newQty === 0) {
      setCart(cart.filter((c) => c.id !== item.id));
      return;
    }

    setCart(
      cart.map((c) =>
        c.id === item.id ? { ...c, qty: desiredQty } : c
      )
    );
  };

  /* REMOVE FROM CART */
  const removeFromCart = (id) => {
    setCart(cart.filter((c) => c.id !== id));
    setQtyInput((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, address, branch_location, phone, email")
      .eq("id", user.id)
      .single();

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

    await Promise.all(
      cart.map((item) =>
        supabase
          .from("stocks")
          .update({ quantity: item.quantity - item.qty })
          .eq("id", item.id)
      )
    );

    setCart([]);
    setQtyInput({});
    setIsCartOpen(false);
    setLoading(false);
    fetchStocks();
    setShowSuccessModal(true); // ✅ already here
  };

  const filteredStocks = stocks.filter((s) =>
    s.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="relative max-w-7xl mx-auto flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="font-medium">
          ← Back
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
          Orders
        </h1>
      </div>

      {/* SEARCH + CART */}
      <div className="max-w-7xl mx-auto flex justify-end gap-4 mb-6">
        <input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl border w-64"
        />

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-3 bg-white border rounded-xl"
        >
          🛒
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs px-2 rounded-full">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* PRODUCTS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStocks.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold">{item.item_name}</h3>
            <p className="text-emerald-600 font-black">₹{item.price}</p>

            <div className="flex gap-2 items-center my-3">
              <button
                onClick={() => updateAfterMinus(item)}
                className="px-3 py-2 border rounded-lg"
              >
                −
              </button>

              <input
                type="number"
                value={qtyInput[item.id] || ""}
                onChange={(e) =>
                  setQtyInput({
                    ...qtyInput,
                    [item.id]: Number(e.target.value),
                  })
                }
                className="w-full text-center border rounded-lg py-2"
              />

              <button
                onClick={() =>
                  setQtyInput({
                    ...qtyInput,
                    [item.id]: (qtyInput[item.id] || 0) + 1,
                  })
                }
                className="px-3 py-2 border rounded-lg"
              >
                +
              </button>
            </div>

            <button
              onClick={() => addToCart(item)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* CART POPUP */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl">
            <button onClick={() => setIsCartOpen(false)} className="float-right">
              ✕
            </button>

            <h3 className="text-xl font-bold mb-4">Cart</h3>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">{item.item_name}</td>
                    <td className="p-3 text-center">{item.qty}</td>
                    <td className="p-3 text-right">
                      ₹{item.price * item.qty}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-6 font-bold text-lg">
              <span>Total</span>
              <span>₹{totalAmount}</span>
            </div>

            <button
              onClick={handleCheckout}
              className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold"
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* ✅ SUCCESS POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl text-center w-full max-w-sm">
            <h3 className="text-xl font-bold text-emerald-600">
              Order Placed Successfully
            </h3>
            <p className="mt-2 text-slate-600">
              Your order has been placed and processed.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;
