import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, Search, X, Download, ArrowRight, RotateCcw, FileX, MapPin, User, Hash,
  FileText, IndianRupee
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
  }, []);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('franchise_id')
      .eq('id', user.id)
      .single();
    if (data) setUserProfile(data);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, profiles:created_by (franchise_id, name, address, branch_location)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setRangeMode(false);
  };

  const openInvoiceModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    setItems(data || []);
    setItemsLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const fId = (inv.profiles?.franchise_id || "").toString().toLowerCase();
      const custName = (inv.customer_name || "").toLowerCase();
      const invId = (inv.id || "").toString().toLowerCase();
      const phone = (inv.customer_phone || "").toString().toLowerCase();
      const amount = (inv.total_amount || 0).toString().toLowerCase();
      const date = inv.created_at ? new Date(inv.created_at).toLocaleDateString().toLowerCase() : "";

      const matchesSearch = !search || fId.includes(q) || custName.includes(q) || invId.includes(q) || phone.includes(q) || amount.includes(q) || date.includes(q);
      if (!inv.created_at) return matchesSearch; 
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

  const stats = useMemo(() => {
    const total = filteredInvoices.length;
    const revenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    return { total, revenue };
  }, [filteredInvoices]);

  if (loading) return <div style={styles.loader}>Accessing Ledger...</div>;

  return (
    <div style={styles.page}>
      {/* FORCE SCROLLBAR VISIBILITY 
          We use a high-contrast thumb color and specific width to ensure it is visible 
      */}
      <style>{`
        .custom-scroll {
          overflow-y: scroll !important; /* Forces scroll mechanism */
          scrollbar-width: thin;
          scrollbar-color: ${PRIMARY} #f1f1f1;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
          display: block !important;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1; /* Visible Gray */
          border-radius: 10px;
          border: 2px solid #f8fafc;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: ${PRIMARY}; /* Highlight on hover */
        }
        
        /* STICKY THEAD FIX */
        .sticky-th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f9fafb !important;
          box-shadow: 0 1px 0 ${BORDER};
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <ArrowLeft size={20} /> <span>Back</span>
            </button>
          </div>
          <h1 style={styles.centerTitle}>INVOICE LEDGER</h1>
          <div style={styles.headerRight}>
            <div style={styles.topFranchiseBadge}>Franchise ID: {userProfile?.franchise_id || '1'}</div>
            <button onClick={() => {}} style={styles.refreshBtn}><Download size={18} /><span>EXPORT</span></button>
          </div>
        </header>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FileText size={20} color={PRIMARY}/></div>
            <div><p style={styles.statLabel}>Total Invoices</p><h2 style={styles.statValue}>{stats.total}</h2></div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#ecfdf5'}}><IndianRupee size={20} color={PRIMARY}/></div>
            <div><p style={styles.statLabel}>Total Revenue</p><h2 style={styles.statValue}>₹{stats.revenue.toLocaleString('en-IN')}</h2></div>
          </div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <Search size={18} color="#9ca3af" />
            <input style={styles.input} placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={styles.dateSection}>
            <div style={styles.toggleWrapper}>
              <button onClick={() => setRangeMode(!rangeMode)} style={styles.switch}>
                <div style={{...styles.knob, transform: rangeMode ? 'translateX(14px)' : 'translateX(0px)'}} />
              </button>
              <span style={styles.toggleLabel}>{rangeMode ? "Range" : "Day"}</span>
            </div>
            <div style={styles.dateInputs}>
              <input type="date" style={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {rangeMode && <input type="date" style={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
            </div>
            <button onClick={resetFilters} style={styles.resetBtn}><RotateCcw size={16} /></button>
          </div>
        </div>

        {/* THE SCROLLABLE AREA 
            Combined flex-grow and custom-scroll class ensures it stays within screen and scrolls
        */}
        <div style={styles.tableWrapper} className="custom-scroll">
          <table style={styles.table}>
            <thead>
              <tr>
                <th className="sticky-th" style={{...styles.th, width: '60px'}}>S.NO</th>
                <th className="sticky-th" style={styles.th}>INVOICE ID</th>
                <th className="sticky-th" style={styles.th}>FRANCHISE ID</th>
                <th className="sticky-th" style={styles.th}>CUSTOMER</th>
                <th className="sticky-th" style={styles.th}>PHONE</th>
                <th className="sticky-th" style={styles.th}>DATE</th>
                <th className="sticky-th" style={{...styles.th, textAlign: 'right', paddingRight: '40px'}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, index) => (
                <tr key={inv.id} style={styles.tr} onClick={() => openInvoiceModal(inv)}>
                  <td style={styles.tdIndex}>{index + 1}</td>
                  <td style={styles.td}><span style={styles.idBadge}>#{inv.id.toString().slice(-6)}</span></td>
                  <td style={styles.td}><code style={styles.code}>{inv.profiles?.franchise_id || "—"}</code></td>
                  <td style={{...styles.td, fontWeight: '700'}}>{inv.customer_name}</td>
                  <td style={{...styles.td, color: '#6b7280'}}>{inv.customer_phone || "—"}</td>
                  <td style={styles.td}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: '800', paddingRight: '40px', color: PRIMARY}}>₹{Number(inv.total_amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div style={styles.emptyState}><FileX size={48} color="#e5e7eb" /><p>No records found</p></div>
          )}
        </div>
      </div>

      {/* MODAL remains same as previous version */}
    </div>
  );
}

const styles = {
  page: { background: "#fff", height: "100vh", width: "100vw", fontFamily: '"Inter", sans-serif', overflow: "hidden" },
  container: { height: "100%", padding: "20px 40px", boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 },
  headerLeft: { width: '300px' },
  centerTitle: { fontSize: "24px", fontWeight: "900", textAlign: 'center', flex: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-end', width: '300px' },
  topFranchiseBadge: { fontSize: '13px', fontWeight: '700', background: '#f3f4f6', padding: '8px 16px', borderRadius: '10px' },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#6b7280", fontWeight: "600", cursor: "pointer" },
  refreshBtn: { display: "flex", alignItems: "center", gap: "8px", background: PRIMARY, color: "#fff", border: "none", padding: "10px 18px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", cursor: "pointer" },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '20px', flexShrink: 0 },
  statCard: { flex: 1, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px' },
  statIcon: { width: '44px', height: '44px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  statValue: { fontSize: '20px', fontWeight: '800', margin: 0 },
  filterBar: { display: "flex", gap: "20px", marginBottom: "20px", alignItems: "center", flexShrink: 0 },
  searchBox: { display: "flex", alignItems: "center", gap: "12px", background: "#f9fafb", border: `1.5px solid ${BORDER}`, borderRadius: "16px", padding: "0 16px", flex: 1 },
  input: { border: "none", background: "none", padding: "12px 0", outline: "none", fontSize: "14px", width: "100%", fontWeight: "600" },
  dateSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  toggleWrapper: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '5px 12px', borderRadius: '12px' },
  toggleLabel: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  switch: { width: '32px', height: '18px', background: '#d1d5db', borderRadius: '20px', border: 'none', position: 'relative', cursor: 'pointer', padding: '2px' },
  knob: { width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: '0.2s ease' },
  dateInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  dateInput: { border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '8px 10px', fontSize: '12px' },
  resetBtn: { background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' },
  
  // CRITICAL FIX: tableWrapper must have flex-grow: 1 and overflow-y: scroll
  tableWrapper: { 
    border: `1px solid ${BORDER}`, 
    borderRadius: "20px", 
    flexGrow: 1, 
    background: '#fff',
    overflow: 'hidden', /* Clipping the corners of the table */
    display: 'block'
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { padding: "16px 24px", fontSize: "11px", fontWeight: "800", color: PRIMARY, textTransform: 'uppercase' },
  tr: { borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' },
  td: { padding: "16px 24px", fontSize: "14px" },
  tdIndex: { padding: "16px 24px", fontSize: "13px", color: "#9ca3af", fontWeight: '700' },
  idBadge: { background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: 'monospace' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#9ca3af' },
  loader: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: PRIMARY, fontSize: '20px' }
};

export default CentralInvoices;