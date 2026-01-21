import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

/**
 * SHARED HELPER LOGIC (Inline for portability)
 * In a real app, move to src/utils/stockHelpers.js
 */
const SEPARATOR = " |METADATA|";

export const parseItemName = (fullName) => {
    if (!fullName || !fullName.includes(SEPARATOR)) {
        return {
            name: fullName,
            meta: { u: "kg", t: 0, gst: 0, sgst: 0 } // Default fallback
        };
    }
    const [name, metaStr] = fullName.split(SEPARATOR);
    try {
        const meta = JSON.parse(metaStr);
        return { name, meta };
    } catch (e) {
        return { name, meta: { u: "kg", t: 0, gst: 0, sgst: 0 } };
    }
};

export const serializeItemName = (name, meta) => {
    return `${name}${SEPARATOR}${JSON.stringify(meta)}`;
};

function CentralStockMaster() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Form State
    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");

    // Extended Fields
    const [unitVal, setUnitVal] = useState("kg"); // Default: kg
    const [gst, setGst] = useState("");
    const [sgst, setSgst] = useState("");
    const [threshold, setThreshold] = useState("10");

    const fetchItems = async () => {
        const { data } = await supabase
            .from("stocks")
            .select("*")
            .order("created_at", { ascending: false });

        if (data) setItems(data);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const addItem = async () => {
        if (!itemName || !quantity || !price) return alert("Please fill required fields (Name, Qty, Price)");
        setLoading(true);

        const meta = {
            u: unitVal,
            t: Number(threshold) || 0,
            gst: Number(gst) || 0,
            sgst: Number(sgst) || 0
        };

        const fullName = serializeItemName(itemName, meta);

        // We store the generic unit logic in the NAME suffix.
        // Ideally we also send a valid 'unit' to the DB column to pass the constraint.
        // We assume 'kg' or 'pcs' are valid. We use `unitVal` there directly if it matches the constraint, 
        // or fallback to 'pcs' if the user chooses something wild, but here our dropdown only has standard units.

        const { error } = await supabase.from("stocks").insert([
            {
                item_name: fullName,
                quantity: Number(quantity),
                price: Number(price),
                unit: unitVal, // Passes the valid unit to the checked column
            },
        ]);

        if (error) {
            alert("Error adding item: " + error.message);
        } else {
            // Reset Form
            setItemName("");
            setQuantity("");
            setPrice("");
            setUnitVal("kg");
            setGst("");
            setSgst("");
            setThreshold("10");
            fetchItems();
            alert("Item added successfully!");
        }
        setLoading(false);
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Delete this item? This will remove it from Stock Manager view.")) return;
        await supabase.from("stocks").delete().eq("id", id);
        fetchItems();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
            {/* HEADER */}
            <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/dashboard/central")}
                        className="text-gray-500 hover:text-black transition"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Central Stock Master
                    </h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: ADD ITEM FORM */}
                <div className="lg:col-span-1">
                    {/* Card fixed size/style */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-emerald-600 rounded-full block"></span>
                            Add New Item
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Item Name</label>
                                <input
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="e.g. Premium Sugar"
                                    className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Initial Qty</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="0"
                                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Unit</label>
                                    <select
                                        value={unitVal}
                                        onChange={(e) => setUnitVal(e.target.value)}
                                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none bg-white"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="litre">litre</option>
                                        <option value="ml">ml</option>
                                        <option value="pcs">pcs</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Price (₹)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">GST (%)</label>
                                    <input
                                        type="number"
                                        value={gst}
                                        onChange={(e) => setGst(e.target.value)}
                                        placeholder="0"
                                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">SGST (%)</label>
                                    <input
                                        type="number"
                                        value={sgst}
                                        onChange={(e) => setSgst(e.target.value)}
                                        placeholder="0"
                                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed border-gray-200">
                                <label className="block text-xs font-bold text-red-700 mb-1.5 uppercase tracking-wider">Low Stock Threshold</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={threshold}
                                        onChange={(e) => setThreshold(e.target.value)}
                                        placeholder="10"
                                        className="w-full h-12 border border-red-100 bg-red-50/50 rounded-xl px-4 text-sm outline-none text-red-700 font-medium"
                                    />
                                    <span className="absolute right-3 top-3.5 text-xs text-red-400 font-medium">limit</span>
                                </div>
                            </div>

                            <button
                                onClick={addItem}
                                disabled={loading}
                                className="w-full h-14 bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-[0.98] transition mt-2"
                            >
                                {loading ? "Adding..." : "+ Add to Master List"}
                            </button>

                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: LIST */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 text-sm">Active Inventory Items</h3>
                            <span className="text-xs font-medium text-gray-400">{items.length} items found</span>
                        </div>

                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 w-[30%]">Item Name</th>
                                        <th className="p-4">Unit</th>
                                        <th className="p-4">Price</th>
                                        <th className="p-4">Tax (G/S)</th>
                                        <th className="p-4">Threshold</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => {
                                        const { name, meta } = parseItemName(item.item_name);
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/80 transition group">
                                                <td className="p-4 font-medium text-gray-900">
                                                    {name}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                                                        {meta.u}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium">₹{item.price}</td>
                                                <td className="p-4 text-gray-500 text-xs">
                                                    {meta.gst}% / {meta.sgst}%
                                                </td>
                                                <td className="p-4">
                                                    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded w-fit">
                                                        ≤ {meta.t}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => deleteItem(item.id)}
                                                        className="text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                                                No items in stock master. Add one from the left panel.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARD VIEW */}
                        <div className="md:hidden p-4 space-y-4">
                            {items.map((item) => {
                                const { name, meta } = parseItemName(item.item_name);
                                return (
                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">{name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-600 uppercase">
                                                        {meta.u}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        GST: {meta.gst}% / SGST: {meta.sgst}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-emerald-700 text-lg">₹{item.price}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50/50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Threshold</span>
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                    ≤ {meta.t}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => deleteItem(item.id)}
                                                className="text-red-500 font-medium text-sm px-3 py-1.5 rounded-lg active:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {items.length === 0 && (
                                <div className="text-center py-8 text-gray-400 italic">
                                    No items found. Use form above to add.
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}

export default CentralStockMaster;
