import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return Response.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return Response.json({ error: "Admin role required." }, { status: 403 });

  const manifestId = request.nextUrl.searchParams.get("manifestId");
  if (!manifestId) return Response.json({ error: "manifestId required." }, { status: 400 });

  const { data, error } = await supabase
    .from("exam_manifests")
    .select("manifest, slug, version")
    .eq("id", manifestId)
    .eq("is_active", true)
    .single();

  if (error || !data) return Response.json({ error: "Manifest not found." }, { status: 404 });

  const filename = `manifest-${data.slug}-v${data.version}.json`;
  const body = JSON.stringify(data.manifest, null, 2);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
