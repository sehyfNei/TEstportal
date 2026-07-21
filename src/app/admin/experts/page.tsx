import { ExpertPersonaManager, type PersonaRow } from "@/components/admin/expert-persona-manager";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExamOption = { id: string; name: string };

type PersonaQueryRow = {
  id: string;
  name: string;
  system_prompt: string;
  generation_cadence: string;
  is_active: boolean;
  topic?: { name?: string | null; exams?: { name?: string | null } | null } | null;
};

export default async function AdminExpertsPage() {
  const [exams, personas] = await Promise.all([loadExams(), loadPersonas()]);

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Question Bank</p>
        <h1 className="mt-2 text-3xl font-semibold">Subject experts</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Define an AI expert persona per subject or topic — its own teaching prompt, optionally grounded
          in your source library. Only one expert can be active per topic at a time.
        </p>
      </div>

      {!hasSupabaseConfig() ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Supabase is not configured yet. Add Supabase URL and anon key first.
        </div>
      ) : (
        <ExpertPersonaManager exams={exams} personas={personas} />
      )}
    </section>
  );
}

async function loadExams(): Promise<ExamOption[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("id,name").eq("is_active", true).order("name");

  return (data ?? []) as ExamOption[];
}

async function loadPersonas(): Promise<PersonaRow[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expert_personas")
    .select("id,name,system_prompt,generation_cadence,is_active,topic:topics(name,exams(name))")
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const rows = (data ?? []) as PersonaQueryRow[];
  const personaIds = rows.map((row) => row.id);

  const sourceCounts = new Map<string, number>();
  if (personaIds.length) {
    const { data: bindings } = await supabase
      .from("expert_persona_sources")
      .select("persona_id")
      .in("persona_id", personaIds);

    for (const binding of (bindings ?? []) as { persona_id: string }[]) {
      sourceCounts.set(binding.persona_id, (sourceCounts.get(binding.persona_id) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    generationCadence: row.generation_cadence,
    isActive: row.is_active,
    topicName: row.topic?.name ?? "Unknown topic",
    examName: row.topic?.exams?.name ?? "Unknown exam",
    sourceCount: sourceCounts.get(row.id) ?? 0
  }));
}
