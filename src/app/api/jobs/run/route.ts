import { NextRequest } from "next/server";
import { createAdminClient, hasAdminConfig } from "@/lib/supabase/admin";
import { runPendingJobs } from "@/lib/jobs/runner";

export async function GET(request: NextRequest) {
  if (!hasAdminConfig()) {
    return Response.json(
      { error: "Supabase admin client is not configured (missing URL or SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 5;
  const workerId =
    searchParams.get("workerId") || `worker-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const adminClient = createAdminClient();
    const result = await runPendingJobs(adminClient, workerId, limit);
    return Response.json({ ok: true, result });
  } catch (error: any) {
    console.error("[api/jobs/run] execution failed:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests as well for flexibilty
  return GET(request);
}
