import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. MAIN CLIENT: Handles standard app sessions, logins, and database sync.
// This instance will persist the session in LocalStorage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. ADMIN/SERVICE CLIENT: Handles signups and staff management.
// Setting persistSession to false prevents the "Multiple instances" browser warning.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});