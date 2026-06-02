import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { resetPasswordAction } from "@/app/(auth)/actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      description="Enter your account email and we will send password reset instructions."
      footerHref="/login"
      footerLabel="Back to sign in"
      footerText="Remembered your password?"
      message={params.message}
      title="Reset password"
    >
      <form action={resetPasswordAction} className="grid gap-4">
        <AuthField autoComplete="email" label="Email" name="email" type="email" />
        <SubmitButton pendingLabel="Sending email...">Send reset email</SubmitButton>
      </form>
    </AuthCard>
  );
}

