"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { isKnownFlag } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

export async function toggleFeatureFlagAction(formData: FormData): Promise<void> {
  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return;
  }

  const key = String(formData.get("key") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!isKnownFlag(key)) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("feature_flags").update({ enabled }).eq("key", key);
  revalidatePath("/admin/ops");
}
