import Link from "next/link";

type TaskLink = {
  label: string;
  description: string;
  href: string;
};

type TaskGroup = {
  title: string;
  intro: string;
  links: TaskLink[];
};

const taskGroups: TaskGroup[] = [
  {
    title: "Add questions",
    intro: "Grow the question bank — one at a time or in bulk.",
    links: [
      {
        label: "Write a question",
        description: "A simple form: question, options, tick the right answer, explanation.",
        href: "/admin/questions"
      },
      {
        label: "Import many questions",
        description: "Download the spreadsheet template, fill it, upload it back. No coding.",
        href: "/admin/questions/import"
      },
      {
        label: "Fill in missing explanations with AI",
        description: "Generates explanations for imported questions that have none, ten at a time.",
        href: "/admin/questions/backfill"
      },
      {
        label: "Generate questions with AI",
        description: "Pick a topic and difficulty; AI drafts MCQs for you to review before saving.",
        href: "/admin/questions/generate"
      },
      {
        label: "Manage source library",
        description: "Add past-year papers, articles, or notes to ground AI-generated questions in.",
        href: "/admin/sources"
      },
      {
        label: "Define subject experts",
        description: "Give each subject its own AI persona — a teaching prompt, optionally grounded in your sources.",
        href: "/admin/experts"
      }
    ]
  },
  {
    title: "Set up an exam",
    intro: "Create a new exam or change its topics and marking rules.",
    links: [
      {
        label: "Create or update an exam",
        description: "Guided form: name, duration, marking, topics. The portal handles the rest.",
        href: "/admin/manifests"
      },
      {
        label: "Build a fixed test paper",
        description: "Hand-pick questions in a set order so every student gets the same mock paper.",
        href: "/admin/templates"
      }
    ]
  },
  {
    title: "Review quality",
    intro: "Approve new questions and act on what students report.",
    links: [
      {
        label: "Approve draft questions",
        description: "Only approved questions appear in student tests.",
        href: "/admin/questions/review"
      },
      {
        label: "Questions students flagged",
        description: "Reported errors and bad questions; 3 flags auto-quarantines a question.",
        href: "/admin/questions/flags"
      },
      {
        label: "AI answers students disliked",
        description: "AI explanations rated unhelpful, with a link to the session for context.",
        href: "/admin/ai-ratings"
      },
      {
        label: "Quality analytics",
        description: "Difficulty, discrimination, and a suggested tier computed nightly from real attempts.",
        href: "/admin/quality"
      }
    ]
  },
  {
    title: "Keep it running",
    intro: "Health checks for the platform — worth a daily glance.",
    links: [
      {
        label: "Health dashboard",
        description: "Queue, failures, AI spend, and feature switches (turn AI features on/off).",
        href: "/admin/ops"
      },
      {
        label: "Background jobs",
        description: "AI analysis and other jobs; retry anything that failed.",
        href: "/admin/jobs"
      },
      {
        label: "Audit log",
        description: "Who changed a question's status, ran a bulk import, or imported a manifest, and when.",
        href: "/admin/audit"
      }
    ]
  }
];

export default function AdminPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Admin console</p>
        <h1 className="mt-2 text-3xl font-semibold">What would you like to do?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Everything here is grouped by task. The most common day-to-day job is adding questions
          and approving them so they reach students.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {taskGroups.map((group) => (
          <div className="rounded-xl border border-border bg-card shadow-card p-5" key={group.title}>
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{group.intro}</p>
            <div className="mt-4 grid gap-3">
              {group.links.map((link) => (
                <Link
                  className="rounded-md border border-border bg-background p-3 transition hover:border-primary"
                  href={link.href}
                  key={link.href}
                >
                  <p className="text-sm font-semibold text-primary">{link.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
