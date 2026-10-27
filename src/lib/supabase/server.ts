import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

function sanitize(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

function isValidSupabaseKey(k?: string): boolean {
  if (!k) return false;
  const s = k.trim();
  // Valid Supabase keys are either JWTs (start with 'ey') or modern scoped keys (start with 'sb_')
  return s.length > 20 && (s.startsWith("ey") || s.startsWith("sb_"));
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const rawServiceKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const rawAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const key = isValidSupabaseKey(rawServiceKey)
    ? rawServiceKey
    : isValidSupabaseKey(rawAnonKey)
      ? rawAnonKey
      : "";

  if (!url || !key) {
    return null;
  }

  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return serverClient;
}
