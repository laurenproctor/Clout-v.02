import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

// This app uses Clerk for auth (not Supabase Auth), so all server-side DB
// operations use the service role key to bypass RLS on protected API routes.
export async function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
