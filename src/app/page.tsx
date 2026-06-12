import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Database,
  GraduationCap,
  ShieldCheck
} from "lucide-react";

const phaseZeroItems = [
  {
    icon: ClipboardCheck,
    title: "Exam manifest",
    detail: "Config-first setup for syllabus, marking, topics, concepts, and cutoffs."
  },
  {
    icon: Database,
    title: "Question bank",
    detail: "Versioned content workflow with review, approval, quality tiers, and flags."
  },
  {
    icon: ShieldCheck,
    title: "Diagnostic loop",
    detail: "Session engine, autosave, scoring, mastery, mistakes, and retests."
  }
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <GraduationCap size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Test Series Portal
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              href="/register"
            >
              Get started
            </Link>
          </nav>
        </header>

        <div className="flex flex-col items-start gap-5 pb-4 pt-10 md:pt-16">
          <p className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Diagnostic-first preparation
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            A test-led preparation engine that learns where you are weak.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Take a diagnostic, get scored with real marking rules, watch mastery
            and readiness update, and let every mistake schedule its own retest.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-card-hover"
              href="/register"
            >
              Create account
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {phaseZeroItems.map((item) => (
            <article
              className="group rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card transition-shadow hover:shadow-card-hover"
              key={item.title}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <item.icon size={20} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.detail}
              </p>
            </article>
          ))}
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ArrowRight className="text-primary" size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Start with a diagnostic
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Sign in, pick your exam, and take the first test — the dashboard,
              mistake notebook, and retest queue build themselves from there.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
