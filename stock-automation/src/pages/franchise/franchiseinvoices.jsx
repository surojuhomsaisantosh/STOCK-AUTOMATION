import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import logo from "../../assets/logo.jpg";

function FranchiseInvoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  /* ======================
     FETCH INVOICES
  ====================== */
  useEffect(() => {
    const fetchInvoices = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("invoices")
        .select("id, total_amount, created_at, customer_name")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      setInvoices(data || []);
      setLoading(false);
    };

    fetchInvoices();
  }, []);

  /* ======================
     INSTANT FILTER (MEMO)
  ====================== */
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(inv => new Date(inv.created_at) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(inv => new Date(inv.created_at) <= to);
    }

    return result;
  }, [invoices, fromDate, toDate]);

  /* ======================
     OPEN MODAL
  ====================== */
  const openInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
    setItemsLoading(true);

    const { data } = await supabase
      .from("invoice_items")
      .select("item_name, quantity, unit, price")
      .eq("invoice_id", invoice.id);

    setInvoiceItems(data || []);
    setItemsLoading(false);
  };

  /* ======================
     PRINT / DOWNLOAD PDF
  ====================== */
  const handlePrint = () => {
    const total = selectedInvoice.total_amount;
    const taxable = (total / 1.05).toFixed(2);
    const gst = (total - taxable).toFixed(2);
    const halfGst = (gst / 2).toFixed(2);

    const itemsHTML = invoiceItems
      .map(
        (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.item_name}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>${item.price}</td>
          <td>5%</td>
          <td>${(item.quantity * item.price).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
    <html>
      <head>
        <title>Tax Invoice</title>
        <style>
          body { font-family: Arial; padding: 24px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #000; padding: 6px; }
          th { background: #f2f2f2; }
          .right { text-align: right; }
          img { max-height: 70px; }
        </style>
      </head>
      <body>
        <img src="${logo}" />
        <h3>TAX INVOICE</h3>

        <p>
          <b>Customer:</b> ${selectedInvoice.customer_name}<br/>
          <b>Date:</b> ${new Date(selectedInvoice.created_at).toLocaleDateString()}
        </p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <table>
          <tr><td class="right">Taxable Amount</td><td class="right">${taxable}</td></tr>
          <tr><td class="right">CGST @2.5%</td><td class="right">${halfGst}</td></tr>
          <tr><td class="right">SGST @2.5%</td><td class="right">${halfGst}</td></tr>
          <tr><td class="right"><b>Total</b></td><td class="right"><b>₹ ${total}</b></td></tr>
        </table>
      </body>
    </html>
    `;

    const w = window.open("", "", "width=900,height=700");
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading invoices…</div>;
  }

  const modalTotal = selectedInvoice?.total_amount || 0;
  const modalTaxable = (modalTotal / 1.05).toFixed(2);
  const modalGST = (modalTotal - modalTaxable).toFixed(2);
  const modalHalfGST = (modalGST / 2).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <button onClick={() => navigate(-1)} className="border px-4 py-2 rounded">
          Back
        </button>
        <h1 className="text-2xl font-semibold">Invoices</h1>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 mb-6 flex gap-4 border rounded">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left w-[40%]">Customer</th>
              <th className="p-4 text-center w-[20%]">Date</th>
              <th className="p-4 text-right w-[20%]">Total</th>
              <th className="p-4 text-center w-[20%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="p-4">{inv.customer_name}</td>
                <td className="p-4 text-center">
                  {new Date(inv.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-right font-medium">₹{inv.total_amount}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => openInvoiceDetails(inv)}
                    className="text-green-700 hover:underline"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500">
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-3xl">
            <button onClick={() => setShowModal(false)} className="float-right">✕</button>

            <h2 className="text-lg font-semibold mb-4">
              Invoice – {selectedInvoice.customer_name}
            </h2>

            {itemsLoading ? (
              <p>Loading items…</p>
            ) : (
              <>
                <table className="w-full text-sm border mb-4 table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left w-[40%]">Item</th>
                      <th className="text-center w-[15%]">Qty</th>
                      <th className="text-center w-[15%]">Unit</th>
                      <th className="text-right w-[15%]">Rate</th>
                      <th className="text-right w-[15%]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((i, idx) => (
                      <tr key={idx} className="border-t">
                        <td>{i.item_name}</td>
                        <td className="text-center">{i.quantity}</td>
                        <td className="text-center">{i.unit}</td>
                        <td className="text-right">₹{i.price}</td>
                        <td className="text-right">
                          ₹{(i.quantity * i.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <table className="text-sm">
                    <tbody>
                      <tr>
                        <td className="pr-6">Taxable Amount</td>
                        <td className="text-right">₹{modalTaxable}</td>
                      </tr>
                      <tr>
                        <td>CGST @2.5%</td>
                        <td className="text-right">₹{modalHalfGST}</td>
                      </tr>
                      <tr>
                        <td>SGST @2.5%</td>
                        <td className="text-right">₹{modalHalfGST}</td>
                      </tr>
                      <tr className="font-semibold">
                        <td>Total</td>
                        <td className="text-right">₹{modalTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* PRINT BUTTON */}
            <div className="mt-6 text-right">
              <button
                onClick={handlePrint}
                className="bg-green-700 text-white px-4 py-2 rounded"
              >
                Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseInvoices;
