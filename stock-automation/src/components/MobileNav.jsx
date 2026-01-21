import { useState } from "react";
import { Menu, X, ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase/supabaseClient";

/**
 * MobileNav Component
 * Renders a hamburger menu that opens a slide-out drawer.
 * 
 * Props:
 * - navItems: Array of objects { title, path, icon, action (optional), disabled (optional) }
 * - title: String, title of the drawer header
 * - userProfile: Object, { name, role/franchise_id } for the footer/header
 */
const MobileNav = ({ navItems, title = "Menu", userProfile = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        logout();
        navigate("/");
    };

    const handleNavigation = (item) => {
        if (item.disabled) return;
        if (item.action) {
            item.action();
        } else if (item.path) {
            navigate(item.path);
        }
        setIsOpen(false);
    };

    return (
        <div className="md:hidden">
            {/* Hamburger Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition"
            >
                <Menu size={28} strokeWidth={2.5} />
            </button>

            {/* Overlay & Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Panel */}
                    <div className="relative w-[85vw] max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
                                {userProfile.name && (
                                    <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">
                                        Hi, {userProfile.name}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-500 hover:text-black"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Nav Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {navItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleNavigation(item)}
                                    disabled={item.disabled}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition text-left group
                    ${item.disabled
                                            ? "opacity-50 cursor-not-allowed bg-gray-50"
                                            : "hover:bg-emerald-50 active:scale-[0.98] border border-transparent hover:border-emerald-100"
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${item.disabled ? "bg-gray-200 text-gray-400" : "bg-emerald-100 text-emerald-700"}
                    `}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <span className={`block font-bold ${item.disabled ? "text-gray-400" : "text-gray-800 group-hover:text-emerald-900"}`}>
                                                {item.title}
                                            </span>
                                            {item.desc && (
                                                <span className="text-xs text-gray-400 font-medium">{item.desc}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!item.disabled && (
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-500" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 transition"
                            >
                                <LogOut size={18} />
                                <span>Log Out</span>
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-4 font-medium uppercase tracking-widest">
                                Stock Automation v1.0
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileNav;
