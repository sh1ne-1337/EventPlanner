import "server-only";

import { headers } from "next/headers";

type Window = { count: number; resetAt: number };

export type RateLimitResult =
  { success: true; remaining: number } | { success: false; retryAfterMs: number };

export function createRateLimiter({
  limit,
  windowMs,
  disabled = false,
}: {
  limit: number;
  windowMs: number;
  disabled?: boolean;
}) {
  const windows = new Map<string, Window>();

  function prune(now: number) {
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
  }

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      if (disabled) return { success: true, remaining: limit };
      if (windows.size > 10_000) prune(now);

      const current = windows.get(key);
      if (!current || current.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: limit - 1 };
      }

      if (current.count >= limit) {
        return { success: false, retryAfterMs: current.resetAt - now };
      }

      current.count += 1;
      return { success: true, remaining: limit - current.count };
    },
    reset(key: string) {
      windows.delete(key);
    },
  };
}

export async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
