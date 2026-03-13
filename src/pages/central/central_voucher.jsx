// File: /Users/surojuhomsaisantosh/Desktop/SANTOSH/PROJECTS/5 JKSH/stock-automation/src/pages/central/central_voucher.jsx

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Search, FileText, Trash2, X, Building2, Loader2, User, ChevronDown, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../frontend_supabase/supabaseClient';
import { jsPDF } from 'jspdf';
import { BRAND_GREEN } from '../../utils/theme';

export default function CentralVoucher() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [search, setSearch] = useState('');

  // Data States
  const [companies, setCompanies] = useState([]);
  const [vouchersList, setVouchersList] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Fetch Companies & Vouchers on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingList(true);
      // Fetch Companies
      const { data: compData } = await supabase.from('companies').select('*');
      if (compData) {
        setCompanies(compData);
        if (compData.length === 1) setSelectedCompanyId(compData[0].id);
      }
      
      // Fetch Vouchers
      const { data: vouchData } = await supabase
        .from('vouchers')
        .select('*, companies(company_name)')
        .order('created_at', { ascending: false });
      
      if (vouchData) setVouchersList(vouchData);
      setIsLoadingList(false);
    };
    fetchInitialData();
  }, []);

  const amountToWords = (price) => {
    if (!price) return "";
    const num = Math.round(price);
    if (num === 0) return "";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n_array) return;
        let str = '';
        str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
        str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
        str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
        str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
        str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
        return str;
    }
    return inWords(num) + "Rupees Only";
  };

  // Custom voucher form state
  const [customData, setCustomData] = useState({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    paidTo: '',
    address: '',
    paymentMode: '',
    txNo: '',
    bankName: '',
    narration: '',
    amountWords: '',
    rows: [{ description: '', amount: '' }]
  });

  const handleAddRow = () => {
    setCustomData({
      ...customData,
      rows: [...customData.rows, { description: '', amount: '' }]
    });
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...customData.rows];
    newRows[index][field] = value;
    
    // Auto-calculate words if amount changes
    let newAmountWords = customData.amountWords;
    if (field === 'amount') {
      const total = newRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      newAmountWords = amountToWords(total);
    }
    setCustomData({ ...customData, rows: newRows, amountWords: newAmountWords });
  };

  const handleRemoveRow = (index) => {
    const newRows = customData.rows.filter((_, i) => i !== index);
    const total = newRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    setCustomData({ ...customData, rows: newRows, amountWords: amountToWords(total) });
  };

  const handlePaymentModeChange = (e) => {
    const mode = e.target.value;
    setCustomData({
      ...customData,
      paymentMode: mode,
      txNo: mode === 'Cash' ? '' : customData.txNo,
      bankName: mode === 'Cash' ? '' : customData.bankName
    });
  };

  const totalCalculatedAmount = customData.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Helper to load image properly for jsPDF
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // The Core PDF Generation Engine (used by Custom, Blank, and Reprint)
  const createAndDownloadPDF = async (data, type, companyId) => {
    const company = companies.find(c => c.id === companyId);
    const imgData = company?.logo_url ? await loadImageAsBase64(company.logo_url) : null;

    const doc = new jsPDF({ format: 'a4', unit: 'pt' });
    const pw = 595.28;
    const ph = 841.89;
    
    const darkGreen = [0, 100, 55];
    const lightGreen = [235, 245, 240];
    const grey = [120, 120, 120];

    const drawVoucher = (yOffset) => {
      const margin = 30;
      const innerW = pw - (margin * 2);
      
      // 1. Logo
      if (imgData) {
        doc.addImage(imgData, 'PNG', margin, yOffset + 10, 50, 50, '', 'FAST');
      } else {
        doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.rect(margin, yOffset + 10, 50, 50);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("LOGO", margin + 15, yOffset + 38);
      }

      // 2. Company Details
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(company?.company_name?.toUpperCase() || "COMPANY NAME", pw / 2, yOffset + 25, { align: "center" });
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(company?.company_email || company?.company_phone || "Contact Details", (pw / 2), yOffset + 38, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grey[0], grey[1], grey[2]);
      doc.text(company?.company_address?.substring(0, 80) || "Company Address Details", pw / 2, yOffset + 50, { align: "center" });

      // 3. Payment Pill
      const pillW = 110;
      const pillH = 18;
      const pillX = pw - margin - pillW;
      const pillY = yOffset + 15;
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.roundedRect(pillX, pillY, pillW, pillH, 9, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PAYMENT VOUCHER", pillX + 55, pillY + 12, { align: "center" });

      doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, yOffset + 70, pw - margin, yOffset + 70);

      // 4. Input Fields
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      let cy = yOffset + 90;
      doc.text("Voucher No.", margin, cy);
      doc.setDrawColor(grey[0], grey[1], grey[2]);
      doc.setLineWidth(0.5);
      if (type === 'custom' && data?.voucherNo) {
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.text(data.voucherNo, margin + 65, cy - 2);
      }
      doc.line(margin + 60, cy + 2, margin + 200, cy + 2);

      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont("helvetica", "bold");
      doc.text("Date", pw - margin - 150, cy);
      if (type === 'custom' && data?.date) {
          const d = new Date(data.date);
          const formatted = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`;
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.text(formatted, pw - margin - 120, cy - 2);
      }
      doc.line(pw - margin - 125, cy + 2, pw - margin, cy + 2);

      cy += 22;
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont("helvetica", "bold");
      doc.text("Paid To", margin, cy);
      if (type === 'custom' && data?.paidTo) {
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.text(data.paidTo, margin + 50, cy - 2);
      }
      doc.line(margin + 45, cy + 2, pw - margin, cy + 2);

      cy += 22;
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont("helvetica", "bold");
      doc.text("Address", margin, cy);
      if (type === 'custom' && data?.address) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(data.address, margin + 50, cy - 2);
      }
      doc.line(margin + 45, cy + 2, pw - margin, cy + 2);

      cy += 18;
      doc.line(margin + 45, cy + 2, pw - margin, cy + 2);

      cy += 15;
      doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
      doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(margin, cy, innerW, 35, 'FD'); 
      
      const cbY = cy + 12;
      doc.setFont("helvetica", "normal");
      
      // Checkboxes
      doc.rect(margin + 10, cbY - 8, 8, 8); doc.text("Cash", margin + 22, cbY);
      doc.rect(margin + 70, cbY - 8, 8, 8); doc.text("Cheque", margin + 82, cbY);
      doc.rect(margin + 140, cbY - 8, 8, 8); doc.text("Bank Transfer", margin + 152, cbY);
      doc.rect(margin + 240, cbY - 8, 8, 8); doc.text("UPI", margin + 252, cbY);

      if (type === 'custom' && data?.paymentMode) {
        doc.setFont("helvetica", "bold");
        if (data.paymentMode === 'Cash') doc.text("X", margin + 11, cbY - 1);
        if (data.paymentMode === 'Cheque') doc.text("X", margin + 71, cbY - 1);
        if (data.paymentMode === 'Bank Transfer') doc.text("X", margin + 141, cbY - 1);
        if (data.paymentMode === 'UPI') doc.text("X", margin + 241, cbY - 1);
        doc.setFont("helvetica", "normal");
      }

      doc.setFont("helvetica", "bold");
      const fY = cy + 28;

      let txLabel = "Tx./Cheque No.";
      if (type === 'custom' && data) {
          if (data.paymentMode === 'Cheque') txLabel = "Cheque No.";
          else if (data.paymentMode === 'Bank Transfer' || data.paymentMode === 'UPI') txLabel = "Transaction ID";
      }

      doc.text(txLabel, margin + 10, fY);
      if (type === 'custom' && data?.paymentMode !== 'Cash' && data?.txNo) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(data.txNo, margin + 90, fY - 2);
        doc.setFont("helvetica", "bold");
      }
      doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.line(margin + 85, fY + 2, margin + 220, fY + 2);
      
      doc.text("Bank Name", margin + 235, fY);
      if (type === 'custom' && data?.paymentMode !== 'Cash' && data?.bankName) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(data.bankName, margin + 295, fY - 2);
        doc.setFont("helvetica", "bold");
      }
      doc.line(margin + 290, fY + 2, pw - margin - 10, fY + 2);

      // 5. Item Table
      cy += 35; // REDUCED gap to fit two on page
      const th = 20;

      const drawTableHeader = (startY) => {
        doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.rect(margin, startY, innerW, th, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("S.No.", margin + 15, startY + 14);
        doc.text("Particulars", margin + 65, startY + 14);
        doc.text("Amount (Rs.)", pw - margin - 85, startY + 14);
        doc.setTextColor(0,0,0);
      };

      drawTableHeader(cy);

      let totalAmount = 0;
      const rowCount = type === 'custom' && data?.rows ? data.rows.length : 3; 

      for(let i = 0; i < rowCount; i++) {
        cy += th;

        // Auto Page break logic if rows exceed the A4 height (Only applies to custom, unbounded rows)
        if (type === 'custom' && cy > ph - 100) {
            doc.addPage();
            cy = 40;
            drawTableHeader(cy);
            cy += th;
        }

        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, cy, innerW, th);
        
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(margin, cy, 40, th, 'FD');
        doc.setFont("helvetica", "bold");
        doc.text((i+1).toString(), margin + 20, cy + 14);
        
        doc.setFont("helvetica", "normal");
        if (type === 'custom' && data?.rows[i]) {
            let desc = data.rows[i].description || '';
            if(doc.getTextWidth(desc) > (innerW - 140)) {
                desc = desc.substring(0, 50) + '...';
            }
            doc.text(desc, margin + 60, cy + 14);
            
            const amt = Number(data.rows[i].amount) || 0;
            if (amt > 0) {
                doc.text(amt.toFixed(2), pw - margin - 85, cy + 14);
                totalAmount += amt;
            }
        }
        
        doc.line(margin + 40, cy, margin + 40, cy + th); 
        doc.line(pw - margin - 100, cy, pw - margin - 100, cy + th); 
      }

      cy += th;
      doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
      doc.rect(margin, cy, innerW, th, 'FD');
      doc.setFont("helvetica", "bold");
      doc.text("Total Amount", pw - margin - 180, cy + 14);
      
      if (type === 'custom' && totalAmount > 0) {
          doc.text(totalAmount.toFixed(2), pw - margin - 85, cy + 14);
      }
      doc.line(pw - margin - 100, cy, pw - margin - 100, cy + th);

      cy += 40; // REDUCED spacing
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.text("Rupees", margin, cy);
      doc.setDrawColor(grey[0], grey[1], grey[2]);
      if (type === 'custom' && data?.amountWords) {
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.text(data.amountWords, margin + 45, cy - 2);
      }
      doc.line(margin + 40, cy + 2, pw - margin - 35, cy + 2);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.text("Only", pw - margin - 30, cy);

      cy += 25; // REDUCED spacing
      doc.text("Narration:", margin, cy);
      if (type === 'custom' && data?.narration) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(data.narration, margin + 55, cy - 2);
      }
      doc.line(margin + 50, cy + 2, pw / 2 + 30, cy + 2);

      cy += 40; // REDUCED spacing
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Receiver's Signature", margin, cy);
      doc.text("Company's Stamp", pw - margin - 100, cy); // Changed text here
    };

    // Draw First Voucher slightly higher
    drawVoucher(15); 

    // ONLY Draw Cut Line & Second Voucher if it's a BLANK template
    if (type === 'blank') {
      doc.setDrawColor(150, 150, 150);
      doc.setLineDashPattern([5, 5], 0);
      doc.line(0, 420, pw, 420); // Center of A4
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("✂ cut here", pw / 2 - 25, 416);

      doc.setLineDashPattern([], 0); // Reset dash lines
      
      // Draw second voucher starting below the cutline
      drawVoucher(435); 
    }

    // --- NEW PREVIEW LOGIC ---
    doc.autoPrint(); 
    const blob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(blob);
    window.open(pdfUrl, '_blank');
    // --- END NEW PREVIEW LOGIC ---
  };

  // Handle Form Submission (Save DB & Print)
  const handleGenerateCustom = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    // Save to Database
    const payload = {
        company_id: selectedCompanyId,
        voucher_no: customData.voucherNo,
        date: customData.date,
        paid_to: customData.paidTo,
        address: customData.address,
        payment_mode: customData.paymentMode,
        tx_no: customData.txNo,
        bank_name: customData.bankName,
        narration: customData.narration,
        amount_words: customData.amountWords,
        items: customData.rows,
        total_amount: totalCalculatedAmount,
        created_by: user.id
    };

    const { data: dbData, error } = await supabase
        .from('vouchers')
        .insert(payload)
        .select('*, companies(company_name)')
        .single();

    if (error) {
        alert("Error saving voucher: " + error.message);
        setIsGenerating(false);
        return;
    }

    // Add to Local UI State
    if (dbData) setVouchersList(prev => [dbData, ...prev]);

    // Print
    await createAndDownloadPDF(customData, 'custom', selectedCompanyId);
    
    setIsGenerating(false);
    setShowCustomModal(false);
    setShowTypeModal(false);

    // Reset Form
    setCustomData({
      voucherNo: '', date: new Date().toISOString().split('T')[0], paidTo: '', address: '', paymentMode: '',
      txNo: '', bankName: '', narration: '', amountWords: '', rows: [{ description: '', amount: '' }]
    });
  };

  const handleGenerateBlank = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    await createAndDownloadPDF(null, 'blank', selectedCompanyId);
    setIsGenerating(false);
    setShowTypeModal(false);
  };

  const handleReprint = async (dbVoucher) => {
    const mappedData = {
        voucherNo: dbVoucher.voucher_no,
        date: dbVoucher.date,
        paidTo: dbVoucher.paid_to,
        address: dbVoucher.address,
        paymentMode: dbVoucher.payment_mode,
        txNo: dbVoucher.tx_no,
        bankName: dbVoucher.bank_name,
        narration: dbVoucher.narration,
        amountWords: dbVoucher.amount_words,
        rows: dbVoucher.items || []
    };
    await createAndDownloadPDF(mappedData, 'custom', dbVoucher.company_id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this voucher?")) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (error) {
        alert("Error deleting record: " + error.message);
    } else {
        setVouchersList(prev => prev.filter(v => v.id !== id));
    }
  };

  const filteredVouchers = vouchersList.filter(v => 
    v.paid_to?.toLowerCase().includes(search.toLowerCase()) || 
    v.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
    v.companies?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </button>
          </div>
          <div className="flex-1 flex justify-center absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-bold text-gray-900">Vouchers</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-800">
                {user?.franchise_id || user?.user_metadata?.franchise_id || (user?.email ? user.email.split('@')[0].toUpperCase() : 'CENTRAL ADMIN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vouchers by Name, No., Company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner hover:bg-white"
              style={{
                borderColor: '#e5e7eb',
                '--tw-ring-color': BRAND_GREEN
              }}
            />
          </div>
          
          <button
            onClick={() => setShowTypeModal(true)}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold active:scale-95 duration-200"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Voucher
          </button>
        </div>

        {/* DB Vouchers List Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoadingList ? (
                <div className="p-10 text-center text-gray-400 font-bold uppercase tracking-wider text-sm flex justify-center items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading Vouchers...
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center text-gray-500">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
                        <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No vouchers found</h3>
                    <p className="max-w-md text-gray-500">Generate custom or blank vouchers using the 'New Voucher' button above.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Voucher No.</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Paid To</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVouchers.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {new Date(v.date || v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-md">
                                            {v.voucher_no || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                        {v.paid_to}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                        {v.companies?.company_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">
                                        ₹{Number(v.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleReprint(v)} 
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                title="Print Voucher"
                                            >
                                                <Printer className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(v.id)} 
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                                title="Delete Voucher"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {/* STEP 1: Type Selection & Company Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Setup New Voucher</h2>
              <button onClick={() => setShowTypeModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full border shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col space-y-6">
              {/* Company Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">1. Select Company</label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all font-semibold appearance-none cursor-pointer"
                      style={{ '--tw-ring-color': BRAND_GREEN }}
                    >
                      <option value="" disabled>Select a billing company...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Format Selection */}
              <div>
                 <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">2. Voucher Format</label>
                 <div className="space-y-3">
                    <button
                      disabled={!selectedCompanyId || isGenerating}
                      onClick={() => {
                        setShowTypeModal(false);
                        setShowCustomModal(true);
                      }}
                      className="w-full py-4 px-5 text-left border-2 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all flex flex-col disabled:opacity-50 disabled:cursor-not-allowed group bg-white"
                    >
                      <span className="font-bold text-gray-900 text-base group-hover:text-[var(--tw-ring-color)] transition-colors" style={{ '--tw-ring-color': BRAND_GREEN }}>Custom Voucher</span>
                      <span className="text-gray-500 text-sm mt-1">Add items digitally to print a fully detailed voucher.</span>
                    </button>
                    
                    <button
                      disabled={!selectedCompanyId || isGenerating}
                      onClick={handleGenerateBlank}
                      className="w-full py-4 px-5 text-left border-2 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all flex flex-col disabled:opacity-50 disabled:cursor-not-allowed group bg-white"
                    >
                      <span className="font-bold text-gray-900 text-base group-hover:text-[var(--tw-ring-color)] transition-colors" style={{ '--tw-ring-color': BRAND_GREEN }}>
                         {isGenerating ? 'Generating...' : 'Blank Voucher'}
                      </span>
                      <span className="text-gray-500 text-sm mt-1">Print an empty template with your branding to fill out manually.</span>
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Custom Voucher Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-20">
              <h2 className="text-lg font-bold text-gray-900">Create Custom Voucher</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full border shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleGenerateCustom} className="p-6">
              
              {/* Top Row Details (Horizontal spread) */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-5">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Voucher No.</label>
                  <input
                    type="text"
                    required
                    value={customData.voucherNo}
                    onChange={e => setCustomData({...customData, voucherNo: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={customData.date}
                    onChange={e => setCustomData({...customData, date: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Paid To</label>
                  <input
                    type="text"
                    required
                    value={customData.paidTo}
                    onChange={e => setCustomData({...customData, paidTo: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                  <input
                    type="text"
                    value={customData.address}
                    onChange={e => setCustomData({...customData, address: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
                    <div className="relative">
                        <select
                        value={customData.paymentMode}
                        onChange={handlePaymentModeChange}
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:outline-none font-medium appearance-none cursor-pointer"
                        style={{ '--tw-ring-color': BRAND_GREEN }}
                        >
                        <option value="">Select Mode...</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Dynamic conditional fields based on payment mode */}
                  {customData.paymentMode && customData.paymentMode !== 'Cash' && (
                    <>
                        <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                            {customData.paymentMode === 'Cheque' ? 'Cheque No.' : 'Transaction ID'}
                        </label>
                        <input
                            type="text"
                            value={customData.txNo}
                            onChange={e => setCustomData({...customData, txNo: e.target.value})}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:outline-none font-medium"
                            style={{ '--tw-ring-color': BRAND_GREEN }}
                        />
                        </div>
                        <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Bank Name</label>
                        <input
                            type="text"
                            value={customData.bankName}
                            onChange={e => setCustomData({...customData, bankName: e.target.value})}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:outline-none font-medium"
                            style={{ '--tw-ring-color': BRAND_GREEN }}
                        />
                        </div>
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Particulars / Items</label>
                  <button 
                    type="button" 
                    onClick={handleAddRow}
                    className="text-xs font-bold text-[var(--tw-ring-color)] hover:opacity-80 flex items-center uppercase transition-opacity"
                    style={{ '--tw-ring-color': BRAND_GREEN }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Row
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40 text-right">Amount</th>
                        <th className="p-3 w-14"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {customData.rows.map((row, index) => (
                        <tr key={index} className="border-b last:border-0 bg-white">
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={row.description}
                              onChange={e => handleRowChange(index, 'description', e.target.value)}
                              placeholder="Item description"
                              className="w-full p-2 bg-transparent border-0 focus:ring-2 focus:ring-gray-200 rounded font-medium outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={row.amount}
                              onChange={e => handleRowChange(index, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full p-2 bg-transparent border-0 focus:ring-2 focus:ring-gray-200 rounded font-bold outline-none text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveRow(index)}
                              className="text-red-400 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                              disabled={customData.rows.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Auto-Calculated Total Row */}
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount:</td>
                        <td className="p-3 text-right font-black text-gray-900 text-lg">
                          ₹{totalCalculatedAmount.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bottom details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Amount (in words) <span className="text-[10px] text-[var(--tw-ring-color)] normal-case ml-2" style={{ color: BRAND_GREEN }}>- Auto-calculated</span></label>
                  <input
                    type="text"
                    required
                    value={customData.amountWords}
                    onChange={e => setCustomData({...customData, amountWords: e.target.value})}
                    placeholder="e.g. Five Thousand Rupees Only"
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium text-gray-700"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Narration</label>
                  <input
                    type="text"
                    value={customData.narration}
                    onChange={e => setCustomData({...customData, narration: e.target.value})}
                    placeholder="Brief note or description about payment"
                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:bg-white focus:outline-none font-medium"
                    style={{ '--tw-ring-color': BRAND_GREEN, borderColor: '#e5e7eb' }}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-6 py-2.5 border-2 rounded-xl text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-8 py-2.5 text-white rounded-xl hover:opacity-90 transition-opacity font-bold flex items-center shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND_GREEN, shadowColor: `${BRAND_GREEN}40` }}
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />}
                  {isGenerating ? 'Processing...' : 'Save & Generate PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}