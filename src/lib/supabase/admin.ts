import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

function validateAndCreateAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // During next build / CI static generation, environment secrets might not be injected.
  // We allow dummy fallback ONLY during build phase if explicitly detected.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (!url || !serviceKey) {
    if (isBuildPhase || process.env.NODE_ENV === 'test') {
      return createClient(
        url || 'http://localhost:54321',
        serviceKey || 'mock_service_role_key_for_build_only',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    throw new Error(
      `Supabase Admin configuration missing: ${
        !url ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''
      }${!serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY ' : ''}must be defined.`
    );
  }

  // Detect and reject accidental client-side invocation
  if (typeof window !== 'undefined') {
    throw new Error('Supabase Admin client must never be initialized on the client side.');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Returns the lazily initialized Supabase Admin client with service-role privileges.
 * Fails safely and immediately if credentials are missing in runtime.
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  if (!cachedAdminClient) {
    cachedAdminClient = validateAndCreateAdminClient();
  }
  return cachedAdminClient;
};

/**
 * Backward-compatible proxy for `supabaseAdmin`.
 * Defers initialization until first property access so importing this module
 * does not crash build/CI when service role key is not yet needed.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
