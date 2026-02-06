// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
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
  } catch (err) {
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
      try { items = notes.items ? JSON.parse(notes.items) : []; } catch (e) {}

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
        
        // 3. Attempt Recovery
        const { error } = await supabaseAdmin.rpc("place_stock_order", {
          p_created_by: notes.user_id,
          p_customer_name: notes.customer_name || "Unknown",
          p_customer_email: notes.customer_email || payment.email || "",
          p_customer_phone: notes.customer_phone || payment.contact || "",
          p_customer_address: notes.customer_address || "",
          p_branch_location: "", 
          p_franchise_id: notes.franchise_id || "N/A",
          p_payment_id: paymentId,
          p_items: items
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

  } catch (err) {
    console.error("🔥 Webhook processing error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})