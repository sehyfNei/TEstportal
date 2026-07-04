"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setAiConsentAction,
  updateProfileAction,
  type ProfileActionState
} from "@/app/(app)/profile/actions";
import { VALID_DAYS, type UserProfile } from "@/lib/profile/profile-service";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
  aiConsent: boolean;
  profile: UserProfile;
};

const STUDY_TIME_OPTIONS = [
  { label: "Not set", value: 0 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
  { label: "4 hr", value: 240 },
  { label: "5 hr", value: 300 },
  { label: "6 hr", value: 360 },
  { label: "8 hr", value: 480 },
  { label: "10 hr", value: 600 },
  { label: "12 hr", value: 720 }
];

const initialProfileActionState: ProfileActionState = {
  ok: true,
  message: ""
};

export function ProfileForm({ aiConsent, profile }: ProfileFormProps) {
  const router = useRouter();
  const [profileState, profileAction, isSavingProfile] = useActionState(
    updateProfileAction,
    initialProfileActionState
  );
  const [consentState, consentAction, isSavingConsent] = useActionState(
    setAiConsentAction,
    initialProfileActionState
  );

  useEffect(() => {
    if (profileState.message && profileState.ok) {
      router.refresh();
    }
  }, [profileState.message, profileState.ok, router]);

  useEffect(() => {
    if (consentState.message && consentState.ok) {
      router.refresh();
    }
  }, [consentState.message, consentState.ok, router]);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold">Study profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tune your study preferences and control whether AI features can use your study data.
        </p>
      </div>

      <form action={profileAction} className="grid gap-5 rounded-xl border border-border bg-card p-5 shadow-card">
        <div>
          <h2 className="text-lg font-semibold">Study settings</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            These settings help shape reminders, planning, and future recommendations.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={profile.name}
            maxLength={120}
            name="name"
            required
            type="text"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Preparation start date
            <input
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              defaultValue={profile.prepStartDate ?? ""}
              name="prepStartDate"
              type="date"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Daily study time
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              defaultValue={profile.dailyStudyMinutes ?? 0}
              name="dailyStudyMinutes"
            >
              {STUDY_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Preferred test days</legend>
          <div className="flex flex-wrap gap-2">
            {VALID_DAYS.map((day) => (
              <label
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                key={day}
              >
                <input
                  className="rounded border-border text-primary focus:ring-primary"
                  defaultChecked={profile.preferredTestDays.includes(day)}
                  name="preferredTestDays"
                  type="checkbox"
                  value={day}
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSavingProfile}
            type="submit"
          >
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
          <ActionMessage state={profileState} />
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <form action={consentAction} className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">AI features</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Allow Test Series Portal to use AI, powered by Groq, to personalise your post-test
              analysis, improvement plan, and study chat. Your answers and study data may be sent
              to Groq for processing.
            </p>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
            <span>
              <span className="block text-sm font-medium">Enable AI personalisation</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                You can turn this off any time. Changes are recorded as an append-only consent log.
              </span>
            </span>
            <input
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              defaultChecked={aiConsent}
              disabled={isSavingConsent}
              name="granted"
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              type="checkbox"
              value="true"
            />
          </label>

          <ActionMessage state={consentState} />
        </form>
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: { ok: boolean; message: string } }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        state.ok
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {state.message}
    </p>
  );
}
