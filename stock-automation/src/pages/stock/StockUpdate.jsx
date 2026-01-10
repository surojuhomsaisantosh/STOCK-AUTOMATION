import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function StockUpdate() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchItems = async () => {
    const { data } = await supabase
      .from("stocks")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async () => {
    if (!itemName || !quantity || !price) return;
    setLoading(true);

    await supabase.from("stocks").insert([
      {
        item_name: itemName,
        quantity: Number(quantity),
        unit,
        price: Number(price),
      },
    ]);

    setItemName("");
    setQuantity("");
    setUnit("pcs");
    setPrice("");
    fetchItems();
    setLoading(false);
  };

  const updateItem = async (id, name, qty, unit, price) => {
    await supabase
      .from("stocks")
      .update({
        item_name: name,
        quantity: Number(qty),
        unit,
        price: Number(price),
      })
      .eq("id", id);

    fetchItems();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await supabase.from("stocks").delete().eq("id", id);
    fetchItems();
  };

  return (
    <div className="min-h-screen bg-white p-10">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/dashboard/stockmanager")}
          className="text-sm font-medium text-gray-700 hover:text-black"
        >
          ← Back
        </button>

        <h1 className="text-xl font-semibold text-black">
          Stock Management
        </h1>
      </div>

      {/* ADD ITEM */}
      <div className="border border-gray-300 rounded-xl p-6 mb-10">
        <h2 className="text-sm font-semibold mb-6 text-black">
          Add Item
        </h2>

        {/* FORM GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">

          {/* ITEM NAME */}
          <div className="lg:col-span-2">
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Item name"
              className="w-full h-[44px] border border-gray-300 rounded-lg px-4 text-sm"
            />
          </div>

          {/* QTY */}
          <div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              className="w-full h-[44px] border border-gray-300 rounded-lg px-3 text-sm text-center"
            />
          </div>

          {/* UNIT (DROPDOWN – FIXED) */}
          <div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-[44px] border border-gray-300 rounded-lg px-3 text-sm bg-white"
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="litre">litre</option>
              <option value="ml">ml</option>
            </select>
          </div>

          {/* PRICE */}
          <div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price / unit"
              className="w-full h-[44px] border border-gray-300 rounded-lg px-3 text-sm text-center"
            />
          </div>

          {/* BUTTON */}
          <div>
            <button
              onClick={addItem}
              disabled={loading}
              style={{ backgroundColor: "#0b3d2e", color: "#fff" }}
              className="w-full h-[44px] rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Item</th>
              <th className="p-4 text-center">Qty</th>
              <th className="p-4 text-center">Unit</th>
              <th className="p-4 text-center">Price</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <StockRow
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ROW */
function StockRow({ item, onUpdate, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(item.item_name);
  const [qty, setQty] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [price, setPrice] = useState(item.price);

  return (
    <tr className="border-t">
      <td className="p-4">
        {edit ? (
          <input
            className="border rounded-lg h-9 px-2 text-sm w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          name
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <input
            type="number"
            className="border rounded-lg h-9 px-2 text-sm w-20 text-center"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        ) : (
          qty
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <select
            className="border rounded-lg h-9 px-2 text-sm bg-white"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="pcs">pcs</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="litre">litre</option>
            <option value="ml">ml</option>
          </select>
        ) : (
          unit
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <input
            type="number"
            className="border rounded-lg h-9 px-2 text-sm w-24 text-center"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        ) : (
          price
        )}
      </td>

      <td className="p-4 flex justify-center gap-3">
        {edit ? (
          <button
            onClick={() => {
              onUpdate(item.id, name, qty, unit, price);
              setEdit(false);
            }}
            style={{ backgroundColor: "#0b3d2e", color: "#fff" }}
            className="h-9 px-5 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setEdit(true)}
            className="h-9 px-5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:border-black transition"
          >
            Edit
          </button>
        )}

        <button
          onClick={() => onDelete(item.id)}
          style={{ backgroundColor: "#dc2626", color: "#fff" }}
          className="h-9 px-5 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export default StockUpdate;
