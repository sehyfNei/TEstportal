import { ManifestBuilder } from "@/components/admin/manifest-builder";
import { ManifestValidator } from "@/components/admin/manifest-validator";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ActiveManifest = {
  id: string;
  slug: string;
  version: number;
  created_at: string;
  exams: { name: string | null }[] | { name: string | null } | null;
};

async function loadActiveManifests(): Promise<ActiveManifest[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_manifests")
    .select("id, slug, version, created_at, exams(name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActiveManifest[];
}

export default async function AdminManifestsPage() {
  const manifests = await loadActiveManifests();

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Exams</p>
        <h1 className="mt-2 text-3xl font-semibold">Set up an exam</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Fill in the exam basics and its topics; the portal builds and checks everything else for
          you. Once the exam exists, add questions to its topics from the Question Bank.
        </p>
      </div>

      <ManifestBuilder />

      <details className="rounded-xl border border-border bg-card shadow-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Advanced: import a full manifest as JSON
        </summary>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          For sections, subtopics, concepts, and historical cutoffs, paste a complete manifest
          here. The guided form above covers the common case.
        </p>
        <div className="mt-4">
          <ManifestValidator />
        </div>
      </details>

      {manifests.length > 0 ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">Existing manifests</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Download a manifest to back it up or re-import it into another environment.
            </p>
          </div>
          <div className="grid gap-3">
            {manifests.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card shadow-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {(Array.isArray(m.exams) ? m.exams[0]?.name : m.exams?.name) ?? m.slug}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    v{m.version} &middot; {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
                  href={`/api/admin/manifest?manifestId=${m.id}`}
                  download={`manifest-${m.slug}-v${m.version}.json`}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
