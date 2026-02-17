// ============================================================
// Supabase Client Factory
// Server-side (service role) and client-side (anon) clients
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client using service role key.
 * Bypasses RLS — used by Vercel Edge Functions only.
 * NEVER expose this client to the browser.
 */
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return serverClient;
}

/**
 * Client-side Supabase client using anon key.
 * Subject to RLS policies — safe for browser use.
 */
export function getAnonSupabase(): SupabaseClient {
  if (anonClient) return anonClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  anonClient = createClient(url, key);
  return anonClient;
}
