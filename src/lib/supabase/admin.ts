import { createClient } from "@supabase/supabase-js";

export function hasAdminConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createAdminClient() {
  if (!hasAdminConfig()) {
    throw new Error("Supabase admin configuration (URL or SERVICE_ROLE_KEY) is missing.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
