import { describe, expect, it } from "vitest";
import { CSP_REPORT_ONLY_VALUE, SECURITY_HEADERS } from "@/lib/security/headers";

describe("SECURITY_HEADERS", () => {
  it("includes every baseline header exactly once", () => {
    const keys = SECURITY_HEADERS.map((header) => header.key);

    expect(keys).toEqual([
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy-Report-Only"
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ships HSTS with a max-age of at least 180 days and subdomain coverage", () => {
    const hsts = SECURITY_HEADERS.find((header) => header.key === "Strict-Transport-Security");
    const maxAge = Number(/max-age=(\d+)/.exec(hsts?.value ?? "")?.[1]);

    expect(maxAge).toBeGreaterThanOrEqual(15552000);
    expect(hsts?.value).toContain("includeSubDomains");
  });

  it("keeps the CSP in Report-Only mode — never enforcing this session", () => {
    expect(SECURITY_HEADERS.some((header) => header.key === "Content-Security-Policy")).toBe(false);

    const cspHeader = SECURITY_HEADERS.find(
      (header) => header.key === "Content-Security-Policy-Report-Only"
    );
    expect(cspHeader?.value).toBe(CSP_REPORT_ONLY_VALUE);
  });

  it("allows Supabase browser connections and blocks framing in the CSP baseline", () => {
    expect(CSP_REPORT_ONLY_VALUE).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(CSP_REPORT_ONLY_VALUE).toContain("frame-ancestors 'none'");
    expect(CSP_REPORT_ONLY_VALUE).toContain("default-src 'self'");
  });
});
