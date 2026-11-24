import { describe, expect, it } from "vitest";

import { createEventSchema, eventFormSchema, updateEventSchema } from "./schemas";

const valid = {
  title: "  Meeting  ",
  description: "",
  importance: "IMPORTANT",
  allDay: false,
  startsAt: "2026-11-24T10:00:00.000Z",
  endsAt: "2026-11-24T11:00:00.000Z",
};

describe("createEventSchema", () => {
  it("parses, trims and coerces", () => {
    const result = createEventSchema.parse(valid);
    expect(result.title).toBe("Meeting");
    expect(result.description).toBeNull();
    expect(result.startsAt).toBeInstanceOf(Date);
  });

  it("rejects an empty title", () => {
    const result = createEventSchema.safeParse({ ...valid, title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects end before start", () => {
    const result = createEventSchema.safeParse({ ...valid, endsAt: "2026-11-24T09:00:00.000Z" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["endsAt"]);
  });

  it("rejects unknown importance and invalid dates", () => {
    expect(createEventSchema.safeParse({ ...valid, importance: "URGENT" }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...valid, startsAt: "not a date" }).success).toBe(false);
  });

  it("allows a missing end", () => {
    expect(createEventSchema.parse({ ...valid, endsAt: null }).endsAt).toBeNull();
  });
});

describe("all-day events", () => {
  const allDay = { ...valid, allDay: true, startsAt: "2026-11-24T00:00:00.000Z", endsAt: null };

  it("defaults the end to the next day", () => {
    expect(createEventSchema.parse(allDay).endsAt?.toISOString()).toBe("2026-11-25T00:00:00.000Z");
  });

  it("rejects dates that are not UTC midnight", () => {
    expect(
      createEventSchema.safeParse({ ...allDay, startsAt: "2026-11-23T22:00:00.000Z" }).success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse({ ...allDay, endsAt: "2026-11-25T10:00:00.000Z" }).success,
    ).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("requires an id", () => {
    expect(updateEventSchema.safeParse(valid).success).toBe(false);
    expect(updateEventSchema.safeParse({ ...valid, id: "evt_1" }).success).toBe(true);
  });
});

describe("eventFormSchema", () => {
  const form = {
    title: "Meeting",
    description: "",
    importance: "NORMAL" as const,
    allDay: false,
    start: "2026-11-24T10:00",
    end: "2026-11-24T11:00",
  };

  it("accepts a valid timed event", () => {
    expect(eventFormSchema.safeParse(form).success).toBe(true);
  });

  it("rejects end equal to start for timed events", () => {
    expect(eventFormSchema.safeParse({ ...form, end: form.start }).success).toBe(false);
  });

  it("allows same start/end date for all-day events", () => {
    expect(
      eventFormSchema.safeParse({ ...form, allDay: true, start: "2026-11-24", end: "2026-11-24" })
        .success,
    ).toBe(true);
  });
});
