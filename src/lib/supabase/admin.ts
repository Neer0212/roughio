import { createClient } from '@supabase/supabase-js';

let adminClient: any = null;

export const getSupabaseAdmin = () => {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
  }
  return adminClient;
};

// Also keep the old one but mock it if not present
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key',
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
