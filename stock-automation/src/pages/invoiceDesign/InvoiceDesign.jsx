import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Layout,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
// UPDATE THIS IMPORT PATH TO MATCH YOUR PROJECT
import { supabase } from "./supabaseClient";

const BRAND_GREEN = "rgb(0, 100, 55)";
const SOFT_BORDER = "rgba(0, 100, 55, 0.15)";

function InvoiceDesign() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [instanceKey] = useState(() => Math.random().toString(36).substring(7));

  // State
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [terms, setTerms] = useState("");
  const [franchiseId, setFranchiseId] = useState("");

  // New State for Logo Upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // DEBUG LOG: Component Mount
  console.log(`🟢 [InvoiceDesign] Rendered. Instance Key: ${instanceKey}`);

  useEffect(() => {
    // DEBUG LOG: Force Clear
    console.log("🧹 [InvoiceDesign] useEffect triggered: Forcing all fields to blank strings.");

    setCompanyName("");
    setCompanyEmail("");
    setCompanyAddress("");
    setGstin("");
    setIfscCode("");
    setAccountNumber("");
    setBankName("");
    setTerms("");
    setFranchiseId("");
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      let finalLogoUrl = null;

      // STEP 1: Upload Logo to Supabase Storage if a file was selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        // Fallback to 'company' if name is empty to prevent bad filenames
        const cleanCompanyName = companyName ? companyName.replace(/\s+/g, '-').toLowerCase() : 'company';
        const fileName = `${cleanCompanyName}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        // Retrieve the permanent public URL
        const { data } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        finalLogoUrl = data.publicUrl;
      }

      // STEP 2: Save textual data and the logo URL to the Database
      const payload = {
        company_name: companyName.toUpperCase(),
        company_email: companyEmail,
        company_address: companyAddress,
        company_gst: gstin.toUpperCase(),
        parent_company: "JKSH UNITED PRIVATE LIMITED",
        bank_ifsc: ifscCode.toUpperCase(),
        bank_acc_no: accountNumber,
        bank_name: bankName.toUpperCase(),
        terms: terms,
        franchise_id: franchiseId.toUpperCase() || null,
        logo_url: finalLogoUrl // Attaching the new logo URL to the payload
      };

      // DEBUG LOG: Saving payload
      console.log("💾 [InvoiceDesign] Attempting to save data to Supabase:", payload);

      const { error: dbError } = await supabase
        .from('companies')
        .insert([payload]);

      if (dbError) throw dbError;

      console.log("✅ [InvoiceDesign] Save successful!");
      setStatus({ type: "success", message: "Layout Created Successfully" });

      setTimeout(() => {
        setStatus({ type: "", message: "" });
        navigate(-1);
      }, 2000);

    } catch (error) {
      console.error("❌ [InvoiceDesign] Supabase insert/upload error:", error);
      setStatus({ type: "error", message: error.message || "Failed to save data" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div key={instanceKey} className="min-h-screen w-full bg-slate-50/50 p-6 md:p-12 font-sans antialiased text-black">
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
            {status.message && (
              <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${status.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                {status.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {status.message}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !companyName}
              className="flex items-center gap-3 bg-white px-8 py-4 rounded-2xl border shadow-sm font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              style={{ borderColor: SOFT_BORDER, color: BRAND_GREEN }}
            >
              <Save size={18} /> {saving ? "PROCESSING..." : "COMMIT CHANGES"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: CONFIGURATION PANEL */}
          <div className="lg:col-span-4 space-y-6 max-h-[900px] overflow-y-auto pr-2 pb-10 custom-scrollbar">
            <div className="bg-white rounded-[32px] border p-8 shadow-sm space-y-8" style={{ borderColor: SOFT_BORDER }}>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Layout size={18} className="opacity-30" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Company Identity</h3>
                </div>

                <div className="space-y-5">
                  {/* NEW LOGO UPLOAD INPUT */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">Upload Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      style={{ borderColor: SOFT_BORDER }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">1. Company Name *</label>
                    <input type="text" name={`cn_${instanceKey}`} value={companyName} onChange={(e) => {
                      console.log("📝 Typing Company Name:", e.target.value);
                      setCompanyName(e.target.value.toUpperCase());
                    }} autoComplete="new-password" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">2. Franchise ID</label>
                    <input type="text" name={`fid_${instanceKey}`} value={franchiseId} onChange={(e) => setFranchiseId(e.target.value.toUpperCase())} autoComplete="new-password" placeholder="e.g. TV-1" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">3. Company Email</label>
                    <input type="email" name={`ce_${instanceKey}`} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} autoComplete="new-password" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">4. Company Address</label>
                    <textarea name={`ca_${instanceKey}`} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} autoComplete="new-password" rows={2} className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black resize-none" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">5. GSTIN</label>
                    <input type="text" name={`cg_${instanceKey}`} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} autoComplete="new-password" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">6. Parent Company</label>
                    <input type="text" value="JKSH UNITED PRIVATE LIMITED" disabled className="w-full px-4 py-3 rounded-xl bg-slate-100 border outline-none font-bold text-xs text-slate-400 cursor-not-allowed" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                </div>
              </div>

              <hr className="border-dashed border-slate-200" />

              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40 mb-6">Banking & Terms</h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">7. IFSC Code</label>
                    <input type="text" name={`ifsc_${instanceKey}`} value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} autoComplete="new-password" placeholder="" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">8. Account Number</label>
                    <input type="text" name={`acc_${instanceKey}`} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} autoComplete="new-password" placeholder="" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">9. Bank Name</label>
                    <input type="text" name={`bank_${instanceKey}`} value={bankName} onChange={(e) => setBankName(e.target.value.toUpperCase())} autoComplete="new-password" placeholder="" className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">10. Terms & Conditions</label>
                    <textarea name={`terms_${instanceKey}`} value={terms} onChange={(e) => setTerms(e.target.value)} autoComplete="new-password" placeholder="" rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none font-bold text-xs text-black resize-none" style={{ borderColor: SOFT_BORDER }} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[40px] border shadow-2xl p-16 min-h-[900px] relative flex flex-col" style={{ borderColor: SOFT_BORDER }}>

              <div className="flex justify-between items-start border-b-8 pb-12 mb-12" style={{ borderColor: BRAND_GREEN }}>
                <div>
                  {/* UPDATED LOGO PREVIEW AREA */}
                  <div className="w-20 h-20 rounded-2xl mb-6 shadow-lg flex items-center justify-center bg-slate-50 border overflow-hidden" style={{ borderColor: SOFT_BORDER }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon size={24} className="opacity-20" />
                    )}
                  </div>

                  <h2 className="text-4xl font-black uppercase tracking-tighter text-black">TAX INVOICE</h2>
                  {gstin && <p className="text-xs font-bold mt-2 opacity-60">GSTIN: {gstin}</p>}
                </div>
                <div className="text-right max-w-xs">
                  <h3 className="font-black text-xl text-black">{companyName || "COMPANY NAME"}</h3>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter text-black mb-2">
                    A Division of JKSH United Private Limited
                  </p>
                  <p className="text-xs opacity-60 font-medium whitespace-pre-wrap leading-relaxed">
                    {companyAddress || "Default Address\nCity, State, ZIP"}
                  </p>
                  <p className="text-xs opacity-60 font-medium mt-1">
                    {companyEmail || "email@company.com"}
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm italic opacity-40 mb-12">Invoice table preview area...</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-12 pt-12 border-t-2 border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-3 text-black">Payment Details:</p>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-black">Bank: <span className="font-medium opacity-80">{bankName || "N/A"}</span></p>
                    <p className="text-sm font-bold text-black">A/C: <span className="font-medium opacity-80">{accountNumber || "XXXX-XXXX-XXXX"}</span></p>
                    <p className="text-sm font-bold text-black">IFSC: <span className="font-medium opacity-80">{ifscCode || "XXXX0000000"}</span></p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-3 text-black">Terms & Conditions:</p>
                  <p className="text-xs font-medium text-black opacity-80 whitespace-pre-wrap leading-relaxed">
                    {terms || "Standard payment terms and conditions will appear here."}
                  </p>
                </div>
              </div>

              <div className="mt-20 pt-12 border-t border-dashed border-slate-200 flex justify-between items-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-20 text-black">
                  System Generated Invoice
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-20 text-black">
                  Auth: JKSH United Pvt Ltd {franchiseId && `| ${franchiseId}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDesign;