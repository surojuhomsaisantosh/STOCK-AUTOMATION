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
 * UTILS: Process Refund via Razorpay api
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
  // Health check for GET requests (useful for debugging connectivity)
  if (req.method === "GET") {
    return new Response(JSON.stringify({ 
      status: "alive", 
      timestamp: new Date().toISOString(),
      hasWebhookSecret: !!Deno.env.get("RAZORPAY_WEBHOOK_SECRET"),
      hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
      hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    console.log("🔔 [WEBHOOK] Incoming request received at", new Date().toISOString());
    console.log("🔔 [WEBHOOK] Method:", req.method);
    console.log("🔔 [WEBHOOK] Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const body = await req.text();

    console.log("🔔 [WEBHOOK] Has signature:", !!signature);
    console.log("🔔 [WEBHOOK] Has webhookSecret:", !!webhookSecret);
    console.log("🔔 [WEBHOOK] Body length:", body.length);
    console.log("🔔 [WEBHOOK] Body preview:", body.substring(0, 200));

    // 1. Security Check
    if (!signature || !webhookSecret) {
      console.error("❌ Missing signature or webhook secret. signature:", !!signature, "secret:", !!webhookSecret);
      return new Response("Unauthorized - missing credentials", { status: 401 });
    }

    const isValid = await verifySignature(body, signature, webhookSecret);
    console.log("🔔 [WEBHOOK] Signature valid:", isValid);

    if (!isValid) {
      console.error("❌ Signature verification FAILED. Received signature:", signature?.substring(0, 20) + "...");
      return new Response("Unauthorized - bad signature", { status: 401 });
    }

    console.log("✅ [WEBHOOK] Signature verified successfully!");
    const event = JSON.parse(body);
    console.log("🔔 [WEBHOOK] Event type:", event.event);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const paymentId = payment.id;
      const notes = payment.notes || {};
      
      // Parse packed notes format
      let cust: any = {};
      let calc: any = {};
      let cpy: any = {};
      
      try { cust = notes.cust ? JSON.parse(notes.cust) : {}; } catch { /* ignore */ }
      try { calc = notes.calc ? JSON.parse(notes.calc) : {}; } catch { /* ignore */ }
      try { cpy = notes.cpy ? JSON.parse(notes.cpy) : {}; } catch { /* ignore */ }

      // Reassemble chunked items (`i0` to `i11`)
      let itemsString = "";
      for (let i = 0; i < 15; i++) {
        if (notes[`i${i}`]) itemsString += notes[`i${i}`];
      }
      
      let items: any[] = [];
      try { 
        if (itemsString) {
          items = JSON.parse(itemsString); 
        } else if (notes.items) {
          items = JSON.parse(notes.items);
        }
      } catch (_e) {}

      // Old compatibility fields (if a webhook fails over from an old note structure)
      let customerInfo: Record<string, string> = {};
      try { customerInfo = notes.customer_info ? JSON.parse(notes.customer_info) : {}; } catch { /* ignore */ }
      let companyInfo: Record<string, string> = {};
      try { companyInfo = notes.company_info ? JSON.parse(notes.company_info) : {}; } catch { /* ignore */ }
      let bankDetails: any = {};
      try { bankDetails = notes.bank_details ? JSON.parse(notes.bank_details) : {}; } catch { /* ignore */ }

      // Map parameters seamlessly
      const userId = cust.id || notes.user_id;
      const franchiseId = cust.fid || notes.franchise_id || "N/A";
      const customerName = cust.n || notes.customer_name || "Unknown";
      const customerEmail = cust.e || notes.customer_email || payment.email || "";
      const customerPhone = cust.p || notes.customer_phone || payment.contact || "";
      const customerAddress = cust.a || notes.customer_address || customerInfo.address || "";
      const branchLocation = cust.b || notes.branch_location || customerInfo.branch_location || "";
      
      const subtotalAmt = calc.st !== undefined ? Number(calc.st) : (parseFloat(notes.subtotal) || (payment.amount / 100));
      const taxAmt = calc.ta !== undefined ? Number(calc.ta) : (parseFloat(notes.tax_amount) || 0);
      const transportAmt = calc.tc !== undefined ? Number(calc.tc) : (parseFloat(notes.transportation_charge) || 0);
      const roundOffAmt = calc.ro !== undefined ? Number(calc.ro) : (parseFloat(notes.round_off) || 0);
      const totalAmt = calc.total !== undefined ? Number(calc.total) : (parseFloat(notes.total_amount) || (payment.amount / 100));

      const compName = cpy.n || notes.company_name || "";
      const compAddress = cpy.a || notes.company_address || companyInfo.address || "";
      const compGst = cpy.g || notes.company_gst || companyInfo.gst || "";
      const compTerms = cpy.t || notes.terms || companyInfo.terms || "";
      const compBankDetails = cpy.bn ? {
        bank_name: cpy.bn, bank_acc_no: cpy.ba, bank_ifsc: cpy.bi
      } : bankDetails;

      const orderTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      console.log("🔔 [WEBHOOK] Payment ID:", paymentId);
      console.log("🔔 [WEBHOOK] User ID:", userId);
      console.log("🔔 [WEBHOOK] Items count:", items.length);
      console.log("🔔 [WEBHOOK] Total amount:", totalAmt);

      // Initialize Supabase Admin
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 2. Check Database for Existing Order
      console.log("🔔 [WEBHOOK] Checking for existing invoice...");
      const { data: existingInvoice, error: checkError } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("payment_id", paymentId)
        .single();

      if (checkError) {
        console.log("🔔 [WEBHOOK] No existing invoice found (expected):", checkError.message);
      }

      if (!existingInvoice) {
        console.log(`⚠️ Order ${paymentId} missing. Attempting recovery...`);
        
        const rpcParams = {
          p_created_by: userId,
          p_customer_name: customerName,
          p_customer_email: customerEmail,
          p_customer_phone: customerPhone,
          p_customer_address: customerAddress,
          p_branch_location: branchLocation,
          p_franchise_id: franchiseId,
          p_payment_id: paymentId,
          p_items: items,
          p_subtotal: subtotalAmt,
          p_tax_amount: taxAmt,
          p_transportation_charge: transportAmt,
          p_round_off: roundOffAmt,
          p_total_amount: totalAmt,
          p_order_time: orderTime,
          p_snapshot_company_name: compName,
          p_snapshot_company_address: compAddress,
          p_snapshot_company_gst: compGst,
          p_snapshot_bank_details: compBankDetails,
          p_snapshot_terms: compTerms
        };
        console.log("🔔 [WEBHOOK] RPC params:", JSON.stringify(rpcParams));

        const maxRetries = 3;
        let attempt = 0;
        let success = false;
        let lastError = null;

        while (attempt < maxRetries && !success) {
          attempt++;
          console.log(`🔔 [WEBHOOK] Calling place_stock_order (Attempt ${attempt}/${maxRetries})...`);
          
          const { error } = await supabaseAdmin.rpc("place_stock_order", rpcParams);

          if (error) {
            lastError = error;
            console.error(`❌ [Safety Net Error] DB Recovery Failed on attempt ${attempt}:`, error.message);
            
            if (attempt < maxRetries) {
               // Exponential backoff: 1s, 2s, 4s...
               const backoffDelay = Math.pow(2, attempt - 1) * 1000;
               console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
               await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          } else {
             success = true;
          }
        }

        if (!success) {
          console.error("❌ [Safety Net Final Error] DB Recovery FAILED after all retries:", lastError?.message);
          
          // 4. CRITICAL: AUTO-REFUND IF DB FAILS
          // If the DB rejects the order (e.g. stock is 0), we MUST refund the user.
          console.log(`💸 Initiating Auto-Refund for ${paymentId}...`);
          await refundPayment(paymentId);
          
          return new Response(`Order creation failed after ${maxRetries} attempts, refund initiated. Error: ${lastError?.message}`, { status: 500 });
        }
        
        console.log(`✅ [Safety Net Success] Order recovered successfully on attempt ${attempt}.`);
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