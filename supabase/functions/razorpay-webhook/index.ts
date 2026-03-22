// Setup type definitions for built-in Supabase Runtime APIs
// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * UTILS: Verify Razorpay Signature
 */
async function verifySignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === signature;
}

/**
 * UTILS: Process Refund via Razorpay API
 */
async function refundPayment(paymentId: string) {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  
  if (!keyId || !keySecret) {
    console.error("Missing Razorpay Keys for Refund");
    return;
  }

  // Basic Auth Header
  const auth = btoa(`${keyId}:${keySecret}`);

  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        notes: { reason: "Stock Unavailable / Order Failed" }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Refund Failed:", result);
    } else {
      console.log(`✅ Refund Successful for ${paymentId}`);
    }
  } catch (err: unknown) {
    console.error("Refund Network Error:", err);
  }
}

console.log("Razorpay Webhook Function Initialized");

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const body = await req.text();

    // 1. Security Check
    if (!signature || !webhookSecret || !(await verifySignature(body, signature, webhookSecret))) {
      console.error("❌ Signature verification failed.");
      return new Response("Unauthorized", { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const paymentId = payment.id;
      const notes = payment.notes || {};
      
      // Parse items safely
      let items = [];
      try { items = notes.items ? JSON.parse(notes.items) : []; } catch (_e) {}

      // Initialize Supabase Admin
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 2. Check Database for Existing Order
      const { data: existingInvoice } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("payment_id", paymentId)
        .single();

      if (!existingInvoice) {
        console.log(`⚠️ Order ${paymentId} missing. Attempting recovery...`);
        
        // 3. Attempt Recovery — pass all required fields from enriched notes
        let bankDetails = {};
        try { bankDetails = notes.bank_details ? JSON.parse(notes.bank_details) : {}; } catch { /* ignore */ }

        const orderTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        const { error } = await supabaseAdmin.rpc("place_stock_order", {
          p_created_by: notes.user_id,
          p_customer_name: notes.customer_name || "Unknown",
          p_customer_email: notes.customer_email || payment.email || "",
          p_customer_phone: notes.customer_phone || payment.contact || "",
          p_customer_address: notes.customer_address || "",
          p_branch_location: notes.branch_location || "",
          p_franchise_id: notes.franchise_id || "N/A",
          p_payment_id: paymentId,
          p_items: items,
          p_subtotal: parseFloat(notes.subtotal) || (payment.amount / 100),
          p_tax_amount: parseFloat(notes.tax_amount) || 0,
          p_round_off: parseFloat(notes.round_off) || 0,
          p_total_amount: parseFloat(notes.total_amount) || (payment.amount / 100),
          p_order_time: orderTime,
          p_snapshot_company_name: notes.company_name || "",
          p_snapshot_company_address: notes.company_address || "",
          p_snapshot_company_gst: notes.company_gst || "",
          p_snapshot_bank_details: bankDetails,
          p_snapshot_terms: notes.terms || ""
        });

        if (error) {
          console.error("❌ [Safety Net Error] DB Recovery Failed:", error.message);
          
          // 4. CRITICAL: AUTO-REFUND IF DB FAILS
          // If the DB rejects the order (e.g. stock is 0), we MUST refund the user.
          console.log(`💸 Initiating Auto-Refund for ${paymentId}...`);
          await refundPayment(paymentId);
          
          return new Response("Order creation failed, refund initiated.", { status: 500 });
        }
        console.log(`✅ [Safety Net Success] Order recovered.`);
      } else {
        console.log(`ℹ️ Order already exists.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("🔥 Webhook processing error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
})