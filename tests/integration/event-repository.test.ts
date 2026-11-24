import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  updateEvent,
} from "@/server/repositories/event-repository";

async function createUser(email: string) {
  return db.user.create({ data: { email } });
}

const at = (iso: string) => new Date(iso);

function eventInput(overrides: Partial<Parameters<typeof createEvent>[1]> = {}) {
  return {
    title: "Team meeting",
    description: null,
    importance: "NORMAL" as const,
    allDay: false,
    startsAt: at("2026-11-24T10:00:00Z"),
    endsAt: at("2026-11-24T11:00:00Z"),
    ...overrides,
  };
}

describe("event repository: authorization (tenant isolation)", () => {
  it("never returns, updates or deletes another user's event", async () => {
    const alice = await createUser("alice@example.com");
    const mallory = await createUser("mallory@example.com");
    const event = await createEvent(alice.id, eventInput({ title: "Alice's secret" }));

    expect(await getEvent(mallory.id, event.id)).toBeNull();
    expect(await listEvents(mallory.id)).toEqual([]);
    expect(await listEvents(mallory.id, { q: "secret" })).toEqual([]);

    const updated = await updateEvent(mallory.id, {
      ...eventInput({ title: "pwned" }),
      id: event.id,
    });
    expect(updated).toBeNull();

    expect(await deleteEvent(mallory.id, event.id)).toBe(false);

    expect(await getEvent(alice.id, event.id)).toMatchObject({ title: "Alice's secret" });
  });

  it("lets the owner update and delete", async () => {
    const alice = await createUser("alice@example.com");
    const event = await createEvent(alice.id, eventInput());

    const updated = await updateEvent(alice.id, {
      ...eventInput({ title: "Renamed", importance: "CRITICAL" }),
      id: event.id,
    });
    expect(updated).toMatchObject({ id: event.id, title: "Renamed", importance: "CRITICAL" });

    expect(await deleteEvent(alice.id, event.id)).toBe(true);
    expect(await getEvent(alice.id, event.id)).toBeNull();
  });
});

describe("event repository: filtering", () => {
  it("filters by importance and orders by start", async () => {
    const user = await createUser("u@example.com");
    await createEvent(
      user.id,
      eventInput({
        title: "B",
        importance: "CRITICAL",
        startsAt: at("2026-11-25T10:00:00Z"),
        endsAt: null,
      }),
    );
    await createEvent(
      user.id,
      eventInput({
        title: "A",
        importance: "IMPORTANT",
        startsAt: at("2026-11-24T10:00:00Z"),
        endsAt: null,
      }),
    );
    await createEvent(user.id, eventInput({ title: "C", importance: "NORMAL" }));

    const result = await listEvents(user.id, { importance: ["CRITICAL", "IMPORTANT"] });
    expect(result.map((e) => e.title)).toEqual(["A", "B"]);

    const desc = await listEvents(user.id, {
      importance: ["CRITICAL", "IMPORTANT"],
      order: "desc",
    });
    expect(desc.map((e) => e.title)).toEqual(["B", "A"]);
  });

  it("returns events overlapping a range, including multi-day events that started earlier", async () => {
    const user = await createUser("u@example.com");
    await createEvent(
      user.id,
      eventInput({
        title: "Before",
        startsAt: at("2026-10-01T10:00:00Z"),
        endsAt: at("2026-10-01T11:00:00Z"),
      }),
    );
    await createEvent(
      user.id,
      eventInput({
        title: "Spanning",
        allDay: true,
        startsAt: at("2026-10-30T00:00:00Z"),
        endsAt: at("2026-11-03T00:00:00Z"),
      }),
    );
    await createEvent(
      user.id,
      eventInput({ title: "Inside", startsAt: at("2026-11-10T10:00:00Z"), endsAt: null }),
    );
    await createEvent(
      user.id,
      eventInput({ title: "After", startsAt: at("2026-12-10T10:00:00Z"), endsAt: null }),
    );

    const result = await listEvents(user.id, {
      from: at("2026-11-01T00:00:00Z"),
      to: at("2026-12-01T00:00:00Z"),
    });
    expect(result.map((e) => e.title)).toEqual(["Spanning", "Inside"]);
  });

  it("selects all-day events by calendar date, not by the viewer's time zone", async () => {
    const user = await createUser("u@example.com");
    await createEvent(
      user.id,
      eventInput({
        title: "Yesterday",
        allDay: true,
        startsAt: at("2026-11-23T00:00:00Z"),
        endsAt: at("2026-11-24T00:00:00Z"),
      }),
    );
    await createEvent(
      user.id,
      eventInput({
        title: "Today",
        allDay: true,
        startsAt: at("2026-11-24T00:00:00Z"),
        endsAt: at("2026-11-25T00:00:00Z"),
      }),
    );
    await createEvent(
      user.id,
      eventInput({
        title: "Late yesterday",
        startsAt: at("2026-11-23T21:30:00Z"),
        endsAt: at("2026-11-23T21:45:00Z"),
      }),
    );

    const upcomingInKyiv = await listEvents(user.id, {
      from: at("2026-11-23T22:00:00Z"),
      fromDay: at("2026-11-24T00:00:00Z"),
    });
    expect(upcomingInKyiv.map((e) => e.title)).toEqual(["Today"]);

    const pastInKyiv = await listEvents(user.id, {
      to: at("2026-11-23T22:00:00Z"),
      toDay: at("2026-11-24T00:00:00Z"),
    });
    expect(pastInKyiv.map((e) => e.title).sort()).toEqual(["Late yesterday", "Yesterday"]);
  });

  it("respects the limit", async () => {
    const user = await createUser("u@example.com");
    for (let i = 0; i < 5; i++) {
      await createEvent(
        user.id,
        eventInput({ title: `E${i}`, startsAt: at(`2026-11-2${i}T10:00:00Z`), endsAt: null }),
      );
    }
    expect(await listEvents(user.id, { limit: 3 })).toHaveLength(3);
  });
});

