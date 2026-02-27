import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============ GLOBAL RESILIENT FETCH ============
// Injected into BOTH Supabase clients so EVERY call in the entire app
// automatically gets retry + timeout protection.

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;     // 1s, then 2s, then 4s
const REQUEST_TIMEOUT = 15000; // 15 seconds per attempt

function isRetryableError(error) {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||              // Safari
    msg.includes("the internet connection appears to be offline") ||
    error?.name === "AbortError" ||
    error?.name === "TypeError"                  // Most browsers throw TypeError for network failures
  );
}

async function resilientFetch(url, options = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Merge our timeout signal with any existing signal
    const originalSignal = options.signal;
    if (originalSignal?.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Don't retry server errors for auth endpoints (wrong password = 400, not retryable)
      // Only retry on 502/503/504 gateway errors
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.log(`🔄 [NET] Server ${response.status} on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // If the caller explicitly aborted, don't retry
      if (originalSignal?.aborted) throw err;

      // Only retry on network/timeout errors
      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err;
      }

      const delay = BASE_DELAY * Math.pow(2, attempt);
      console.log(`🔄 [NET] Fetch failed on attempt ${attempt + 1} (${err.message}). Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// 1. MAIN CLIENT: Handles standard app sessions, logins, and database sync.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: resilientFetch }
});

// 2. ADMIN/SERVICE CLIENT: Handles signups and staff management.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-auth-token'  // Unique key to avoid GoTrueClient conflict
  },
  global: { fetch: resilientFetch }
});

// ============ NETWORK RESILIENCE HELPERS ============

/**
 * Checks if an error is a network/timeout error (retryable) vs an auth/logic error (not retryable).
 */
export function isNetworkError(error) {
  if (!error) return false;
  const msg = (error.message || error.toString()).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("err_connection") ||
    msg.includes("err_timed_out") ||
    msg.includes("err_internet_disconnected") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("load failed") ||        // Safari-specific
    msg.includes("the internet connection appears to be offline") // Safari
  );
}

/**
 * Wraps a Supabase operation with retry + exponential backoff.
 * Only retries on network errors. Auth/permission errors fail immediately.
 *
 * Usage:
 *   const { data, error } = await fetchWithRetry(() =>
 *     supabase.from('table').select('*')
 *   );
 */
export async function fetchWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      // Supabase returns { data, error } — check for network-level errors in the error field
      if (result?.error && isNetworkError(result.error)) {
        throw result.error; // Force into catch block for retry
      }

      return result; // Success or non-network error — return as-is
    } catch (err) {
      lastError = err;

      // Only retry on network errors
      if (!isNetworkError(err) || attempt === maxRetries) {
        throw err;
      }

      const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
      console.log(`🔄 [RETRY] Attempt ${attempt + 1}/${maxRetries} failed (network). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Quick health check — pings Supabase to verify it's reachable.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
export async function checkSupabaseConnection(timeoutMs = 8000) {
  // First: check browser's online status
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, reason: "You appear to be offline. Please check your internet connection." };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Use a lightweight HEAD request to the Supabase REST endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok && response.status >= 500) {
      return { ok: false, reason: "Server is temporarily unavailable. Please try again in a moment." };
    }

    return { ok: true };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, reason: "Connection timed out. Your network may be slow or blocking access. Please try a different network." };
    }
    return { ok: false, reason: "Unable to reach the server. Please check your internet connection or try a different network (e.g., mobile data)." };
  }
}