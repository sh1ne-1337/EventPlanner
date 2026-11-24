import { describe, expect, it } from "vitest";

import {
  defaultsToFormValues,
  eventToFormValues,
  formValuesToInput,
  shiftEndWithStart,
  toggleAllDayValues,
} from "./form-values";
import type { EventDTO } from "./types";

describe("formValuesToInput", () => {
  it("converts local datetime to UTC instants", () => {
    const input = formValuesToInput({
      title: "Meeting",
      description: "  ",
      importance: "NORMAL",
      allDay: false,
      start: "2026-11-24T10:00",
      end: "2026-11-24T11:30",
    });
    expect(input.startsAt).toBe("2026-11-24T08:00:00.000Z");
    expect(input.endsAt).toBe("2026-11-24T09:30:00.000Z");
    expect(input.description).toBeNull();
  });

  it("stores all-day ranges as UTC dates with an exclusive end, independent of time zone", () => {
    const input = formValuesToInput({
      title: "Trip",
      description: "",
      importance: "NORMAL",
      allDay: true,
      start: "2026-11-24",
      end: "2026-11-26",
    });
    expect(input.startsAt).toBe("2026-11-24T00:00:00.000Z");
    expect(input.endsAt).toBe("2026-11-27T00:00:00.000Z");
  });

  it("gives single-day all-day events a one-day exclusive end", () => {
    const input = formValuesToInput({
      title: "Birthday",
      description: "",
      importance: "CRITICAL",
      allDay: true,
      start: "2026-11-24",
      end: "2026-11-24",
    });
    expect(input.startsAt).toBe("2026-11-24T00:00:00.000Z");
    expect(input.endsAt).toBe("2026-11-25T00:00:00.000Z");
  });
});

describe("eventToFormValues", () => {
  const base: EventDTO = {
    id: "1",
    title: "Trip",
    description: null,
    importance: "NORMAL",
    allDay: true,
    startsAt: "2026-11-24T00:00:00.000Z",
    endsAt: "2026-11-27T00:00:00.000Z",
  };

  it("round-trips all-day events (inclusive end in the form)", () => {
    const values = eventToFormValues(base);
    expect(values).toMatchObject({ allDay: true, start: "2026-11-24", end: "2026-11-26" });
    expect(formValuesToInput(values)).toMatchObject({
      startsAt: base.startsAt,
      endsAt: base.endsAt,
    });
  });

  it("round-trips timed events", () => {
    const timed: EventDTO = {
      ...base,
      allDay: false,
      startsAt: "2026-11-24T08:00:00.000Z",
      endsAt: null,
    };
    const values = eventToFormValues(timed);
    expect(values).toMatchObject({ start: "2026-11-24T10:00", end: "" });
    expect(formValuesToInput(values)).toMatchObject({ startsAt: timed.startsAt, endsAt: null });
  });
});

describe("defaultsToFormValues", () => {
  it("suggests 09:00-10:00 when a day is picked in the month grid", () => {
    const values = defaultsToFormValues({ start: new Date(2026, 10, 24) });
    expect(values).toMatchObject({
      allDay: false,
      start: "2026-11-24T09:00",
      end: "2026-11-24T10:00",
    });
  });

  it("uses the exact slot from the time grid", () => {
    const values = defaultsToFormValues({
      start: new Date(2026, 10, 24, 14, 30),
      end: new Date(2026, 10, 24, 15, 0),
    });
    expect(values).toMatchObject({ start: "2026-11-24T14:30", end: "2026-11-24T15:00" });
  });

  it("converts a multi-day selection to an inclusive all-day range", () => {
    const values = defaultsToFormValues({
      start: new Date(2026, 10, 24),
      end: new Date(2026, 10, 27),
      allDay: true,
    });
    expect(values).toMatchObject({ allDay: true, start: "2026-11-24", end: "2026-11-26" });
  });
});

describe("toggleAllDayValues", () => {
  it("switches between datetime and date formats", () => {
    expect(
      toggleAllDayValues({ start: "2026-11-24T10:00", end: "2026-11-25T11:00" }, true),
    ).toEqual({
      start: "2026-11-24",
      end: "2026-11-25",
    });
    expect(toggleAllDayValues({ start: "2026-11-24", end: "" }, false)).toEqual({
      start: "2026-11-24T09:00",
      end: "2026-11-24T10:00",
    });
  });
});

describe("shiftEndWithStart", () => {
  it("keeps the duration when the start moves", () => {
    const prev = { start: "2026-11-24T10:00", end: "2026-11-24T11:30" };
    expect(shiftEndWithStart(prev, "2026-11-26T09:00", false)).toBe("2026-11-26T10:30");
  });

  it("works for all-day ranges", () => {
    const prev = { start: "2026-11-24", end: "2026-11-26" };
    expect(shiftEndWithStart(prev, "2026-11-30", true)).toBe("2026-12-02");
  });

  it("leaves an empty or unparsable end alone", () => {
    expect(
      shiftEndWithStart({ start: "2026-11-24T10:00", end: "" }, "2026-11-25T10:00", false),
    ).toBe("");
    expect(
      shiftEndWithStart({ start: "", end: "2026-11-24T11:00" }, "2026-11-25T10:00", false),
    ).toBe("2026-11-24T11:00");
  });
});
