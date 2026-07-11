export type SecurityHeader = {
  key: string;
  value: string;
};

/**
 * Baseline CSP shipped as Report-Only (TSP-105). Next.js inline runtime and Tailwind
 * require the unsafe-* directives; enforcement with nonces is deferred to the TSP-102
 * staging/prod setup. Do NOT switch this to an enforcing Content-Security-Policy header
 * without a full browser smoke of test-taking, chat streaming, and auth flows.
 */
export const CSP_REPORT_ONLY_VALUE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

export const SECURITY_HEADERS: SecurityHeader[] = [
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY_VALUE }
];
