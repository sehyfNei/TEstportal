/**
 * DB-backed fixed-window rate limiting (TSP-104).
 *
 * Thin wrapper around the consume_rate_limit RPC (202607130001_rate_limit.sql).
 * Fail-open by design: a rate limiter outage must never take the product down,
 * so any RPC error or missing data counts as "allowed".
 *
 * This throttles request volume only — it is NOT the per-user/day chat cost cap
 * (Standing Decision #4, checkDailyUsageCap), which stays founder-gated.
 */

export type RateLimitConfig = {
  /** Namespace for the counter key, e.g. "chat". */
  name: string;
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export type RateLimitClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export const CHAT_RATE_LIMIT: RateLimitConfig = {
  name: "chat",
  limit: 20,
  windowSeconds: 300
};

export const EXPORT_RATE_LIMIT: RateLimitConfig = {
  name: "export",
  limit: 3,
  windowSeconds: 3600
};

export function rateLimitKey(name: string, userId: string): string {
  return `${name}:${userId}`;
}

export async function checkRateLimit(
  client: RateLimitClient,
  config: RateLimitConfig,
  userId: string
): Promise<{ allowed: boolean }> {
  try {
    const { data, error } = await client.rpc("consume_rate_limit", {
      p_key: rateLimitKey(config.name, userId),
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds
    });

    if (error || typeof data !== "boolean") {
      if (error) {
        console.error(`[rate-limit] ${config.name} check failed`, error.message);
      }
      return { allowed: true };
    }

    return { allowed: data };
  } catch (error) {
    console.error(`[rate-limit] ${config.name} check threw`, error);
    return { allowed: true };
  }
}
