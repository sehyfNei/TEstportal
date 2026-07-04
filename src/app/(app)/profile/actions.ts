"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  parseProfileUpdate,
  setAiConsent,
  updateProfile
} from "@/lib/profile/profile-service";

export type ProfileActionState = {
  ok: boolean;
  message: string;
};

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const update = parseProfileUpdate({
    name: formData.get("name"),
    prepStartDate: formData.get("prepStartDate"),
    dailyStudyMinutes: formData.get("dailyStudyMinutes"),
    preferredTestDays: formData.getAll("preferredTestDays")
  });

  if (!update) {
    return { ok: false, message: "Name is required." };
  }

  try {
    await updateProfile(supabase, user.id, update);
    revalidatePath("/profile");
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    console.error("[profile] update failed", error);
    return { ok: false, message: "Failed to save profile." };
  }
}

export async function setAiConsentAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const granted = formData.get("granted") === "true";

  try {
    await setAiConsent(supabase, user.id, granted);
    revalidatePath("/profile");
    return {
      ok: true,
      message: granted ? "AI features enabled." : "AI features disabled."
    };
  } catch (error) {
    console.error("[profile] consent update failed", error);
    return { ok: false, message: "Failed to update AI preference." };
  }
}
