import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Phase 0 dashboard shell</p>
        <h1 className="mt-2 text-3xl font-semibold">Your preparation cockpit</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          This protected route is ready for the next build slice: profile-backed
          target exam selection and the exam manifest engine.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Next required setup</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add Supabase environment values to run real authentication and profile persistence.
        </p>
        <Link className="mt-4 inline-flex text-sm font-medium text-primary" href="/profile">
          Open profile shell
        </Link>
      </div>
    </section>
  );
}

