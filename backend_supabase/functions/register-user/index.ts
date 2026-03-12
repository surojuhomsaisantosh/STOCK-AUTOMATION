import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get Environment Variables (Injected by Supabase Platform)
    // The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically available to edge functions
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase internal environment variables.");
    }

    // 2. Initialize the Admin Client
    // This uses the service_role key to bypass RLS and create users on behalf of the app
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Parse Request Body
    const { email, password, metadata } = await req.json();

    if (!email || !password || !metadata) {
      return new Response(
        JSON.stringify({ error: "Missing email, password, or metadata" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 4. Create the User via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email if desired, or false to require verification
      user_metadata: metadata,
    });

    if (authError) {
      throw authError; // Caught below
    }

    // 5. Explicitly Send Welcome Email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const origin = req.headers.get("origin") || "https://jkshunited.com";
        const loginUrl = `${origin}/login`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "JKSH United <noreply@jkshunited.com>",
            to: email,
            subject: "Welcome to JKSH United Private Limited",
            html: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Welcome to JKSH United Private Limited</h2>
  
  <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
    Hello ${metadata.name},
  </p>
  
  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
    A franchise account for <strong>${metadata.company}</strong> has been successfully created for you at <strong>JKSH United Private Limited</strong>. 
  </p>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="color: #0f172a; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0; color: #334155; font-size: 15px; line-height: 1.8;">
      <li><strong>Franchise ID:</strong> ${metadata.franchise_id}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
  </div>
  
  <p style="color: #475569; font-size: 15px; line-height: 1.6;">
    To access your dashboard, please log in by clicking the button below:
  </p>
  
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #065f46; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Login to My Account
    </a>
  </div>
  
  <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
    If the button above doesn't work, copy and paste this link into your browser:<br>
    <a href="${loginUrl}" style="color: #065f46;">${loginUrl}</a>
  </p>
  
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  
  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} JKSH United Private Limited. All rights reserved.<br>
    This is an automated message, please do not reply.
  </p>
</div>
            `,
          }),
        });
        console.log(`Explicit Resend email sent to ${email}`);
      } catch (emailErr) {
        console.error("Failed to explicitly send Resend email:", emailErr);
        // Continue anyway so registration doesn't fail if just the email fails
      }
    } else {
      console.warn("RESEND_API_KEY not found; skipping explicit Resend welcome email");
    }

    // 6. Registration Success
    return new Response(
      JSON.stringify({
        message: "User created successfully",
        user: authData.user,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    // Return error details to the client
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
