import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
    Edit3, Trash2, X, Plus, Search,
    Calendar, ArrowLeft, AlertTriangle, Globe, EyeOff, Info,
    ChevronUp, ChevronDown, CheckCircle, Package, Tag, Hash,
    ShoppingCart
} from "lucide-react";

// --- CONSTANTS ---
const BRAND_COLOR = "rgb(0, 100, 55)";

// --- HELPER COMPONENTS ---
const TaxToggle = ({ value, onSelect, brandColor }) => (
    <div className="flex bg-slate-100 rounded-lg p-1 h-[42px] w-full border border-slate-200">
        {["Exclusive", "Inclusive"].map((mode) => (
            <button key={mode} onClick={() => onSelect(mode)} type="button"
                className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                ${value === mode ? "text-white shadow-sm" : "text-black hover:text-slate-600"}`}
                style={value === mode ? { backgroundColor: brandColor } : {}}
            >
                {mode}
            </button>
        ))}
    </div>
);

const StockUnitToggle = ({ value, onSelect, brandColor, primaryLabel, altLabel, altDisabled }) => (
    <div className="flex bg-slate-100 rounded-lg p-1 h-[42px] w-full border border-slate-200">
        <button onClick={() => onSelect("Primary")} type="button"
            className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
            ${value === "Primary" ? "text-white shadow-sm" : "text-black hover:text-slate-600"}`}
            style={value === "Primary" ? { backgroundColor: brandColor } : {}}
        >
            {primaryLabel}
        </button>
        <button onClick={() => !altDisabled && onSelect("Alt")} type="button" disabled={altDisabled}
            className={`flex-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
            ${value === "Alt" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}
            ${altDisabled ? "opacity-50 cursor-not-allowed text-slate-300" : ""}`}
            style={value === "Alt" ? { backgroundColor: brandColor } : {}}
        >
            {altLabel}
        </button>
    </div>
);

const CustomSelect = ({ name, value, onChange, options }) => (
    <div className="relative w-full h-[42px]">
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full h-full bg-slate-50 rounded-lg border border-slate-200 pl-3 pr-8 outline-none font-bold text-black text-xs uppercase appearance-none"
        >
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
);

const LabeledInput = ({ label, name, value, onChange, placeholder, unitLabel, colorClass = "bg-slate-50 text-black", unitColorClass = "bg-slate-100 text-slate-500", disabled = false }) => (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <label className={`text-[10px] font-bold uppercase block mb-1 ${label && label.includes("Min") ? "text-red-600" : "text-black"}`}>{label}</label>
        <div className={`flex w-full h-[42px] border rounded-lg overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[rgb(0,100,55)] ${label && label.includes("Min") ? "border-red-100 focus-within:ring-red-500" : "border-slate-200"}`}>
            <input
                type="number"
                step="0.01"
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`flex-1 px-3 outline-none font-black text-sm border-none h-full w-full ${colorClass} ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
            />
            <div className={`flex items-center justify-center px-3 border-l text-[10px] font-bold uppercase min-w-[48px] h-full whitespace-nowrap ${unitColorClass} ${label && label.includes("Min") ? "border-red-100" : "border-slate-200"}`}>
                {unitLabel || "-"}
            </div>
        </div>
    </div>
);

const SortArrows = ({ columnKey, sortConfig, brandColor }) => {
    const isActive = sortConfig.key === columnKey;
    return (
        <div className="flex flex-col ml-1 transition-opacity">
            <ChevronUp size={8} strokeWidth={4} className={`-mb-0.5 ${isActive && sortConfig.direction === 'ascending' ? 'opacity-100' : 'opacity-20'}`} style={isActive && sortConfig.direction === 'ascending' ? { color: brandColor } : {}} />
            <ChevronDown size={8} strokeWidth={4} className={`${isActive && sortConfig.direction === 'descending' ? 'opacity-100' : 'opacity-20'}`} style={isActive && sortConfig.direction === 'descending' ? { color: brandColor } : {}} />
        </div>
    );
};

const CompanyBadge = ({ value }) => {
    if (!value || value === "All") return <span className="text-emerald-600">All</span>;
    const list = value.split(",").map(c => c.trim()).filter(Boolean);
    if (list.length === 0) return <span className="text-emerald-600">All</span>;
    if (list.length === 1) return <span className="text-blue-600">{list[0]}</span>;
    return <span className="text-blue-600 cursor-help" title={list.join(", ")}>{list.length} Companies</span>;
};
// --- MAIN COMPONENT ---
function StockUpdate() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- STATE ---
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
    const [companies, setCompanies] = useState([]);

    // Toggle for Stock Entry Mode (Primary vs Alt)
    const [stockEntryMode, setStockEntryMode] = useState("Primary");

    const [showLowStock, setShowLowStock] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [showOfflineOnly, setShowOfflineOnly] = useState(false);

    const [sortConfig, setSortConfig] = useState({ key: 'item_name', direction: 'ascending' });
    const [editingId, setEditingId] = useState(null);
    const companyDropdownRef = useRef(null);

    // Close company filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
                setIsCompanyFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const initialForm = {
        item_name: "",
        company_availability: [],
        quantity: "",
        quantity_alt: "",
        unit: "pcs",
        price: "",
        description: "",
        category: "",
        alt_unit: "None",
        item_code: "",
        hsn_code: "",
        gst_rate: "",
        sales_tax_inc: "Exclusive",
        purchase_price: "",
        purchase_tax_inc: "Exclusive",
        mrp: "",
        threshold: "",
        threshold_alt: "",
        online_store: false,
        min_order_quantity: "",
        min_order_quantity_alt: "",
        moq_unit: "pcs",
        purchase_unit: "pcs"
    };
    const [formData, setFormData] = useState(initialForm);

    const categories = useMemo(() => {
        return ["All", ...new Set(items.map(item => item.category || "Uncategorized"))];
    }, [items]);

    // --- FETCH DATA ---
    const fetchCompanies = async () => {
        const { data, error } = await supabase.from("companies").select("company_name").order("company_name", { ascending: true });
        if (error) console.error("Error fetching companies:", error);
        if (data) setCompanies(data.map(c => c.company_name.replace(/,/g, "")));
    };

    const fetchItems = async () => {
        setLoading(true);
        // Fetch ALL items with pagination (Supabase default limit is 1000)
        let allItems = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
            const { data, error } = await supabase.from("stocks").select("*").order("item_name", { ascending: true }).range(from, from + pageSize - 1);
            if (error) { console.error("Error fetching stocks:", error); break; }
            if (data && data.length > 0) {
                allItems = [...allItems, ...data];
                from += pageSize;
                if (data.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
        }
        setItems(allItems);
        setLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
        fetchItems();
    }, [user]);

    // --- FILTER & SORT ---
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let results = [...items];

        if (showLowStock) results = results.filter(item => (Number(item.quantity) || 0) <= (Number(item.threshold) || 0));
        if (showAvailableOnly) results = results.filter(item => (Number(item.quantity) || 0) > 0);
        if (showOnlineOnly) results = results.filter(item => item.online_store === true);
        else if (showOfflineOnly) results = results.filter(item => item.online_store === false);
        if (selectedCategory !== "All") results = results.filter(item => (item.category || "Uncategorized") === selectedCategory);
        if (selectedCompanies.length > 0) {
            results = results.filter(item => {
                const comp = item.company_availability || "All";
                if (comp === "All") return true;
                const compList = comp.split(",").map(c => c.trim()).filter(Boolean);
                if (compList.length === 0) return true;
                return selectedCompanies.some(c => compList.includes(c));
            });
        }

        if (term) {
            results = results.filter(item =>
                item.item_name?.toLowerCase().includes(term) ||
                item.item_code?.toLowerCase().includes(term) ||
                item.hsn_code?.toLowerCase().includes(term)
            );
        }

        if (sortConfig.key) {
            results.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (aVal === null) return 1; if (bVal === null) return -1;
                if (typeof aVal === 'number') return sortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
                aVal = aVal.toString().toLowerCase(); bVal = bVal.toString().toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return results;
    }, [searchTerm, selectedCategory, selectedCompanies, items, showLowStock, showAvailableOnly, showOnlineOnly, showOfflineOnly, sortConfig]);

    const [visibleCount, setVisibleCount] = useState(50);
    useEffect(() => {
        setVisibleCount(50);
    }, [filteredItems]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const calculateWithTax = (price, taxInc) => {
        const p = parseFloat(price) || 0;
        const gst = parseFloat(formData.gst_rate) || 0;
        if (!p) return "0.00";
        if (taxInc === "Inclusive") return p.toFixed(2);
        return (p + (p * gst) / 100).toFixed(2);
    };

    // --- ACTIONS ---
    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'alt_unit' && value === 'None') {
                setStockEntryMode("Primary");
            }
            return newData;
        });
    };

    const toggleOnline = () => { setShowOnlineOnly(!showOnlineOnly); if (!showOnlineOnly) setShowOfflineOnly(false); };
    const toggleOffline = () => { setShowOfflineOnly(!showOfflineOnly); if (!showOfflineOnly) setShowOnlineOnly(false); };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCategory("All");
        setSelectedCompanies([]);
        setIsCompanyFilterOpen(false);
        setShowLowStock(false);
        setShowAvailableOnly(false);
        setShowOnlineOnly(false);
        setShowOfflineOnly(false);
    };

    // --- OPEN EDIT ---
    const openEdit = (item) => {
        setEditingId(item.id);

        const hasAltStock = (Number(item.quantity_alt) || 0) > 0;
        const hasPrimaryStock = (Number(item.quantity) || 0) > 0;
        if (hasAltStock && !hasPrimaryStock) {
            setStockEntryMode("Alt");
        } else {
            setStockEntryMode("Primary");
        }

        const compAvail = item.company_availability || "All";
        let compArray = compAvail === "All" ? [] : compAvail.split(",").map(c => c.trim()).filter(Boolean);
        // Remove orphaned company references (companies that no longer exist)
        compArray = compArray.filter(c => companies.includes(c));

        setFormData({
            ...item,
            company_availability: compArray,
            quantity: item.quantity?.toString() || "",
            quantity_alt: item.quantity_alt?.toString() || "",
            price: item.price?.toString() || "",
            gst_rate: item.gst_rate?.toString() || "",
            purchase_price: item.purchase_price?.toString() || "",
            mrp: item.mrp?.toString() || "",
            threshold: item.threshold?.toString() || "",
            threshold_alt: item.threshold_alt?.toString() || "",
            min_order_quantity: item.min_order_quantity?.toString() || "",
            min_order_quantity_alt: item.min_order_quantity_alt?.toString() || "",
            moq_unit: item.moq_unit || item.unit || "pcs",
            alt_unit: item.alt_unit || "None",
            purchase_unit: item.purchase_unit || item.unit || "pcs",
            description: item.description || "",
        });

        setShowModal(true);
    };

    // --- SAVE ITEM ---
    const saveItem = async () => {
        if (!formData.item_name) return alert("Item Name is mandatory!");
        setLoading(true);

        const payload = {
            item_name: formData.item_name,
            item_code: formData.item_code,
            category: formData.category,
            hsn_code: formData.hsn_code,
            quantity: Number(formData.quantity) || 0,
            quantity_alt: Number(formData.quantity_alt) || 0,
            threshold: Number(formData.threshold) || 0,
            threshold_alt: Number(formData.threshold_alt) || 0,
            unit: formData.unit,
            alt_unit: formData.alt_unit === "None" ? null : formData.alt_unit,
            price: Number(formData.price) || 0,
            purchase_price: Number(formData.purchase_price) || 0,
            gst_rate: Number(formData.gst_rate) || 0,
            mrp: Number(formData.mrp) || 0,
            sales_tax_inc: formData.sales_tax_inc,
            purchase_tax_inc: formData.purchase_tax_inc,
            min_order_quantity: Number(formData.min_order_quantity) || 0,
            min_order_quantity_alt: Number(formData.min_order_quantity_alt) || 0,
            purchase_unit: formData.purchase_unit,
            moq_unit: formData.moq_unit,
            description: formData.description,
            online_store: formData.online_store,
            company_availability: formData.company_availability.length === 0 ? "All" : formData.company_availability.join(",")
        };

        try {
            const { error } = editingId
                ? await supabase.from("stocks").update(payload).eq('id', editingId)
                : await supabase.from("stocks").insert([payload]);

            if (error) {
                alert("Database Error: " + error.message);
            } else {
                setShowModal(false);
                await fetchItems();
                // alert("Saved Successfully!");
            }
        } catch {
            alert("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Delete item permanently?")) return;
        try {
            const { error } = await supabase.from("stocks").delete().eq("id", id);
            if (error) throw error;
            fetchItems();
        } catch (err) {
            alert("Failed to delete item: " + (err.message || "Unknown error"));
        }
    };

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Options for Dropdowns
    const unitOptions = useMemo(() => {
        const opts = [formData.unit];
        if (formData.alt_unit && formData.alt_unit !== "None" && formData.alt_unit !== formData.unit) {
            opts.push(formData.alt_unit);
        }
        return opts;
    }, [formData.unit, formData.alt_unit]);

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-black overflow-hidden relative">

            {/* --- HEADER --- */}
            <div className="flex-none bg-white shadow-sm z-30 pt-4 md:pt-0">
                <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
                    <div className="w-full flex items-center justify-between gap-2">
                        <button onClick={() => navigate("/dashboard/stockmanager")} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base flex-shrink-0 z-10">
                            <ArrowLeft size={18} /> <span>Back</span>
                        </button>
                        <h1 className="text-[10px] md:text-2xl font-black uppercase text-black text-center flex-1 leading-tight">
                            Update <span style={{ color: BRAND_COLOR }}>Stock</span>
                        </h1>
                        <div className="flex-shrink-0 z-10">
                            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 text-[10px] md:text-xs font-black uppercase tracking-wide whitespace-nowrap">
                                ID : {user?.franchise_id || "Global"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full px-4 md:px-6 py-4 pb-0">
                    <div className="flex flex-col lg:flex-row gap-3 mb-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text" placeholder="Search items..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[rgb(0,100,55)] transition-all text-black text-sm font-semibold shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-2 text-black bg-slate-50 px-5 py-3 border border-slate-200 rounded-xl flex-shrink-0">
                                <Calendar size={18} style={{ color: BRAND_COLOR }} />
                                <span className="text-sm font-bold">{today}</span>
                            </div>
                            <button onClick={() => { setEditingId(null); setFormData(initialForm); setShowModal(true); }}
                                className="w-full lg:w-auto text-white px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all flex-shrink-0"
                                style={{ backgroundColor: BRAND_COLOR }}>
                                <Plus size={18} /> Add Item
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-visible flex-wrap pb-1 mb-2">
                        <div className="relative flex-shrink-0" ref={companyDropdownRef}>
                            <button
                                onClick={() => setIsCompanyFilterOpen(!isCompanyFilterOpen)}
                                className={`pl-3 pr-8 py-2 rounded-lg text-xs font-bold border transition-all outline-none cursor-pointer w-full text-left flex items-center ${
                                    selectedCompanies.length > 0 ? "bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)] shadow-md" : "bg-white text-black border-slate-200 hover:border-[rgb(0,100,55)]"
                                }`}
                            >
                                {selectedCompanies.length === 0 ? "1. Select Company" 
                                    : selectedCompanies.length === 1 ? selectedCompanies[0]
                                    : `${selectedCompanies.length} Companies`}
                            </button>
                            <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedCompanies.length > 0 ? "text-white" : "text-slate-400"}`} />
                            
                            {isCompanyFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${selectedCompanies.length === 0 ? "bg-slate-100 text-[rgb(0,100,55)]" : "hover:bg-slate-50 text-slate-600"}`}>
                                        <input type="checkbox" className="hidden" checked={selectedCompanies.length === 0} onChange={() => { setSelectedCompanies([]); setIsCompanyFilterOpen(false); }} />
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCompanies.length === 0 ? "bg-[rgb(0,100,55)] border-[rgb(0,100,55)] text-white" : "border-slate-300"}`}>
                                            {selectedCompanies.length === 0 && <CheckCircle size={10} />}
                                        </div>
                                        All Companies
                                    </label>
                                    {companies.map(comp => {
                                        const isChecked = selectedCompanies.includes(comp);
                                        return (
                                            <label key={comp} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${isChecked ? "bg-slate-100 text-[rgb(0,100,55)]" : "hover:bg-slate-50 text-slate-600"}`}>
                                                <input type="checkbox" className="hidden" checked={isChecked} 
                                                    onChange={() => {
                                                        setSelectedCompanies(prev => {
                                                            if (isChecked) return prev.filter(c => c !== comp);
                                                            return [...prev, comp];
                                                        });
                                                    }} 
                                                />
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? "bg-[rgb(0,100,55)] border-[rgb(0,100,55)] text-white" : "border-slate-300"}`}>
                                                    {isChecked && <CheckCircle size={10} />}
                                                </div>
                                                {comp}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button disabled={selectedCompanies.length === 0} onClick={() => setShowLowStock(!showLowStock)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${selectedCompanies.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : showLowStock ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`} style={showLowStock && selectedCompanies.length > 0 ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}> <AlertTriangle size={14} /> Low Stock </button>
                        <button disabled={selectedCompanies.length === 0} onClick={() => setShowAvailableOnly(!showAvailableOnly)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${selectedCompanies.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : showAvailableOnly ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`} style={showAvailableOnly && selectedCompanies.length > 0 ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}> <CheckCircle size={14} /> Available </button>
                        <button disabled={selectedCompanies.length === 0} onClick={toggleOnline} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${selectedCompanies.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : showOnlineOnly ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`} style={showOnlineOnly && selectedCompanies.length > 0 ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}> <Globe size={14} /> Online </button>
                        <button disabled={selectedCompanies.length === 0} onClick={toggleOffline} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${selectedCompanies.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : showOfflineOnly ? "text-white shadow-md" : "bg-white text-black border-slate-200"}`} style={showOfflineOnly && selectedCompanies.length > 0 ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}> <EyeOff size={14} /> Offline </button>
                        
                        {(showLowStock || showAvailableOnly || showOnlineOnly || showOfflineOnly || searchTerm || selectedCategory !== "All" || selectedCompanies.length > 0) && (
                            <button onClick={clearFilters} className="whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 bg-red-50 text-red-600 border-red-100 hover:bg-red-100">
                                <X size={14} /> Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-3 border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-slate-400 self-center mr-2">Categories:</span>
                        {categories.map((cat) => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0 ${selectedCategory === cat ? "text-white shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR } : {}}> {cat} </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-grow overflow-hidden bg-slate-50 relative">
                <div className="absolute inset-0 overflow-y-auto px-4 md:px-6 pb-20 md:pb-6 pt-2 scrollbar-thin scrollbar-thumb-slate-200">

                    {/* MOBILE CARD VIEW */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredItems.slice(0, visibleCount).map((item) => {
                            const isLowStock = (Number(item.quantity) || 0) <= (Number(item.threshold) || 0);
                            return (
                                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"> <Tag size={10} /> {item.category} • <CompanyBadge value={item.company_availability} /> </div>
                                            <div className="font-black text-base text-black leading-tight mb-1 break-words">{item.item_name}</div>
                                            <div className="text-[10px] bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-500 font-mono"> {item.item_code || 'NO SKU'} </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-lg font-black" style={{ color: BRAND_COLOR }}>₹{item.price}</div>
                                            <div className="text-[10px] text-slate-400">GST: {item.gst_rate}%</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 mt-1">
                                        <div className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 ${isLowStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-emerald-100'}`}> <Package size={14} /> {item.quantity} {item.unit} </div>
                                        {item.online_store && (<div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0"><Globe size={14} /></div>)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button onClick={() => openEdit(item)} className="py-2.5 rounded-lg font-bold text-xs uppercase bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100"> <Edit3 size={14} /> Edit </button>
                                        <button onClick={() => deleteItem(item.id)} className="py-2.5 rounded-lg font-bold text-xs uppercase bg-white text-red-500 border border-red-100 flex items-center justify-center gap-2 hover:bg-red-50"> <Trash2 size={14} /> Delete </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                                <tr className="text-[10px] font-black text-black uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('id')}><div className="flex items-center">S.No <SortArrows columnKey="id" sortConfig={sortConfig} brandColor={BRAND_COLOR} /></div></th>
                                    <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('item_code')}><div className="flex items-center">Code <SortArrows columnKey="item_code" sortConfig={sortConfig} brandColor={BRAND_COLOR} /></div></th>
                                    <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('item_name')}><div className="flex items-center">Item Name <SortArrows columnKey="item_name" sortConfig={sortConfig} brandColor={BRAND_COLOR} /></div></th>
                                    <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('quantity')}><div className="flex items-center">Stock Status <SortArrows columnKey="quantity" sortConfig={sortConfig} brandColor={BRAND_COLOR} /></div></th>
                                    <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('price')}><div className="flex items-center">Price/GST <SortArrows columnKey="price" sortConfig={sortConfig} brandColor={BRAND_COLOR} /></div></th>
                                    <th className="px-6 py-4 border-b border-slate-200 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.slice(0, visibleCount).map((item, index) => {
                                    const isLowStock = (Number(item.quantity) || 0) <= (Number(item.threshold) || 0);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold text-black whitespace-nowrap">{(index + 1).toString().padStart(2, '0')}</td>
                                            <td className="px-6 py-4 font-bold text-xs text-black whitespace-nowrap">{item.item_code || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-black uppercase text-xs flex items-center gap-2 max-w-[250px]"> <span className="truncate" title={item.item_name}>{item.item_name}</span> {item.online_store ? <Globe size={12} className="text-blue-500 flex-shrink-0" /> : <EyeOff size={12} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />} </div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{item.category} • <CompanyBadge value={item.company_availability} /></div>
                                            </td>
                                            <td className="px-6 py-4 text-xs tracking-tighter whitespace-nowrap"> <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border-emerald-100'}`}> {item.quantity} {item.unit} </div> </td>
                                            <td className="px-6 py-4 whitespace-nowrap"> <div className="font-black text-xs text-black">₹{item.price}</div> <div className="text-[9px] font-bold text-slate-400">{item.gst_rate}% ({item.sales_tax_inc})</div> </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap"> <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity"> <button onClick={() => openEdit(item)} className="p-2 bg-white border border-slate-200 text-black rounded-lg hover:border-[rgb(0,100,55)] hover:text-[rgb(0,100,55)] transition-all shadow-sm"><Edit3 size={14} /></button> <button onClick={() => deleteItem(item.id)} className="p-2 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"><Trash2 size={14} /></button> </div> </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* LOAD MORE BUTTON */}
                    {visibleCount < filteredItems.length && (
                        <div className="flex justify-center p-6">
                            <button
                                onClick={() => setVisibleCount(v => v + 50)}
                                className="px-6 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors rounded-xl font-bold text-xs uppercase tracking-wider"
                            >
                                Load More Items ({filteredItems.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-slate-100 md:bg-black/60 md:backdrop-blur-sm">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                            <h2 className="text-base md:text-lg font-black uppercase tracking-widest text-black flex items-center gap-2">
                                <Package size={18} className="text-slate-400" />
                                {editingId ? "Product Master" : "Product Master"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full text-black hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-6">

                                <div className="md:col-span-3 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                                    <input type="checkbox" name="online_store" id="online_store" checked={formData.online_store} onChange={handleInput} className="w-5 h-5 accent-[rgb(0,100,55)] rounded cursor-pointer" />
                                    <label htmlFor="online_store" className="text-xs font-black uppercase tracking-wide text-blue-900 cursor-pointer flex items-center gap-2">
                                        <Globe size={14} className="text-blue-500" /> Sync with Online Store Storefront
                                    </label>
                                </div>

                                {/* IDENTITY SECTION */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Info size={12} /> Product Identity</h3></div>

                                <div className="md:col-span-3">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Name*</label>
                                    <input name="item_name" value={formData.item_name} onChange={handleInput} placeholder="Enter Product Name" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] focus:ring-1 focus:ring-[rgb(0,100,55)] transition font-bold text-base text-black" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Item Code / SKU</label>
                                    <input name="item_code" value={formData.item_code} onChange={handleInput} placeholder="SKU001" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition text-black font-mono text-sm" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Category</label>
                                    <input name="category" value={formData.category} onChange={handleInput} placeholder="e.g. Groceries" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition text-black text-sm" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">HSN Code</label>
                                    <input name="hsn_code" value={formData.hsn_code} onChange={handleInput} placeholder="8-digit" className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-[rgb(0,100,55)] transition tracking-widest text-black text-sm" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Applicable For</label>
                                    <div className="flex flex-wrap gap-2 bg-slate-50 rounded-lg border border-slate-200 p-3 min-h-[42px] max-h-[120px] overflow-y-auto">
                                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                                            formData.company_availability.length === 0 ? "bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)] shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                        }`}>
                                            <input type="checkbox" className="hidden" checked={formData.company_availability.length === 0}
                                                onChange={() => setFormData(prev => ({ ...prev, company_availability: [] }))}
                                            />
                                            All Companies
                                        </label>
                                        {companies.map(comp => {
                                            const isChecked = formData.company_availability.includes(comp);
                                            return (
                                                <label key={comp} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                                                    isChecked ? "bg-[rgb(0,100,55)] text-white border-[rgb(0,100,55)] shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                                }`}>
                                                    <input type="checkbox" className="hidden" checked={isChecked}
                                                        onChange={() => {
                                                            setFormData(prev => {
                                                                const arr = prev.company_availability;
                                                                const updated = isChecked ? arr.filter(c => c !== comp) : [...arr, comp];
                                                                return { ...prev, company_availability: updated };
                                                            });
                                                        }}
                                                    />
                                                    {comp}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">{formData.company_availability.length === 0 ? "Available for all companies" : `Selected: ${formData.company_availability.join(", ")}`}</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInput}
                                        placeholder="Add a short description..."
                                        className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[rgb(0,100,55)] transition text-black text-sm min-h-[42px] resize-none"
                                    />
                                </div>

                                <div className="md:col-span-1"></div>

                                {/* --- SECTION 2: INVENTORY --- */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Package size={12} /> Inventory & Units</h3></div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Unit Type <span className="text-red-500">*</span></label>
                                    <CustomSelect name="unit" value={formData.unit} onChange={handleInput} options={["pcs", "kg", "gm", "pkt", "ltr", "ml"]} />
                                    {formData.unit === 'kg' && <span className="text-[9px] text-emerald-600 font-bold block mt-1">*Saves as Grams</span>}
                                </div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Alt Unit</label>
                                    <CustomSelect name="alt_unit" value={formData.alt_unit} onChange={handleInput} options={["None", "pcs", "kg", "gm", "pkt"]} />
                                </div>

                                <div className="md:col-span-1"></div>

                                {/* --- STOCK ENTRY ROW (Aligned) --- */}
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Stock Entry Mode</label>
                                    <StockUnitToggle
                                        value={stockEntryMode}
                                        onSelect={setStockEntryMode}
                                        brandColor={BRAND_COLOR}
                                        primaryLabel={formData.unit}
                                        altLabel={formData.alt_unit === 'None' ? 'Alt' : formData.alt_unit}
                                        altDisabled={formData.alt_unit === 'None'}
                                    />
                                </div>

                                {/* --- CONDITIONAL FIELDS BASED ON TOGGLE --- */}
                                {stockEntryMode === 'Primary' ? (
                                    <>
                                        <div className="md:col-span-1 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <LabeledInput label={`Current Stock (${formData.unit})`} name="quantity" value={formData.quantity} onChange={handleInput} unitLabel={formData.unit} />
                                        </div>
                                        <div className="md:col-span-1 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <LabeledInput label={`Min Stock Alert (${formData.unit})`} name="threshold" value={formData.threshold} onChange={handleInput} placeholder="Alert Level" unitLabel={formData.unit} colorClass="bg-red-50 text-red-600 focus:text-red-700" unitColorClass="bg-red-100 text-red-400 border-red-200" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="md:col-span-1 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <LabeledInput label={`Current Stock (${formData.alt_unit})`} name="quantity_alt" value={formData.quantity_alt} onChange={handleInput} unitLabel={formData.alt_unit} />
                                        </div>
                                        <div className="md:col-span-1 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <LabeledInput label={`Min Stock Alert (${formData.alt_unit})`} name="threshold_alt" value={formData.threshold_alt} onChange={handleInput} placeholder="Alt Alert Level" unitLabel={formData.alt_unit} colorClass="bg-red-50 text-red-600 focus:text-red-700" unitColorClass="bg-red-100 text-red-400 border-red-200" />
                                        </div>
                                    </>
                                )}

                                {/* --- SECTION 3: PURCHASING & PRICING --- */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><ShoppingCart size={12} /> Purchasing & Pricing</h3></div>

                                {/* MOQ: Independent Fields */}
                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                    <div className="col-span-1">
                                        <LabeledInput
                                            label="MOQ (Primary)"
                                            name="min_order_quantity"
                                            value={formData.min_order_quantity}
                                            onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })}
                                            unitLabel={formData.unit}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <LabeledInput
                                            label="MOQ (Alt Unit)"
                                            name="min_order_quantity_alt"
                                            value={formData.min_order_quantity_alt}
                                            onChange={(e) => setFormData({ ...formData, min_order_quantity_alt: e.target.value })}
                                            unitLabel={formData.alt_unit}
                                            disabled={formData.alt_unit === 'None'}
                                        />
                                    </div>
                                    <div className="col-span-2"></div>
                                </div>

                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">

                                    {/* ROW 1: Purchase Price | Tax Mode */}
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Purchase Price</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 h-[42px] outline-none font-bold text-black text-sm" placeholder="0.00" />
                                            </div>
                                            <div className="w-[80px]">
                                                <CustomSelect name="purchase_unit" value={formData.purchase_unit || formData.unit} onChange={handleInput} options={unitOptions} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Tax Mode</label>
                                        <TaxToggle value={formData.purchase_tax_inc} onSelect={(val) => setFormData({ ...formData, purchase_tax_inc: val })} brandColor={BRAND_COLOR} />
                                    </div>

                                    {/* ROW 2: GST | Total Purchase */}
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">GST Rate (%)</label>
                                        <input type="number" name="gst_rate" value={formData.gst_rate} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 h-[42px] outline-none font-bold text-black text-sm" placeholder="18" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Purchase</label>
                                        <div className="flex items-center px-3 h-[42px] rounded-lg border border-slate-100 bg-slate-50 text-slate-600 font-bold text-sm">
                                            ₹ {calculateWithTax(formData.purchase_price, formData.purchase_tax_inc)}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2"></div>

                                    {/* ROW 3: Sales Price | Tax Mode | Total Sales */}
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Sales Price</label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInput} className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 h-[42px] outline-none font-black text-black text-sm" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-black block mb-1">Tax Mode</label>
                                        <TaxToggle value={formData.sales_tax_inc} onSelect={(val) => setFormData({ ...formData, sales_tax_inc: val })} brandColor={BRAND_COLOR} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Sales</label>
                                        <div className="flex items-center px-3 h-[42px] rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-sm">
                                            ₹ {calculateWithTax(formData.price, formData.sales_tax_inc)}
                                        </div>
                                    </div>

                                </div>

                                {/* --- SECTION 4: MRP --- */}
                                <div className="md:col-span-3 border-b border-slate-100 pb-2 mt-4"><h3 className="text-[11px] font-black uppercase text-black tracking-[0.2em] flex items-center gap-2"><Tag size={12} /> Retail Pricing</h3></div>

                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase text-black block mb-1">Maximum Retail Price (MRP)</label>
                                    <div className="relative h-[42px]">
                                        <input type="number" name="mrp" value={formData.mrp} onChange={handleInput} className="w-full h-full bg-slate-50 rounded-lg border border-slate-200 px-3 outline-none font-black text-black text-sm" placeholder="0.00" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">INR</span>
                                    </div>
                                </div>

                            </div>
                            <div className="h-20 md:hidden"></div>
                        </div>

                        <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex gap-3 flex-shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 md:py-4 rounded-xl border border-slate-200 font-black text-[11px] uppercase tracking-widest text-black hover:bg-slate-50 transition-all">Discard</button>
                            <button onClick={saveItem} disabled={loading} className="flex-[2] py-3.5 md:py-4 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2" style={{ backgroundColor: BRAND_COLOR }}>
                                {loading ? 'Saving...' : 'Finalize & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockUpdate;