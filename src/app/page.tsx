import Link from "next/link";
import { ArrowRight, ClipboardCheck, Database, ShieldCheck } from "lucide-react";

const phaseZeroItems = [
  {
    title: "Exam manifest",
    detail: "Config-first setup for syllabus, marking, topics, concepts, and cutoffs."
  },
  {
    title: "Question bank",
    detail: "Versioned content workflow with review, approval, quality tiers, and flags."
  },
  {
    title: "Diagnostic loop",
    detail: "Session engine, autosave, scoring, mastery, mistakes, and retests."
  }
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <p className="text-sm font-medium text-primary">Phase 0 build console</p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
            Test-led preparation engine
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            The first implementation target is the reliable loop: exam manifest,
            question bank, diagnostic session, scoring, mastery, mistake notebook,
            and retest queue.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold"
              href="/register"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {phaseZeroItems.map((item) => (
            <article
              className="rounded-lg border border-border bg-card p-5 text-card-foreground"
              key={item.title}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                {item.title === "Exam manifest" ? (
                  <ClipboardCheck className="h-5 w-5" />
                ) : item.title === "Question bank" ? (
                  <Database className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Next engineering step</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Implement Supabase Auth, profile storage, and the exam manifest schema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
