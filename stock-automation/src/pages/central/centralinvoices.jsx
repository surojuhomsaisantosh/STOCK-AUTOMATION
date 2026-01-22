import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Search, X, RotateCcw, User, 
  FileText, IndianRupee, Printer, Phone, Hash, ShoppingBag, Shield, Activity
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function CentralInvoices() {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  const [search, setSearch] = useState("");
  const [rangeMode, setRangeMode] = useState(false); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => { 
    fetchInvoices(); 
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).single();
    if (data) setUserProfile(data);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * BUG FIX: Robust UTC to IST Conversion
   * This handles the Supabase "YYYY-MM-DD HH:MM:SS" string properly.
   */
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    
    try {
      // 1. Sanitize the string: Replace space with 'T' and ensure 'Z' (UTC) suffix
      // This stops the browser from guessing the timezone incorrectly.
      const formattedStr = dateStr.replace(" ", "T");
      const isoStr = formattedStr.endsWith("Z") ? formattedStr : `${formattedStr}Z`;
      
      const date = new Date(isoStr);
      
      // 2. Explicitly format for Indian Standard Time
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata' 
      }).format(date).toUpperCase();
    } catch (err) {
      console.error("Date error:", err);
      return dateStr; 
    }
  };

  const openInvoiceModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setRangeMode(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const fId = (inv.franchise_id || "").toString().toLowerCase();
      const custName = (inv.customer_name || "").toLowerCase();
      const matchesSearch = !search || fId.includes(q) || custName.includes(q);
      
      const invDate = inv.created_at?.split('T')[0];
      let matchesDate = true;
      if (rangeMode && startDate && endDate) matchesDate = invDate >= startDate && invDate <= endDate;
      else if (startDate) matchesDate = invDate === startDate;

      return matchesSearch && matchesDate;
    });
  }, [search, startDate, endDate, rangeMode, invoices]);

  const stats = useMemo(() => {
    const revenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    return { total: filteredInvoices.length, revenue };
  }, [filteredInvoices]);

  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
        case 'dispatched': return { bg: '#ecfdf5', text: '#065f46', border: '#10b981' };
        case 'packed': return { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' };
        case 'incoming': return { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' };
        default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  if (loading) return <div style={styles.loader}>Accessing Ledger...</div>;

  return (
    <div style={styles.page}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .custom-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${PRIMARY} #f1f1f1; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .tr-hover:hover { background: #f8fafc; transition: 0.2s; }
      `}</style>

      <div style={styles.container} className="no-print">
        <header style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /> Back</button>
          <h1 style={styles.centerTitle}>INVOICE LEDGER</h1>
          <div style={styles.topFranchiseBadge}>FRANCHISE ID : {userProfile?.franchise_id || 'HQ-01'}</div>
        </header>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FileText size={20} color={PRIMARY}/></div>
            <div><p style={styles.statLabel}>Total Records</p><h2 style={styles.statValue}>{stats.total}</h2></div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#ecfdf5'}}><IndianRupee size={20} color={PRIMARY}/></div>
            <div><p style={styles.statLabel}>Total Billing</p><h2 style={styles.statValue}>₹{stats.revenue.toLocaleString('en-IN')}</h2></div>
          </div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <Search size={18} color="#9ca3af" />
            <input style={styles.input} placeholder="Search by Name or Franchise ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={styles.dateSection}>
             <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
             {rangeMode && <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
             <button onClick={() => setRangeMode(!rangeMode)} style={styles.toggleBtn}>{rangeMode ? "Daily" : "Range"}</button>
             <button onClick={resetFilters} style={styles.resetBtn}><RotateCcw size={16} /></button>
          </div>
        </div>

        <div style={styles.tableWrapper} className="custom-scroll">
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>INVOICE</th>
                <th style={styles.th}>FRANCHISE ID</th>
                <th style={styles.th}>CUSTOMER</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>DATE & TIME</th>
                <th style={{...styles.th, textAlign: 'right'}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const statusStyle = getStatusStyle(inv.status);
                return (
                  <tr key={inv.id} className="tr-hover" style={styles.tr} onClick={() => openInvoiceModal(inv)}>
                    <td style={styles.td}><span style={styles.idBadge}>#{inv.id.toString().slice(-6).toUpperCase()}</span></td>
                    <td style={styles.td}><span style={styles.fIdBadge}>ID: {inv.franchise_id}</span></td>
                    <td style={styles.td}>
                      <div style={{fontWeight: '700'}}>{inv.customer_name}</div>
                      <div style={{fontSize: '11px', color: '#6b7280'}}>{inv.customer_phone}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge, 
                        backgroundColor: statusStyle.bg, 
                        color: statusStyle.text,
                        borderColor: statusStyle.border
                      }}>
                        {inv.status || 'Incoming'}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDateTime(inv.created_at)}</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: '800', color: PRIMARY}}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedInvoice && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="custom-scroll" id="printable-area">
            <div style={styles.modalHeader} className="no-print">
              <div style={styles.modalHeaderLeft}>
                <Hash size={20} color={PRIMARY} />
                <h2 style={styles.modalTitle}>Invoice Details</h2>
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handlePrint} style={styles.printBtn}><Printer size={16}/> PRINT</button>
                <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={20}/></button>
              </div>
            </div>

            <div style={styles.invoiceMetaGrid}>
              <div style={{...styles.metaCard, borderLeft: `4px solid ${PRIMARY}`}}>
                <div style={styles.metaIcon}><Shield size={16} /></div>
                <div>
                  <p style={styles.metaLabel}>Origin Office</p>
                  <p style={{...styles.metaValue, fontSize: '16px'}}>Franchise ID : {selectedInvoice.franchise_id}</p>
                  <p style={styles.metaSubValue}>Location: {selectedInvoice.branch_location || 'Main Outlets'}</p>
                </div>
              </div>

              <div style={{...styles.metaCard, borderLeft: `4px solid ${getStatusStyle(selectedInvoice.status).border}`}}>
                <div style={styles.metaIcon}><Activity size={16} /></div>
                <div>
                  <p style={styles.metaLabel}>Order Status</p>
                  <p style={{...styles.metaValue, textTransform: 'uppercase'}}>{selectedInvoice.status || 'Incoming'}</p>
                  <p style={styles.metaSubValue}>Last Updated: {formatDateTime(selectedInvoice.created_at)}</p>
                </div>
              </div>

              <div style={styles.metaCard}>
                <div style={styles.metaIcon}><User size={16} /></div>
                <div>
                  <p style={styles.metaLabel}>Customer Details</p>
                  <p style={styles.metaValue}>{selectedInvoice.customer_name}</p>
                  <p style={styles.metaSubValue}><Phone size={10} /> {selectedInvoice.customer_phone}</p>
                </div>
              </div>
            </div>

            <div style={styles.itemsSection}>
              <h3 style={styles.sectionTitle}><ShoppingBag size={18} /> Order Items</h3>
              <table style={styles.itemTable}>
                <thead>
                  <tr style={styles.itemThead}>
                    <th style={styles.itemTh}>Item Name</th>
                    <th style={styles.itemTh}>Qty</th>
                    <th style={styles.itemTh}>Price</th>
                    <th style={{...styles.itemTh, textAlign: 'right'}}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr><td colSpan="4" style={{padding: '40px', textAlign: 'center'}}>Loading items...</td></tr>
                  ) : items.map((item) => (
                    <tr key={item.id} style={styles.itemTr}>
                      <td style={styles.itemTd}>
                        <div style={{fontWeight: '700', fontSize: '13px'}}>{item.item_name}</div>
                        <div style={{fontSize: '10px', color: '#9ca3af'}}>SKU: {item.stock_id?.slice(0,8)}</div>
                      </td>
                      <td style={styles.itemTd}>{item.quantity} {item.unit}</td>
                      <td style={styles.itemTd}>₹{item.price}</td>
                      <td style={{...styles.itemTd, textAlign: 'right', fontWeight: '700'}}>₹{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.modalFooter}>
              <div style={styles.totalRow}>
                <span>Total Amount Payable</span>
                <span style={{fontSize: '24px', fontWeight: '900', color: PRIMARY}}>₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f8fafc", height: "100vh", width: "100vw", fontFamily: '"Inter", sans-serif', overflow: "hidden" },
  container: { height: "100%", padding: "20px 40px", boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexShrink: 0 },
  centerTitle: { fontSize: "20px", fontWeight: "900", letterSpacing: '2px', color: '#1e293b' },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: `1px solid ${BORDER}`, padding: '8px 16px', borderRadius: '12px', color: "#6b7280", fontWeight: "700", cursor: "pointer", boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  topFranchiseBadge: { fontSize: '11px', fontWeight: '800', background: PRIMARY, color: '#fff', padding: '8px 16px', borderRadius: '8px', letterSpacing: '1px' },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '20px' },
  statCard: { flex: 1, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  statIcon: { width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' },
  statValue: { fontSize: '24px', fontWeight: '900', margin: 0, color: '#1e293b' },
  filterBar: { display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" },
  searchBox: { display: "flex", alignItems: "center", gap: "12px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "0 16px", flex: 1 },
  input: { border: "none", background: "none", padding: "14px 0", outline: "none", fontSize: "14px", width: "100%", fontWeight: "600" },
  dateSection: { display: 'flex', gap: '10px' },
  dateInput: { border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: '600' },
  toggleBtn: { background: '#fff', border: `1px solid ${BORDER}`, padding: '0 15px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  resetBtn: { background: '#fff', border: `1px solid ${BORDER}`, padding: '10px', borderRadius: '10px', cursor: 'pointer' },
  tableWrapper: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: "20px", flexGrow: 1, overflowY: 'auto' },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "18px 24px", fontSize: "11px", fontWeight: "800", color: '#64748b', textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}`, textAlign: 'left', background: '#fcfcfc' },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' },
  td: { padding: "18px 24px", fontSize: "13px", color: '#334155' },
  idBadge: { background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' },
  fIdBadge: { background: '#ecfdf5', color: PRIMARY, padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', textTransform: 'uppercase', border: '1px solid' },
  
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropBlur: '4px', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' },
  modalContent: { width: '600px', background: '#fff', height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', padding: '40px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: `1px solid ${BORDER}` },
  modalHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  modalTitle: { fontSize: '20px', fontWeight: '900', color: '#1e293b' },
  printBtn: { background: PRIMARY, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  closeBtn: { background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' },
  invoiceMetaGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '40px' },
  metaCard: { display: 'flex', gap: '15px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' },
  metaIcon: { width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, color: PRIMARY },
  metaLabel: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' },
  metaValue: { fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' },
  metaSubValue: { fontSize: '12px', color: '#64748b' },
  itemsSection: { flexGrow: 1 },
  sectionTitle: { fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#1e293b' },
  itemTable: { width: '100%', borderCollapse: 'collapse' },
  itemThead: { borderBottom: `2px solid ${BORDER}` },
  itemTh: { padding: '12px 0', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  itemTr: { borderBottom: `1px solid #f1f5f9` },
  itemTd: { padding: '15px 0', fontSize: '13px' },
  modalFooter: { marginTop: '40px', paddingTop: '30px', borderTop: `2px solid ${PRIMARY}` },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: '800' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: PRIMARY, fontSize: '24px' }
};

export default CentralInvoices;