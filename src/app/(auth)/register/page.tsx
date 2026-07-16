import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleButton } from "@/components/auth/google-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { signUpAction } from "@/app/(auth)/actions";

type RegisterPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      description="Create an account to store your target exam, study plan, test history, and mastery data."
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already registered?"
      message={params.message}
      title="Create account"
    >
      <form action={signUpAction} className="grid gap-4">
        <AuthField autoComplete="name" label="Name" name="name" />
        <AuthField autoComplete="email" label="Email" name="email" type="email" />
        <AuthField autoComplete="new-password" label="Password" name="password" type="password" />
        <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
      </form>
      <GoogleButton />
    </AuthCard>
  );
}

