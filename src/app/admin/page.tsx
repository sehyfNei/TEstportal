import Link from "next/link";

type SectionStatus = "live" | "phase-1" | "phase-1.5";

const sections: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  status: SectionStatus;
}[] = [
  {
    title: "Exam manifest engine",
    description:
      "Import syllabus, topics, concepts, marking rules, and historical cutoffs via JSON manifest.",
    href: "/admin/manifests",
    linkLabel: "Open manifest validator",
    status: "live"
  },
  {
    title: "Question CRUD",
    description: "Create, edit, and retire individual questions while preserving full version history.",
    href: "/admin/questions",
    linkLabel: "Open question CRUD",
    status: "live"
  },
  {
    title: "Bulk question import",
    description: "Upload questions in bulk via JSON or CSV with per-row validation and error reports.",
    href: "/admin/questions/import",
    linkLabel: "Open bulk import",
    status: "live"
  },
  {
    title: "Review and approval workflow",
    description: "Approve, reject, and publish draft questions. Only approved questions appear in tests.",
    href: "/admin/questions/review",
    linkLabel: "Open review queue",
    status: "live"
  },
  {
    title: "Flagged content queue",
    description: "Review AI explanations users reported as unhelpful, then open the session for context.",
    href: "/admin/ai-ratings",
    linkLabel: "Open flagged queue",
    status: "live"
  },
  {
    title: "Jobs monitor",
    description: "Inspect failed, pending, and dead background jobs. Retry important jobs from this view.",
    href: "/admin/jobs",
    linkLabel: "Open jobs monitor",
    status: "live"
  },
  {
    title: "Question flag queue",
    description: "Review user-reported question flags. Auto-quarantine triggers at 3 distinct open flags per question.",
    href: "/admin/questions/flags",
    linkLabel: "Open flag queue",
    status: "live"
  },
  {
    title: "Audit log",
    description: "View admin actions, role changes, question approvals, and manifest imports with filters.",
    status: "phase-1"
  },
  {
    title: "Question quality analytics",
    description: "Track difficulty index, discrimination, flag spikes, and quality tier distribution per exam.",
    status: "phase-1.5"
  }
];

const statusLabel: Record<SectionStatus, string> = {
  live: "Live",
  "phase-1": "Phase 1",
  "phase-1.5": "Phase 1.5"
};

const statusClass: Record<SectionStatus, string> = {
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "phase-1": "bg-blue-50 text-blue-700 ring-blue-600/20",
  "phase-1.5": "bg-slate-100 text-slate-600 ring-slate-500/20"
};

export default function AdminPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Admin console</p>
        <h1 className="mt-2 text-3xl font-semibold">Overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Content operations and platform management for the Test Series Portal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div className="rounded-xl border border-border bg-card shadow-card p-5" key={section.title}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold leading-5">{section.title}</h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  statusClass[section.status]
                }`}
              >
                {statusLabel[section.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{section.description}</p>
            {section.href && section.linkLabel ? (
              <Link className="mt-4 inline-flex text-xs font-medium text-primary" href={section.href}>
                {section.linkLabel}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
