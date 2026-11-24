import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { requireUser } from "@/server/auth/session";
import * as eventRepository from "@/server/repositories/event-repository";

import { eventsTag } from "./cache";
import { CALENDAR_MAX_EVENTS } from "./constants";
import { toEventDTO } from "./dto";
import type { EventDTO } from "./types";
import type { Importance } from "./constants";

type SerializableFilters = {
  q: string;
  importance: Importance[];
  from?: string;
  to?: string;
  fromDay?: string;
  toDay?: string;
  order: "asc" | "desc";
  limit?: number;
};

async function listEventsCached(userId: string, filters: SerializableFilters): Promise<EventDTO[]> {
  "use cache";
  cacheTag(eventsTag(userId));
  cacheLife("minutes");

  const events = await eventRepository.listEvents(userId, {
    q: filters.q,
    importance: filters.importance,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
    fromDay: filters.fromDay ? new Date(filters.fromDay) : undefined,
    toDay: filters.toDay ? new Date(filters.toDay) : undefined,
    order: filters.order,
    limit: filters.limit,
  });
  return events.map(toEventDTO);
}

type BaseFilters = { q: string; importance: Importance[] };

export async function getCalendarEvents(
  filters: BaseFilters & { from: Date; to: Date; fromDay: Date; toDay: Date },
) {
  const user = await requireUser();
  return listEventsCached(user.id, {
    q: filters.q,
    importance: [...filters.importance].sort(),
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    fromDay: filters.fromDay.toISOString(),
    toDay: filters.toDay.toISOString(),
    order: "asc",
    limit: CALENDAR_MAX_EVENTS,
  });
}

export async function getListEvents(
  filters: BaseFilters & {
    scope: "upcoming" | "past" | "all";
    limit: number;
    today: Date;
    todayDate: Date;
  },
): Promise<{ events: EventDTO[]; hasMore: boolean }> {
  const user = await requireUser();
  const { scope, today, todayDate, limit } = filters;

  const events = await listEventsCached(user.id, {
    q: filters.q,
    importance: [...filters.importance].sort(),
    from: scope === "upcoming" ? today.toISOString() : undefined,
    to: scope === "past" ? today.toISOString() : undefined,
    fromDay: scope === "upcoming" ? todayDate.toISOString() : undefined,
    toDay: scope === "past" ? todayDate.toISOString() : undefined,
    order: scope === "past" ? "desc" : "asc",
    limit: limit + 1,
  });

  return { events: events.slice(0, limit), hasMore: events.length > limit };
}
