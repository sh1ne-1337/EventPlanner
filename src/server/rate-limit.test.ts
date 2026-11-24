import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    const t = 1_000_000;
    expect(limiter.check("ip", t).success).toBe(true);
    expect(limiter.check("ip", t + 1).success).toBe(true);
    expect(limiter.check("ip", t + 2).success).toBe(true);

    const blocked = limiter.check("ip", t + 3);
    expect(blocked).toEqual({ success: false, retryAfterMs: 997 });
  });

  it("resets after the window and isolates keys", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).success).toBe(true);
    expect(limiter.check("a", 500).success).toBe(false);
    expect(limiter.check("b", 500).success).toBe(true);
    expect(limiter.check("a", 1000).success).toBe(true);
  });
});
