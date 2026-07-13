import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type AdminCheckResult = { ok: false; message: string } | { ok: true; userId: string };
type RoleCarrier = {
  app_metadata?: Record<string, unknown>;
};

// Server Component pages/layouts use redirects. In no-config scaffold mode, this
// stays a no-op so local admin shells remain inspectable without Supabase keys.
export async function requireAdmin(): Promise<void> {
  if (!hasSupabaseConfig()) {
    return;
  }

  const supabase = await createClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession()
  ]);
  const user = userData.user;

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  if (getUserRole(user, sessionData.session?.access_token) !== "admin") {
    redirect("/?error=unauthorized");
  }

  if (await needsMfaStepUp(supabase)) {
    redirect("/?error=mfa_required");
  }
}

// Server Actions return typed state instead of redirecting so form result flows
// can surface a normal action error message.
export async function requireAdminForAction(): Promise<AdminCheckResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const [{ data: userData, error }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession()
  ]);
  const user = userData.user;

  if (error || !user) {
    return { ok: false, message: error?.message ?? "Sign in to continue." };
  }

  if (getUserRole(user, sessionData.session?.access_token) !== "admin") {
    return { ok: false, message: "Admin access required." };
  }

  if (await needsMfaStepUp(supabase)) {
    return { ok: false, message: "Multi-factor verification required." };
  }

  return { ok: true, userId: user.id };
}

type MfaCapableClient = {
  auth: {
    mfa?: {
      getAuthenticatorAssuranceLevel: () => Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

// MFA step-up: admins who have enrolled a factor must verify it this session
// (aal2). Admins with no enrolled factor pass — enrollment is enforced by
// policy (docs/ops/ADMIN_MFA_POLICY.md), not code, until the founder enrolls;
// errors fail open because role authz above remains the primary gate.
async function needsMfaStepUp(supabase: MfaCapableClient): Promise<boolean> {
  try {
    const result = await supabase.auth.mfa?.getAuthenticatorAssuranceLevel();
    if (!result || result.error || !result.data) {
      return false;
    }

    return result.data.nextLevel === "aal2" && result.data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

function getUserRole(user: RoleCarrier, accessToken?: string) {
  const appRole = user.app_metadata?.user_role;
  if (typeof appRole === "string") {
    return appRole;
  }

  const jwtRole = getJwtUserRole(accessToken);
  if (jwtRole) {
    return jwtRole;
  }

  return undefined;
}

function getJwtUserRole(accessToken?: string) {
  const payload = accessToken?.split(".")[1];
  if (!payload) {
    return undefined;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      app_metadata?: { user_role?: unknown };
      user_role?: unknown;
    };
    const appRole = claims.app_metadata?.user_role;
    if (typeof appRole === "string") {
      return appRole;
    }

    return typeof claims.user_role === "string" ? claims.user_role : undefined;
  } catch {
    return undefined;
  }
}
