import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { 
  ArrowLeft, 
  Search, 
  X, 
  Download,
  ArrowRight,
  RotateCcw,
  FileX,
  MapPin,
  User,
  Hash
} from "lucide-react";

const PRIMARY = "rgb(0, 100, 55)";
const BORDER = "#e5e7eb";

function CentralInvoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [rangeMode, setRangeMode] = useState(false); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`*, profiles (franchise_id, name, address, branch_location)`)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setInvoices(data || []);
    setLoading(false);
  };

  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setRangeMode(false);
  };

  const openInvoiceModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setItems([]);
    setShowModal(true);
    setItemsLoading(true);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    setItems(data || []);
    setItemsLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchesSearch = !search || 
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.id.toString().includes(q) ||
        inv.profiles?.franchise_id?.toLowerCase().includes(q);
      
      const invDate = inv.created_at.split('T')[0];
      let matchesDate = true;
      if (rangeMode) {
        if (startDate && endDate) matchesDate = invDate >= startDate && invDate <= endDate;
      } else {
        if (startDate) matchesDate = invDate === startDate;
      }
      return matchesSearch && matchesDate;
    });
  }, [search, startDate, endDate, rangeMode, invoices]);

  const handleExport = () => {
    if (filteredInvoices.length === 0) return alert("No data to export");
    const headers = ["Invoice ID", "Franchise ID", "Customer Name", "Phone", "Date", "Amount"];
    const csvData = filteredInvoices.map(inv => [
      inv.id,
      inv.profiles?.franchise_id || "N/A",
      inv.customer_name,
      inv.customer_phone,
      new Date(inv.created_at).toLocaleDateString(),
      inv.total_amount
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvData].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Invoices_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={styles.loader}>Accessing Ledger...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* HEADER BAR */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          </div>

          <h1 style={styles.centerTitle}>INVOICE LEDGER</h1>

          <div style={styles.headerRight}>
            <button onClick={handleExport} style={styles.refreshBtn}>
              <Download size={18} />
              <span>EXPORT</span>
            </button>
          </div>
        </header>

        {/* FILTER BAR */}
        <div style={styles.filterBar}>
            <div style={styles.searchBox}>
                <Search size={18} color="#9ca3af" />
                <input 
                    style={styles.input} 
                    placeholder="Search by ID, Franchise, or Name..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div style={styles.dateSection}>
                <div style={styles.toggleWrapper}>
                    <span style={{...styles.toggleLabel, color: !rangeMode ? PRIMARY : '#9ca3af'}}>Day</span>
                    <button onClick={() => setRangeMode(!rangeMode)} style={styles.switch}>
                        <div style={{...styles.knob, transform: rangeMode ? 'translateX(14px)' : 'translateX(0px)'}} />
                    </button>
                    <span style={{...styles.toggleLabel, color: rangeMode ? PRIMARY : '#9ca3af'}}>Range</span>
                </div>

                <div style={styles.dateInputs}>
                    <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    {rangeMode && (
                        <>
                            <ArrowRight size={14} color="#9ca3af" />
                            <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </>
                    )}
                </div>
                <button onClick={resetFilters} style={styles.resetBtn} title="Clear Filters"><RotateCcw size={16} /></button>
            </div>
        </div>

        {/* TABLE SECTION */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>INVOICE</th>
                <th style={styles.th}>FRANCHISE ID</th>
                <th style={styles.th}>CUSTOMER NAME</th>
                <th style={styles.th}>PHONE NUMBER</th>
                <th style={styles.th}>DATE</th>
                <th style={{...styles.th, textAlign: 'right', paddingRight: '40px'}}>AMOUNT PAID</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} style={styles.tr} onClick={() => openInvoiceModal(inv)}>
                  <td style={styles.td}><span style={styles.idBadge}>#{inv.id.toString().slice(-6)}</span></td>
                  <td style={styles.td}><code style={styles.code}>{inv.profiles?.franchise_id || "—"}</code></td>
                  <td style={{...styles.td, fontWeight: '700'}}>{inv.customer_name}</td>
                  <td style={{...styles.td, color: '#6b7280'}}>{inv.customer_phone || "—"}</td>
                  <td style={styles.td}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: '800', paddingRight: '40px', color: PRIMARY}}>₹{Number(inv.total_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredInvoices.length === 0 && (
            <div style={styles.emptyState}>
                <FileX size={48} color="#e5e7eb" />
                <p style={{marginTop: '12px', fontWeight: '600'}}>No records match these filters</p>
            </div>
          )}
        </div>
      </div>

      {/* STATEMENT MODAL */}
      {showModal && selectedInvoice && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div><h3 style={{margin: 0, letterSpacing: '-0.5px'}}>Statement Overview</h3><span style={{fontSize: '11px', color: '#9ca3af'}}>Transaction Ref: {selectedInvoice.id}</span></div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            
            <div style={styles.modalBody}>
                <div style={styles.infoGrid}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}><Hash size={16} /></div>
                        <div><label style={styles.label}>Franchise ID</label><p style={styles.p}>{selectedInvoice.profiles?.franchise_id || "N/A"}</p></div>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}><User size={16} /></div>
                        <div><label style={styles.label}>Owner Name</label><p style={styles.p}>{selectedInvoice.profiles?.name || "N/A"}</p></div>
                    </div>
                </div>

                <div style={styles.addressBox}>
                    <div style={{color: PRIMARY, marginBottom: '5px'}}><MapPin size={16} /></div>
                    <div><label style={styles.label}>Franchise Address</label><p style={{...styles.p, fontSize: '13px', fontWeight: '500'}}>{selectedInvoice.profiles?.address || "No address on file"}</p></div>
                </div>

                <div style={styles.itemTableWrapper}>
                    <table style={styles.itemTable}>
                        <thead><tr style={styles.itemThRow}><th style={styles.itemTh}>ITEM DESCRIPTION</th><th style={styles.itemThCenter}>QTY</th><th style={styles.itemThRight}>TOTAL</th></tr></thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} style={{borderBottom: `1px solid ${BORDER}`}}>
                                    <td style={styles.itemTd}>{item.item_name}</td>
                                    <td style={styles.itemTdCenter}>{item.quantity}</td>
                                    <td style={styles.itemTdRight}>₹{(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={styles.totalSection}>
                    <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>TOTAL AMOUNT PAID</span>
                        <span style={styles.totalAmt}>₹{Number(selectedInvoice.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#fff", height: "100vh", fontFamily: '"Inter", sans-serif', color: "#111827", overflow: "hidden" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", position: "relative" },
  centerTitle: { fontSize: "22px", fontWeight: "900", letterSpacing: "-1px", position: "absolute", left: "50%", transform: "translateX(-50%)" },
  headerLeft: { width: '150px' },
  headerRight: { width: '150px', display: 'flex', justifyContent: 'flex-end' },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "600", cursor: "pointer" },
  refreshBtn: { display: "flex", alignItems: "center", gap: "8px", background: PRIMARY, color: "#fff", border: "none", padding: "10px 18px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", cursor: "pointer" },
  
  filterBar: { display: "flex", gap: "20px", marginBottom: "25px", alignItems: "center" },
  searchBox: { display: "flex", alignItems: "center", gap: "12px", background: "#f9fafb", border: `1.5px solid ${BORDER}`, borderRadius: "16px", padding: "0 16px", flex: 1 },
  input: { border: "none", background: "none", padding: "12px 0", outline: "none", fontSize: "13px", width: "100%", fontWeight: "600" },

  dateSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  toggleWrapper: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '5px 12px', borderRadius: '12px' },
  toggleLabel: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  switch: { width: '32px', height: '18px', background: '#d1d5db', borderRadius: '20px', border: 'none', position: 'relative', cursor: 'pointer', padding: '2px' },
  knob: { width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: '0.2s ease' },
  dateInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  dateInput: { border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '8px 10px', fontSize: '12px', fontWeight: '600', outline: 'none' },
  resetBtn: { background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#6b7280' },

  tableWrapper: { border: `1px solid ${BORDER}`, borderRadius: "24px", height: '58vh', overflowY: 'auto', position: 'relative' },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thRow: { background: "#f3f4f6", borderBottom: `2px solid ${PRIMARY}`, position: 'sticky', top: 0, zIndex: 10 },
  th: { padding: "16px 24px", fontSize: "10px", fontWeight: "900", color: PRIMARY, letterSpacing: "1.5px" },
  tr: { borderTop: `1px solid ${BORDER}`, cursor: 'pointer', transition: '0.2s' },
  td: { padding: "16px 24px", fontSize: "13px", color: "#111827" },
  idBadge: { background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '11px' },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" },

  emptyState: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#9ca3af' },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: "#fff", borderRadius: "32px", width: "650px", padding: "40px", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", marginBottom: "25px", borderBottom: `1px solid ${BORDER}`, paddingBottom: '15px' },
  
  infoGrid: { display: 'flex', gap: '20px', marginBottom: '15px' },
  infoCard: { flex: 1, background: '#f9fafb', padding: '15px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center' },
  infoIcon: { width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  addressBox: { background: '#f9fafb', padding: '15px 20px', borderRadius: '16px', marginBottom: '20px', display: 'flex', gap: '12px' },
  
  label: { fontSize: "9px", fontWeight: "900", color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' },
  p: { margin: 0, fontWeight: '700', fontSize: '14px', color: '#000' },
  
  itemTableWrapper: { maxHeight: '200px', overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: '12px' },
  itemTable: { width: '100%', borderCollapse: 'collapse' },
  itemThRow: { background: '#f9fafb', borderBottom: `1px solid ${BORDER}` },
  itemTh: { padding: '10px 15px', fontSize: '10px', color: '#9ca3af', textAlign: 'left' },
  itemThCenter: { padding: '10px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' },
  itemThRight: { padding: '10px 15px', fontSize: '10px', color: '#9ca3af', textAlign: 'right' },
  itemTd: { padding: '12px 15px', fontSize: '13px', fontWeight: '600' },
  itemTdCenter: { textAlign: 'center', fontSize: '13px' },
  itemTdRight: { textAlign: 'right', paddingRight: '15px', fontSize: '13px' },
  
  totalSection: { marginTop: '25px', paddingTop: '15px', borderTop: `2px solid ${PRIMARY}` },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: '11px', fontWeight: '900', color: PRIMARY },
  totalAmt: { fontSize: '22px', fontWeight: '900', color: PRIMARY },
  
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: PRIMARY }
};

export default CentralInvoices;