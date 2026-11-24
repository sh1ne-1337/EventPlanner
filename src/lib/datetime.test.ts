import { describe, expect, it } from "vitest";

import { formatTime, getCalendarRange, startOfTodayIn, toDayKey } from "./datetime";

describe("toDayKey", () => {
  it("returns the calendar day in the given time zone", () => {
    const instant = "2026-11-24T23:30:00Z";
    expect(toDayKey(instant, "UTC")).toBe("2026-11-24");
    expect(toDayKey(instant, "Europe/Kyiv")).toBe("2026-11-25");
    expect(toDayKey(instant, "America/New_York")).toBe("2026-11-24");
  });
});

describe("formatTime", () => {
  it("formats 24h time in the given zone", () => {
    expect(formatTime("2026-11-24T08:05:00Z", "Europe/Kyiv")).toBe("10:05");
  });
});

describe("startOfTodayIn", () => {
  it("returns local midnight as an absolute instant", () => {
    const now = new Date("2026-11-24T23:30:00Z");
    expect(startOfTodayIn("Europe/Kyiv", now).toISOString()).toBe("2026-11-24T22:00:00.000Z");
    expect(startOfTodayIn("UTC", now).toISOString()).toBe("2026-11-24T00:00:00.000Z");
  });
});

describe("getCalendarRange", () => {
  it("covers the 6-week month grid starting on Monday, in the user's zone", () => {
    const { from, to } = getCalendarRange("2026-11-24", "Europe/Kyiv");
    expect(from.toISOString()).toBe("2026-10-25T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-06T22:00:00.000Z");
  });

  it("also returns the grid as UTC dates for all-day events", () => {
    const { fromDay, toDay } = getCalendarRange("2026-11-24", "Europe/Kyiv");
    expect(fromDay.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(toDay.toISOString()).toBe("2026-12-07T00:00:00.000Z");
  });
});
