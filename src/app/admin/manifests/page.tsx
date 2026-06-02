import { ManifestValidator } from "@/components/admin/manifest-validator";

export default function AdminManifestsPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Exam Template Store</p>
        <h1 className="mt-2 text-3xl font-semibold">Manifest import</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Paste an exam manifest to validate the schema and import the exam hierarchy. This keeps
          new exams configurable through JSON instead of code changes.
        </p>
      </div>
      <ManifestValidator />
    </section>
  );
}
