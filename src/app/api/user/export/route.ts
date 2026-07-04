import { exportUserData } from "@/lib/profile/export-service";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await exportUserData(supabase, user.id);
    const filename = `tsp-data-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("[user/export] failed", error);
    return Response.json({ error: "Export failed." }, { status: 500 });
  }
}
