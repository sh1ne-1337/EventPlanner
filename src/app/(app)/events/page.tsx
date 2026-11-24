import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { EventsBoard } from "@/features/events/components/events-board";
import { EventsToolbar } from "@/features/events/components/events-toolbar";
import { EventsTransitionProvider } from "@/features/events/components/events-transition";
import { BoardSkeleton, ToolbarSkeleton } from "@/features/events/components/skeletons";
import { getCalendarEvents, getListEvents } from "@/features/events/queries";
import { LIST_MAX_LIMIT } from "@/features/events/constants";
import { loadEventsSearchParams } from "@/features/events/search-params";
import { dateKeyToUtc, getCalendarRange, startOfTodayIn, toDayKey } from "@/lib/datetime";
import { getUserTimeZone } from "@/server/timezone";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Plan, search and filter your events. Click a day in the calendar to add one.
        </p>
      </div>

      <EventsTransitionProvider>
        <div className="flex flex-col gap-4">
          <Suspense fallback={<ToolbarSkeleton />}>
            <EventsToolbar />
          </Suspense>
          <Suspense fallback={<BoardSkeleton />}>
            <EventsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </EventsTransitionProvider>
    </div>
  );
}

async function EventsContent({ searchParams }: Pick<PageProps<"/events">, "searchParams">) {
  const [params, timeZone] = await Promise.all([
    loadEventsSearchParams(searchParams),
    getUserTimeZone(),
  ]);
  await connection();
  const { view, q, importance } = params;
  const hasFilters = q.trim() !== "" || importance.length > 0;

  if (view === "calendar") {
    const anchor = params.date
      ? params.date.toISOString().slice(0, 10)
      : toDayKey(new Date(), timeZone);
    const events = await getCalendarEvents({
      q,
      importance,
      ...getCalendarRange(anchor, timeZone),
    });

    return (
      <EventsBoard
        view="calendar"
        events={events}
        timeZone={timeZone}
        query={q}
        hasFilters={hasFilters}
        anchor={anchor}
        calendarView={params.cv}
      />
    );
  }

  const limit = Math.min(Math.max(params.limit, 1), LIST_MAX_LIMIT);
  const { events, hasMore } = await getListEvents({
    q,
    importance,
    scope: params.scope,
    limit,
    today: startOfTodayIn(timeZone),
    todayDate: dateKeyToUtc(toDayKey(new Date(), timeZone)),
  });

  return (
    <EventsBoard
      view="list"
      events={events}
      timeZone={timeZone}
      query={q}
      hasFilters={hasFilters}
      scope={params.scope}
      limit={limit}
      hasMore={hasMore}
    />
  );
}
