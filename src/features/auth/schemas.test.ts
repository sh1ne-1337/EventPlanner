import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, safeCallbackUrl, signUpSchema } from "./schemas";

describe("safeCallbackUrl", () => {
  it.each([
    [undefined, DEFAULT_REDIRECT],
    ["/events?view=list", "/events?view=list"],
    ["http://localhost:3000/events?view=list", "/events?view=list"],
    ["https://evil.example/steal", "/steal"],
    ["//evil.example", DEFAULT_REDIRECT],
    ["/\\evil.example", DEFAULT_REDIRECT],
    ["/login", DEFAULT_REDIRECT],
    ["javascript:alert(1)", DEFAULT_REDIRECT],
  ])("%s -> %s", (input, expected) => {
    const result = safeCallbackUrl(input);
    expect(result).toBe(expected);
    expect(result.startsWith("/")).toBe(true);
    expect(result.startsWith("//")).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    name: "Jane",
    email: "  Jane@Example.COM ",
    password: "secret123",
    confirmPassword: "secret123",
  };

  it("normalizes the email", () => {
    expect(signUpSchema.parse(valid).email).toBe("jane@example.com");
  });

  it("enforces password rules and confirmation", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "short1", confirmPassword: "short1" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...valid, password: "onlyletters", confirmPassword: "onlyletters" })
        .success,
    ).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, confirmPassword: "different1" }).success).toBe(false);
  });
});
