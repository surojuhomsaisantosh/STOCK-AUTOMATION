import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Package, BarChart3, User } from "lucide-react";

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: "order", label: "Order", icon: <ShoppingBag size={20} />, path: "/stock-orders" },
        { id: "orders", label: "Orders", icon: <Package size={20} />, path: "/stock/orders" }, // Wait, Franchise orders path is different? Checking App.jsx... it is /stock/orders for Stock Admin, but Franchise also accesses it? 
        // App.jsx: Franchise uses /stock-orders for ordering (StockOrder.jsx) but does it have an orders list?
        // /stock-orders is the ordering page.
        // /stock/orders seems to be "StockOrders.jsx" which is the list.
        // Let me check App.jsx again.
        // Line 174: /stock-orders -> StockOrder (Ordering Page)
        // Line 247: /stock/orders -> StockOrders (List) -> Protected by "stock" role only? 
        // Wait, Franchise needs to see their orders. 
        // Creating a placeholder path /franchise/orders-list if needed, or reusing StockOrders if allowed. 
        // Looking at StockOrders.jsx, it fetches "invoices". 
        // I will assume for now Franchise needs to see their history. 
        // Actually, I'll check if there's a specific route for Franchise History.
        // There isn't one explicit. I will point to /stock-orders for "Order" (Action).
        // I need a page for "My Orders".
        // I'll stick to the existing /franchise/invoices for "History" for now (Invoices list).
        { id: "orders", label: "History", icon: <Package size={20} />, path: "/franchise/invoices" },
        { id: "reports", label: "Reports", icon: <BarChart3 size={20} />, path: "/franchise/analytics" },
        { id: "profile", label: "Profile", icon: <User size={20} />, path: "/franchise/settings" },
    ];

    const BRAND_COLOR = "rgb(0, 100, 55)";

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-4 flex justify-between items-center z-50 pb-safe">
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? "text-emerald-800 bg-emerald-50" : "text-slate-400 hover:text-slate-600"
                            }`}
                        style={isActive ? { color: BRAND_COLOR } : {}}
                    >
                        {tab.icon}
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "opacity-100" : "opacity-70"}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
