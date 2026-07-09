// ============================================================
// lib/supabase/server.ts – Server-side Supabase client
// Used only in API routes / Server Components
// ============================================================
import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer service role key on server for write operations
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, key);
}
