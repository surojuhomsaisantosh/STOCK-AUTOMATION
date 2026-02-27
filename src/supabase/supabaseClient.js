import { createClient } from "@supabase/supabase-js";

const supabaseDirectUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Client uses the REAL supabase URL (so WebSocket/realtime works normally).
// HTTP requests are rewritten to go through the Vercel proxy inside resilientFetch.
const supabaseUrl = supabaseDirectUrl;

// ============ GLOBAL RESILIENT FETCH ============
// A lightweight fetch wrapper with timeout + server error retry.
// In production, rewrites supabase.co HTTP URLs through the Vercel proxy
// to bypass carrier DNS blocking (e.g., Jio in India).

const MAX_RETRIES = 1;
const BASE_DELAY = 1000;
const REQUEST_TIMEOUT = 15000;

// Rewrite supabase.co URLs to proxy (works in both dev and production)
const SUPABASE_DOMAIN = 'vfhwuncpzbsjegmedvjr.supabase.co';

export function getProxiedUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.includes(SUPABASE_DOMAIN)) {
    const proxied = url.replace(`https://${SUPABASE_DOMAIN}`, window.location.origin + '/sb-proxy');
    console.log(`🔀 [PROXY] ${url.substring(0, 60)}... → ${proxied.substring(0, 60)}...`);
    return proxied;
  }
  return url;
}

async function resilientFetch(url, options = {}) {
  const proxiedUrl = getProxiedUrl(url);
  let lastError;

  // If supabase-js passed a pre-aborted signal, strip it and proceed
  const cleanOptions = (options.signal && options.signal.aborted)
    ? (() => { const { signal, ...rest } = options; return rest; })()
    : options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await Promise.race([
        fetch(proxiedUrl, cleanOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), REQUEST_TIMEOUT)
        )
      ]);

      // Only retry on gateway errors (502/503/504)
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.log(`🔄 [NET] Server ${response.status} on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;

      // If fetch threw AbortError, strip the signal and retry once
      if (err?.name === "AbortError" && attempt < MAX_RETRIES) {
        console.log(`🔄 [NET] Request aborted, retrying without signal...`);
        const { signal, ...optsWithoutSignal } = options;
        try {
          const response = await Promise.race([
            fetch(proxiedUrl, optsWithoutSignal),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timed out")), REQUEST_TIMEOUT)
            )
          ]);
          return response;
        } catch (retryErr) {
          throw retryErr;
        }
      }

      if (err?.name === "AbortError" || attempt === MAX_RETRIES) {
        throw err;
      }

      const msg = (err?.message || "").toLowerCase();
      const isNetwork = msg.includes("failed to fetch") || msg.includes("load failed") ||
        msg.includes("networkerror") || msg.includes("request timed out");

      if (!isNetwork) {
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
    msg.includes("timed out") ||
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
export async function fetchWithRetry(operation, maxRetries = 1, baseDelay = 1000) {
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