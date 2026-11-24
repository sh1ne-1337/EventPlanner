import "server-only";

import type { Event, Importance, Prisma } from "@/generated/prisma/client";
import type { CreateEventInput, MoveEventInput, UpdateEventInput } from "@/features/events/schemas";
import { toPrefixTsQuery } from "@/features/events/search";
import { db } from "@/server/db";

export const eventSelect = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  importance: true,
} satisfies Prisma.EventSelect;

export type EventRecord = Pick<Event, keyof typeof eventSelect>;

export type ListEventsFilters = {
  q?: string;
  importance?: Importance[];
  from?: Date;
  to?: Date;
  fromDay?: Date;
  toDay?: Date;
  order?: "asc" | "desc";
  limit?: number;
};

async function findIdsMatchingSearch(userId: string, tsQuery: string) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM events
    WHERE "userId" = ${userId}
      AND search @@ to_tsquery('simple', ${tsQuery})
  `;
  return rows.map((r) => r.id);
}

function overlapsRange(from?: Date, to?: Date): Prisma.EventWhereInput[] {
  const and: Prisma.EventWhereInput[] = [];
  if (to) and.push({ startsAt: { lt: to } });
  if (from) and.push({ OR: [{ startsAt: { gte: from } }, { endsAt: { gt: from } }] });
  return and;
}

function rangeFilter({ from, to, fromDay, toDay }: ListEventsFilters): Prisma.EventWhereInput {
  if (!from && !to && !fromDay && !toDay) return {};
  return {
    OR: [
      { allDay: false, AND: overlapsRange(from, to) },
      { allDay: true, AND: overlapsRange(fromDay ?? from, toDay ?? to) },
    ],
  };
}

export async function listEvents(
  userId: string,
  filters: ListEventsFilters = {},
): Promise<EventRecord[]> {
  const { q, importance, order = "asc", limit } = filters;
  const where: Prisma.EventWhereInput = {
    userId,
    ...(importance?.length ? { importance: { in: importance } } : {}),
    ...rangeFilter(filters),
  };

  if (q?.trim()) {
    const tsQuery = toPrefixTsQuery(q);
    if (!tsQuery) return [];
    where.id = { in: await findIdsMatchingSearch(userId, tsQuery) };
  }

  return db.event.findMany({
    where,
    select: eventSelect,
    orderBy: [{ startsAt: order }, { id: order }],
    take: limit,
  });
}

export async function getEvent(userId: string, id: string) {
  return db.event.findFirst({ where: { id, userId }, select: eventSelect });
}

export async function createEvent(userId: string, data: CreateEventInput) {
  return db.event.create({
    data: { ...data, userId },
    select: eventSelect,
  });
}

export async function updateEvent(
  userId: string,
  { id, ...data }: UpdateEventInput | MoveEventInput,
): Promise<EventRecord | null> {
  const [updated] = await db.event.updateManyAndReturn({
    where: { id, userId },
    data,
    select: eventSelect,
  });
  return updated ?? null;
}

export async function deleteEvent(userId: string, id: string): Promise<boolean> {
  const { count } = await db.event.deleteMany({ where: { id, userId } });
  return count > 0;
}
