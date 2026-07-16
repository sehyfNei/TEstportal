import { signInWithGoogleAction } from "@/app/(auth)/actions";

/**
 * "Continue with Google" (TSP-010). Posts to a server action that starts the
 * Supabase OAuth flow; the existing /auth/callback route completes it. Shows
 * a friendly error via the login message param if the provider is not
 * configured yet, so shipping the button ahead of the founder's Google Cloud
 * setup is safe.
 */
export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        or
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <form action={signInWithGoogleAction}>
        <input name="redirectTo" type="hidden" value={redirectTo ?? "/dashboard"} />
        <button
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium transition hover:border-primary"
          type="submit"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
