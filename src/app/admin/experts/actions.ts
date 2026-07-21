"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { createExpertPersonaSchema } from "@/lib/question-bank/expert-persona-schema";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = "23505";

export type CreateExpertPersonaState = {
  ok: boolean;
  message: string;
};

export async function createExpertPersonaAction(input: {
  topicId: string;
  name: string;
  systemPrompt: string;
  generationCadence: string;
  sourceIds: string[];
}): Promise<CreateExpertPersonaState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const parsed = createExpertPersonaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid expert persona." };
  }

  const supabase = await createClient();
  const { data: persona, error } = await supabase
    .from("expert_personas")
    .insert({
      topic_id: parsed.data.topicId,
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      generation_cadence: parsed.data.generationCadence
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        message: "This topic already has an active expert. Deactivate it first, then try again."
      };
    }
    return { ok: false, message: error.message };
  }

  const personaId = (persona as Record<string, unknown>).id as string;

  if (parsed.data.sourceIds.length > 0) {
    const { error: bindError } = await supabase
      .from("expert_persona_sources")
      .insert(parsed.data.sourceIds.map((sourceId) => ({ persona_id: personaId, source_id: sourceId })));

    if (bindError) {
      return { ok: false, message: `Persona created, but binding sources failed: ${bindError.message}` };
    }
  }

  revalidatePath("/admin/experts");
  return { ok: true, message: "Expert persona created." };
}

export type SetPersonaActiveState = {
  ok: boolean;
  message: string;
};

export async function setPersonaActiveAction(personaId: string, isActive: boolean): Promise<SetPersonaActiveState> {
  if (!hasSupabaseConfig() || !UUID_PATTERN.test(personaId)) {
    return { ok: false, message: "Invalid persona." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expert_personas")
    .update({ is_active: isActive })
    .eq("id", personaId);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        message: "This topic already has an active expert. Deactivate it first, then try again."
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/experts");
  return { ok: true, message: isActive ? "Persona activated." : "Persona deactivated." };
}
