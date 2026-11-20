import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

/** True when both Supabase env vars are present and non-empty. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0

/**
 * Client is created untyped on purpose: the schema is small and hand-writing
 * PostgREST generics is brittle. Row/RPC shapes live in `src/types/db.ts` and
 * are asserted in `src/lib/api.ts`.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: { eventsPerSecond: 12 },
      },
    })
  : null
