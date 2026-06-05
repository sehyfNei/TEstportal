"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function retryJobAction(jobId: string) {
  if (!UUID_REGEX.test(jobId)) {
    return { ok: false, message: "Invalid job ID format. Must be a UUID." };
  }

  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("retry_job", {
      p_job_id: jobId
    });

    if (error) {
      return { ok: false, message: `Failed to retry job: ${error.message}` };
    }

    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: getErrorMessage(error) || "An unexpected error occurred." };
  }
}
