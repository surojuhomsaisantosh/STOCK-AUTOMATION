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

    // 5. Registration Success
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
