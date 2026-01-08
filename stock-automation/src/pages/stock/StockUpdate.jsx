import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

function StockUpdate() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* FETCH STOCK ITEMS */
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("stocks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setItems(data);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  /* ADD ITEM */
  const addItem = async () => {
    if (!itemName || !quantity) return alert("Fill all fields");

    setLoading(true);

    const { error } = await supabase.from("stocks").insert([
      {
        item_name: itemName,
        quantity: Number(quantity),
      },
    ]);

    if (!error) {
      setItemName("");
      setQuantity("");
      fetchItems();
    }

    setLoading(false);
  };

  /* UPDATE ITEM */
  const updateItem = async (id, newName, newQty) => {
    await supabase
      .from("stocks")
      .update({
        item_name: newName,
        quantity: Number(newQty),
      })
      .eq("id", id);

    fetchItems();
  };

  /* DELETE ITEM */
  const deleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;

    await supabase.from("stocks").delete().eq("id", id);
    fetchItems();
  };

  return (
    <div className="min-h-screen p-8 bg-linear-to-br from-white via-green-50 to-emerald-50">

      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/dashboard/stockmanager")}
          className="px-4 py-2 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 transition"
        >
          ⬅ Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold">📦 Stock Management</h1>
      </div>

      {/* ADD ITEM */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border-2 border-[rgb(0,100,55,0.3)]">
        <h2 className="font-bold mb-4">➕ Add New Item</h2>

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Item name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-xl"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-32 px-4 py-2 border rounded-xl"
          />
          <button
            onClick={addItem}
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-[rgb(0,100,55)] text-white font-bold hover:scale-105 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* STOCK LIST */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-[rgb(0,100,55,0.3)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[rgb(0,100,55)] text-white">
            <tr>
              <th className="p-4 text-left">Item</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Actions</th>
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

            {items.length === 0 && (
              <tr>
                <td colSpan="3" className="p-6 text-center text-gray-500">
                  No stock items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* SINGLE ROW */
function StockRow({ item, onUpdate, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(item.item_name);
  const [qty, setQty] = useState(item.quantity);

  return (
    <tr className="border-b">
      <td className="p-4">
        {edit ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        ) : (
          item.item_name
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="border px-2 py-1 rounded w-20 text-center"
          />
        ) : (
          item.quantity
        )}
      </td>

      <td className="p-4 flex gap-2 justify-center">
        {edit ? (
          <button
            onClick={() => {
              onUpdate(item.id, name, qty);
              setEdit(false);
            }}
            className="px-3 py-1 rounded bg-green-600 text-white"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setEdit(true)}
            className="px-3 py-1 rounded bg-blue-500 text-white"
          >
            Edit
          </button>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-1 rounded bg-red-500 text-white"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export default StockUpdate;
