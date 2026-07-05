import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  hasSupabaseConfig: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: mocks.hasSupabaseConfig
}));

import { requireAdminForAction } from "@/lib/auth/require-admin";

describe("requireAdminForAction", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.hasSupabaseConfig.mockReset();
    mocks.hasSupabaseConfig.mockReturnValue(true);
  });

  it("fails without creating a client when Supabase is not configured", async () => {
    mocks.hasSupabaseConfig.mockReturnValue(false);

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: false,
      message: "Supabase is not configured."
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns the auth error message when getUser fails", async () => {
    mockSupabase({ user: null, userError: { message: "JWT expired" } });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: false,
      message: "JWT expired"
    });
  });

  it("asks the user to sign in when no authenticated user is present", async () => {
    mockSupabase({ user: null });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: false,
      message: "Sign in to continue."
    });
  });

  it("does not trust user_metadata for admin authorization", async () => {
    mockSupabase({
      user: {
        id: "user-1",
        app_metadata: {},
        user_metadata: { user_role: "admin" }
      }
    });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: false,
      message: "Admin access required."
    });
  });

  it("accepts admin role from user app_metadata", async () => {
    mockSupabase({
      user: {
        id: "admin-1",
        app_metadata: { user_role: "admin" }
      }
    });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: true,
      userId: "admin-1"
    });
  });

  it("rejects non-admin roles from user app_metadata", async () => {
    mockSupabase({
      user: {
        id: "user-1",
        app_metadata: { user_role: "student" }
      },
      accessToken: tokenWithPayload({ app_metadata: { user_role: "admin" } })
    });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: false,
      message: "Admin access required."
    });
  });

  it("accepts admin role from JWT app_metadata when user app_metadata is absent", async () => {
    mockSupabase({
      user: { id: "admin-2" },
      accessToken: tokenWithPayload({ app_metadata: { user_role: "admin" } })
    });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: true,
      userId: "admin-2"
    });
  });

  it("accepts admin role from a top-level JWT user_role claim", async () => {
    mockSupabase({
      user: { id: "admin-3" },
      accessToken: tokenWithPayload({ user_role: "admin" })
    });

    await expect(requireAdminForAction()).resolves.toEqual({
      ok: true,
      userId: "admin-3"
    });
  });
});

type MockUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null;

function mockSupabase(input: {
  user: MockUser;
  userError?: { message: string } | null;
  accessToken?: string | null;
}) {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: input.user },
        error: input.userError ?? null
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: input.accessToken ? { access_token: input.accessToken } : null
        }
      })
    }
  };

  mocks.createClient.mockResolvedValue(client);
  return client;
}

function tokenWithPayload(payload: Record<string, unknown>) {
  return `header.${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}.signature`;
}
