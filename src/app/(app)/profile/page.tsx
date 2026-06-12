import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export default async function ProfilePage() {
  let email = "Supabase not configured";

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    email = user?.email ?? "No active user";
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Profile foundation</p>
        <h1 className="mt-2 text-3xl font-semibold">Study profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          This page will store target exams, exam date, daily study time, preferred test days,
          and AI consent.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card p-5">
        <h2 className="text-lg font-semibold">Current auth context</h2>
        <p className="mt-2 text-sm text-muted-foreground">{email}</p>
      </div>
    </section>
  );
}