describe("event repository: full-text search", () => {
  it("matches word prefixes in title and description, case-insensitively, incl. Cyrillic", async () => {
    const user = await createUser("u@example.com");
    await createEvent(user.id, eventInput({ title: "Weekly planning meeting" }));
    await createEvent(
      user.id,
      eventInput({ title: "Зустріч з командою", description: "Обговорення спринту" }),
    );
    await createEvent(
      user.id,
      eventInput({ title: "Dentist", description: "Bring the INSURANCE card" }),
    );

    const titles = async (q: string) => (await listEvents(user.id, { q })).map((e) => e.title);

    expect(await titles("meet")).toEqual(["Weekly planning meeting"]);
    expect(await titles("ЗУСТ")).toEqual(["Зустріч з командою"]);
    expect(await titles("спринт")).toEqual(["Зустріч з командою"]);
    expect(await titles("insurance")).toEqual(["Dentist"]);
    expect(await titles("weekly dentist")).toEqual([]);
  });

  it("keeps the search vector in sync on update (trigger)", async () => {
    const user = await createUser("u@example.com");
    const event = await createEvent(user.id, eventInput({ title: "Old title" }));
    await updateEvent(user.id, { ...eventInput({ title: "Brand new name" }), id: event.id });

    expect(await listEvents(user.id, { q: "old" })).toEqual([]);
    expect(await listEvents(user.id, { q: "brand" })).toHaveLength(1);
  });

  it("treats tsquery operators in user input as plain text (no errors)", async () => {
    const user = await createUser("u@example.com");
    await createEvent(user.id, eventInput({ title: "C++ & Rust talk" }));

    expect(await listEvents(user.id, { q: "rust & !(talk" })).toHaveLength(1);
    expect(await listEvents(user.id, { q: "!!! ::: ***" })).toEqual([]);
  });

  it("combines search with importance filter", async () => {
    const user = await createUser("u@example.com");
    await createEvent(user.id, eventInput({ title: "Release backend", importance: "CRITICAL" }));
    await createEvent(user.id, eventInput({ title: "Release notes", importance: "NORMAL" }));

    const result = await listEvents(user.id, { q: "release", importance: ["CRITICAL"] });
    expect(result.map((e) => e.title)).toEqual(["Release backend"]);
  });
});
