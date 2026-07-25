// Shared gate for every outbound-email feature (reminders, weekly digest).
// Mirrors isAiEnabled/GROQ_API_KEY: not configured is a clean no-op for
// callers, not a thrown error, until the founder sets both env vars.
export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_FROM_EMAIL);
}
