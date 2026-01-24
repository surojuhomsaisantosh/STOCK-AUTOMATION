import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Palette, 
  Save, 
  Type, 
  Layout, 
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";

const BRAND_GREEN = "rgb(0, 100, 55)";
const SOFT_BORDER = "rgba(0, 100, 55, 0.15)";

function InvoiceDesign() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const handleSave = () => {
    setSaving(true);
    // Simulate API Call
    setTimeout(() => {
      setSaving(false);
      setStatus("Layout Updated Successfully");
      setTimeout(() => setStatus(""), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-6 md:p-12 font-sans antialiased text-black">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => navigate(-1)} 
              className="group flex items-center gap-3 text-[14px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-50"
              style={{ color: BRAND_GREEN }}
            >
              <ArrowLeft size={20} /> BACK
            </button>
            
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-black">
                INVOICE DESIGN
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] mt-3 opacity-30 text-black">
                BRANDING & DOCUMENT ARCHITECTURE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {status && (
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <CheckCircle2 size={14} /> {status}
              </span>
            )}
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 bg-white px-8 py-4 rounded-2xl border shadow-sm font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              style={{ borderColor: SOFT_BORDER, color: BRAND_GREEN }}
            >
              <Save size={18} /> {saving ? "PROCESSING..." : "COMMIT CHANGES"}
            </button>
          </div>
        </div>

        {/* MAIN INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: CONFIGURATION PANEL (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[32px] border p-8 shadow-sm" style={{ borderColor: SOFT_BORDER }}>
              <div className="flex items-center gap-3 mb-8">
                <Layout size={20} className="opacity-30" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Layout Controls</h3>
              </div>

              <div className="space-y-8">
                {/* Brand Color */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 opacity-50 text-black">Primary Brand Identity</label>
                  <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-2xl border" style={{ borderColor: SOFT_BORDER }}>
                    <div className="w-12 h-12 rounded-xl shadow-inner" style={{ backgroundColor: BRAND_GREEN }}></div>
                    <input 
                      type="text" 
                      defaultValue="#006437" 
                      className="bg-transparent font-mono text-sm font-bold outline-none flex-1 text-black"
                    />
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 opacity-50 text-black">Typography Preset</label>
                  <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-black text-xs appearance-none cursor-pointer text-black" style={{ borderColor: SOFT_BORDER }}>
                    <option>MONTSERRAT / INTER (DEFAULT)</option>
                    <option>ROBOTO MONO / SYSTEM</option>
                    <option>PLAYFAIR DISPLAY / CLASSIC</option>
                  </select>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 opacity-50 text-black">Company Insignia</label>
                  <div className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all hover:bg-slate-50 cursor-pointer" style={{ borderColor: SOFT_BORDER }}>
                    <ImageIcon size={24} className="opacity-20" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Upload PNG / SVG</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Info */}
            <div className="bg-emerald-900 rounded-[32px] p-8 text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-60">System Note</h4>
              <p className="text-sm font-medium leading-relaxed opacity-90">
                Changes made here will reflect globally across all Franchise invoice distributions immediately upon commitment.
              </p>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[40px] border shadow-2xl p-16 min-h-[900px] relative flex flex-col" style={{ borderColor: SOFT_BORDER }}>
              
              {/* Watermark/Status */}
              <div className="absolute top-8 right-8">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-10 rotate-90 origin-right block">PREVIEW MODE</span>
              </div>

              {/* Invoice Mockup Content */}
              <div className="flex justify-between items-start border-b-8 pb-12 mb-12" style={{ borderColor: BRAND_GREEN }}>
                <div>
                  <div className="w-20 h-20 rounded-2xl mb-6 shadow-lg" style={{ backgroundColor: BRAND_GREEN }}></div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-black">TAX INVOICE</h2>
                </div>
                <div className="text-right">
                  <h3 className="font-black text-xl text-black">FRANCHISE CORP.</h3>
                  <p className="text-xs font-bold opacity-40 leading-relaxed text-black">
                    123 Administration Way<br />
                    Central District, HQ 5501
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-16">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2 text-black">Bill To:</p>
                  <p className="font-bold text-black">Client Name</p>
                  <p className="text-xs opacity-50 text-black">client@example.com</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2 text-black">Invoice Details:</p>
                  <p className="text-xs font-bold text-black">DATE: JAN 24, 2024</p>
                  <p className="text-xs font-bold text-black">DUE: FEB 24, 2024</p>
                </div>
              </div>

              {/* Table Mockup */}
              <div className="flex-1">
                <div className="w-full border-b-2 py-4 flex justify-between text-[10px] font-black uppercase tracking-widest opacity-30 border-slate-100 text-black">
                  <span>Description</span>
                  <div className="flex gap-12">
                    <span>Qty</span>
                    <span>Amount</span>
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full border-b py-6 flex justify-between items-center border-slate-50">
                    <span className="font-bold text-sm text-black">System Service Line Item #{i}</span>
                    <div className="flex gap-12 font-mono text-sm font-bold text-black">
                      <span>0{i}</span>
                      <span>$00.00</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Block */}
              <div className="mt-12 pt-8 border-t-2 border-slate-100 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-black">
                    <span className="opacity-40 uppercase">Subtotal</span>
                    <span>$00.00</span>
                  </div>
                  <div className="flex justify-between text-xl font-black pt-4 text-black">
                    <span className="uppercase tracking-tighter">Total Due</span>
                    <span style={{ color: BRAND_GREEN }}>$00.00</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-12 border-t border-dashed border-slate-200 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-20 text-black">Authorized by Central Administration</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDesign;