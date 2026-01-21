import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Plus, Trash2, Edit3, Save, Package } from "lucide-react";

function StockUpdate() {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
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

  const selectClass = "w-full h-[44px] border border-gray-300 rounded-lg px-3 text-sm bg-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 focus:ring-2 focus:ring-[#0b3d2e] focus:border-transparent outline-none transition-all";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* CENTERED HEADER SECTION */}
        <div className="relative flex justify-center items-center mb-10 py-4">
          {/* BACK BUTTON WITH TEXT */}
          <button
            onClick={() => navigate("/dashboard/stockmanager")}
            className="absolute left-0 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white border transition shadow-sm bg-slate-50 text-slate-600 font-semibold text-sm"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          
          <h1 className="text-3xl font-black tracking-tight text-slate-800 text-center">Stock Update</h1>
          
          <div className="absolute right-0 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl shadow-sm">
             <p className="text-emerald-700 font-black text-xs tracking-widest uppercase">
               Franchise ID : {user?.franchise_id || "N/A"}
             </p>
          </div>
        </div>

        {/* ADD ITEM CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Plus size={18} className="text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Add New Inventory</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Item Name</label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name..."
                className="w-full h-[44px] border border-slate-200 bg-slate-50 rounded-xl px-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#0b3d2e] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full h-[44px] border border-slate-200 bg-slate-50 rounded-xl px-3 text-sm text-center focus:bg-white focus:ring-2 focus:ring-[#0b3d2e] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="litre">litre</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Price / Unit</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="₹ 0.00"
                className="w-full h-[44px] border border-slate-200 bg-slate-50 rounded-xl px-3 text-sm text-center focus:bg-white focus:ring-2 focus:ring-[#0b3d2e] outline-none"
              />
            </div>

            <button
              onClick={addItem}
              disabled={loading}
              className="w-full h-[44px] bg-[#0b3d2e] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Adding..." : "Add to Stock"}
            </button>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-5 text-left font-black text-slate-400 uppercase tracking-tighter">Item Information</th>
                  <th className="p-5 text-center font-black text-slate-400 uppercase tracking-tighter">Quantity</th>
                  <th className="p-5 text-center font-black text-slate-400 uppercase tracking-tighter">Unit Type</th>
                  <th className="p-5 text-center font-black text-slate-400 uppercase tracking-tighter">Unit Price</th>
                  <th className="p-5 text-center font-black text-slate-400 uppercase tracking-tighter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((item) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      onUpdate={updateItem}
                      onDelete={deleteItem}
                      selectClass={selectClass}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <Package size={40} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium">No inventory items found. Add your first item above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockRow({ item, onUpdate, onDelete, selectClass }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(item.item_name);
  const [qty, setQty] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [price, setPrice] = useState(item.price);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="p-5">
        {edit ? (
          <input
            className="w-full border border-slate-200 bg-white rounded-lg h-10 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0b3d2e]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <span className="font-bold text-slate-700">{name}</span>
        )}
      </td>

      <td className="p-5 text-center">
        {edit ? (
          <input
            type="number"
            className="border border-slate-200 bg-white rounded-lg h-10 px-2 text-sm w-20 text-center outline-none focus:ring-2 focus:ring-[#0b3d2e]"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        ) : (
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{qty}</span>
        )}
      </td>

      <td className="p-5 text-center">
        {edit ? (
          <select
            className={`${selectClass} h-10 !py-0`}
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
          <span className="text-slate-500 font-medium uppercase text-xs">{unit}</span>
        )}
      </td>

      <td className="p-5 text-center">
        {edit ? (
          <input
            type="number"
            className="border border-slate-200 bg-white rounded-lg h-10 px-2 text-sm w-24 text-center outline-none focus:ring-2 focus:ring-[#0b3d2e]"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        ) : (
          <span className="font-black text-slate-800">₹{price}</span>
        )}
      </td>

      <td className="p-5">
        <div className="flex justify-center gap-2">
          {edit ? (
            <button
              onClick={() => {
                onUpdate(item.id, name, qty, unit, price);
                setEdit(false);
              }}
              className="h-10 px-4 rounded-xl bg-[#0b3d2e] text-white text-xs font-bold hover:opacity-90 flex items-center gap-2 shadow-md"
            >
              <Save size={14} /> Save
            </button>
          ) : (
            <button
              onClick={() => setEdit(true)}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 transition"
            >
              <Edit3 size={14} /> Edit
            </button>
          )}

          <button
            onClick={() => onDelete(item.id)}
            className="h-10 px-4 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-600 hover:text-white transition flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default StockUpdate;