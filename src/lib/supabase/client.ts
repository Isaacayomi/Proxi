import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function sanitize(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const supabaseUrl = sanitize(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  );

  const envAnon = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const vercelAnon = sanitize(process.env.SUPABASE_ANON_KEY);
  const supabaseAnonKey = vercelAnon.startsWith("ey")
    ? vercelAnon
    : envAnon.startsWith("ey")
      ? envAnon
      : envAnon || vercelAnon;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
