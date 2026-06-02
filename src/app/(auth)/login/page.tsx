import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { signInAction } from "@/app/(auth)/actions";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      description="Sign in to continue your diagnostic and test improvement loop."
      footerHref="/register"
      footerLabel="Create account"
      footerText="New here?"
      message={params.message}
      title="Sign in"
    >
      <form action={signInAction} className="grid gap-4">
        <input name="redirectTo" type="hidden" value={params.redirectTo ?? "/dashboard"} />
        <AuthField autoComplete="email" label="Email" name="email" type="email" />
        <AuthField
          autoComplete="current-password"
          label="Password"
          name="password"
          type="password"
        />
        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}

