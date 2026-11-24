import { describe, expect, it } from "vitest";

import { toPrefixTsQuery } from "./search";

describe("toPrefixTsQuery", () => {
  it("builds an AND prefix query from words", () => {
    expect(toPrefixTsQuery("Team  meeting")).toBe("team:* & meeting:*");
  });

  it("supports Cyrillic and digits", () => {
    expect(toPrefixTsQuery("Зустріч v2 2026")).toBe("зустріч:* & v2:* & 2026:*");
  });

  it("strips tsquery operators so user input can't break the query", () => {
    expect(toPrefixTsQuery("a & b | !c :* (d)")).toBe("a:* & b:* & c:* & d:*");
  });

  it("returns null when nothing is searchable", () => {
    expect(toPrefixTsQuery("")).toBeNull();
    expect(toPrefixTsQuery("  !!! *** ")).toBeNull();
  });

  it("deduplicates and caps the number of terms", () => {
    expect(toPrefixTsQuery("a A a")).toBe("a:*");
    const many = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    expect(toPrefixTsQuery(many)?.split(" & ")).toHaveLength(8);
  });
});
