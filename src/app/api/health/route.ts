import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Anonymous health probe for post-deploy smoke (TSP-144) and uptime checks.
// Exposes reachability only — no counts, no config details, no secrets.
export async function GET() {
  const checkedAt = new Date().toISOString();

  if (!hasSupabaseConfig()) {
    return Response.json({ ok: false, db: false, reason: "not_configured", checkedAt }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("exams")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return Response.json({ ok: false, db: false, reason: "query_failed", checkedAt }, { status: 503 });
    }

    return Response.json({ ok: true, db: true, checkedAt });
  } catch {
    return Response.json({ ok: false, db: false, reason: "unreachable", checkedAt }, { status: 503 });
  }
}
