import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    // Extract the new htmlBody and pdfAttachment sent from the frontend
    const { orderId, userEmail, customerName, htmlBody, pdfAttachment } = payload

    console.log(`DEBUG: Starting email process for Order: ${orderId} to ${userEmail}`);

    // 1. Validate Email & Attachment
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error(`Invalid recipient email: ${userEmail}`);
    }
    if (!pdfAttachment) {
      throw new Error("Missing PDF attachment data from frontend");
    }

    // 2. Resend API Call
    const apiKey = Deno.env.get('RESEND_API_KEY')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Note: Update this to your actual domain when moving out of Resend testing mode
        to: userEmail,
        subject: `Invoice for Order #${orderId}`,
        // Use the friendly HTML we generated in the frontend, or fallback to simple text
        html: htmlBody || `<h3>Hello ${customerName},</h3><p>Your order was successful. Please find the invoice attached.</p>`,
        attachments: [{
          content: pdfAttachment, // Use the Base64 string from the frontend
          filename: `Invoice_${orderId}.pdf`
        }]
      }),
    })

    const resData = await res.json()
    console.log("DEBUG: Resend API Response:", JSON.stringify(resData));

    if (!res.ok) throw new Error(resData.message || "Resend failed to send");

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("CRITICAL FUNCTION ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})