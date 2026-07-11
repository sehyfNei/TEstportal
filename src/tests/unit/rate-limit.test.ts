import { describe, expect, it, vi } from "vitest";
import {
  CHAT_RATE_LIMIT,
  EXPORT_RATE_LIMIT,
  checkRateLimit,
  rateLimitKey,
  type RateLimitClient
} from "@/lib/security/rate-limit";

function clientReturning(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as RateLimitClient, rpc };
}

describe("checkRateLimit", () => {
  it("allows when the RPC returns true and passes the composed key and config", async () => {
    const { client, rpc } = clientReturning({ data: true, error: null });

    await expect(checkRateLimit(client, CHAT_RATE_LIMIT, "user-1")).resolves.toEqual({
      allowed: true
    });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: "chat:user-1",
      p_limit: CHAT_RATE_LIMIT.limit,
      p_window_seconds: CHAT_RATE_LIMIT.windowSeconds
    });
  });

  it("denies when the RPC returns false", async () => {
    const { client } = clientReturning({ data: false, error: null });

    await expect(checkRateLimit(client, CHAT_RATE_LIMIT, "user-1")).resolves.toEqual({
      allowed: false
    });
  });

  it("fails open on RPC error", async () => {
    const { client } = clientReturning({ data: null, error: { message: "boom" } });

    await expect(checkRateLimit(client, EXPORT_RATE_LIMIT, "user-1")).resolves.toEqual({
      allowed: true
    });
  });

  it("fails open when the RPC returns a non-boolean payload", async () => {
    const { client } = clientReturning({ data: "yes", error: null });

    await expect(checkRateLimit(client, CHAT_RATE_LIMIT, "user-1")).resolves.toEqual({
      allowed: true
    });
  });

  it("fails open when the RPC throws", async () => {
    const client: RateLimitClient = {
      rpc: vi.fn().mockRejectedValue(new Error("network down"))
    };

    await expect(checkRateLimit(client, CHAT_RATE_LIMIT, "user-1")).resolves.toEqual({
      allowed: true
    });
  });
});

describe("rate limit configs", () => {
  it("keeps counters isolated per namespace and user", () => {
    expect(rateLimitKey("chat", "user-1")).toBe("chat:user-1");
    expect(rateLimitKey("chat", "user-2")).not.toBe(rateLimitKey("chat", "user-1"));
    expect(rateLimitKey("export", "user-1")).not.toBe(rateLimitKey("chat", "user-1"));
  });

  it("ships sane per-route limits", () => {
    for (const config of [CHAT_RATE_LIMIT, EXPORT_RATE_LIMIT]) {
      expect(config.limit).toBeGreaterThan(0);
      expect(config.windowSeconds).toBeGreaterThan(0);
      expect(config.name.length).toBeGreaterThan(0);
    }
    expect(CHAT_RATE_LIMIT.name).not.toBe(EXPORT_RATE_LIMIT.name);
  });
});
