"use server";

import { fetchDashboardOverview, type DashboardOverview } from "@/lib/dashboard/overview";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type GetDashboardOverviewState =
  | { ok: true; data: DashboardOverview }
  | { ok: false; message: string };

export async function getDashboardOverviewAction(
  examId: string
): Promise<GetDashboardOverviewState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  if (!isUuid(examId)) {
    return { ok: false, message: "Valid exam id is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const data = await fetchDashboardOverview(supabase, user.id, examId);
  return { ok: true, data };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
