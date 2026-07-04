import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { getAiConsent, getProfile, type UserProfile } from "@/lib/profile/profile-service";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Profile"
};

export default async function ProfilePage() {
  if (!hasSupabaseConfig()) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Notice message="Supabase is not configured. Add environment variables to enable profile settings." />
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?redirectTo=/profile");
  }

  const [profile, aiConsent] = await Promise.all([
    getProfile(supabase, user.id).catch(() => null),
    getAiConsent(supabase, user.id).catch(() => false)
  ]);

  return <ProfileForm aiConsent={aiConsent} profile={profile ?? defaultProfile(user.email)} />;
}

function defaultProfile(email: string | undefined): UserProfile {
  return {
    name: email?.split("@")[0] || "User",
    prepStartDate: null,
    dailyStudyMinutes: null,
    preferredTestDays: []
  };
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Profile</p>
      <h1 className="mt-2 text-3xl font-semibold">Study profile</h1>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-card">
      {message}
    </div>
  );
}
