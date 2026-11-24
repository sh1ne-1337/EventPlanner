"use client";

import { CalendarPlusIcon, PencilIcon, SearchXIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addDaysToKey,
  formatDayHeading,
  formatShortDate,
  formatTime,
  toDayKey,
  utcDateKey,
} from "@/lib/datetime";

import { LIST_MAX_LIMIT, LIST_PAGE_SIZE } from "../constants";
import type { ListScope } from "../search-params";
import type { EventDTO } from "../types";
import { useEventsActions } from "./events-board";
import { Highlight } from "./highlight";
import { ImportanceBadge } from "./importance-badge";
import { useEventsParams } from "./use-events-params";

function eventDayKey(event: EventDTO, timeZone: string) {
  return event.allDay ? utcDateKey(event.startsAt) : toDayKey(event.startsAt, timeZone);
}

function groupByDay(events: EventDTO[], timeZone: string, descending: boolean) {
  const groups = new Map<string, EventDTO[]>();
  for (const event of events) {
    const key = eventDayKey(event, timeZone);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  return [...groups]
    .sort(([a], [b]) => (descending ? b.localeCompare(a) : a.localeCompare(b)))
    .map(
      ([key, items]) => [key, items.sort((a, b) => Number(b.allDay) - Number(a.allDay))] as const,
    );
}

function relativeDayLabel(dayKey: string, timeZone: string) {
  const today = toDayKey(new Date(), timeZone);
  const tomorrow = toDayKey(new Date(Date.now() + 86_400_000), timeZone);
  if (dayKey === today) return "Today";
  if (dayKey === tomorrow) return "Tomorrow";
  return null;
}

function EventTime({ event, timeZone }: { event: EventDTO; timeZone: string }) {
  if (event.allDay) {
    const lastDay = event.endsAt ? addDaysToKey(utcDateKey(event.endsAt), -1) : null;
    const isMultiDay = lastDay !== null && lastDay !== utcDateKey(event.startsAt);
    return isMultiDay ? <>All day · until {formatShortDate(lastDay, "UTC")}</> : <>All day</>;
  }
  const start = formatTime(event.startsAt, timeZone);
  if (!event.endsAt) return <time dateTime={event.startsAt}>{start}</time>;

  const sameDay = toDayKey(event.startsAt, timeZone) === toDayKey(event.endsAt, timeZone);
  const end = sameDay
    ? formatTime(event.endsAt, timeZone)
    : `${formatShortDate(event.endsAt, timeZone)}, ${formatTime(event.endsAt, timeZone)}`;
  return (
    <>
      <time dateTime={event.startsAt}>{start}</time> – <time dateTime={event.endsAt}>{end}</time>
    </>
  );
}

export function EventList({
  events,
  timeZone,
  query,
  hasFilters,
  scope,
  limit,
  hasMore,
}: {
  events: EventDTO[];
  timeZone: string;
  query: string;
  hasFilters: boolean;
  scope: ListScope;
  limit: number;
  hasMore: boolean;
}) {
  const { openCreate, openEdit, requestDelete } = useEventsActions();
  const [, setParams] = useEventsParams();

  if (events.length === 0) {
    return (
      <Empty className="rounded-xl border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {hasFilters ? <SearchXIcon /> : <CalendarPlusIcon />}
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters ? "No matching events" : `No ${scope === "all" ? "" : scope} events`}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Try a different search term or importance filter."
              : "Plan something! Create your first event to see it here."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasFilters ? (
            <Button variant="outline" onClick={() => void setParams({ q: null, importance: null })}>
              Clear filters
            </Button>
          ) : (
            <Button onClick={() => openCreate()}>Create event</Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupByDay(events, timeZone, scope === "past").map(([dayKey, dayEvents]) => {
        const relative = relativeDayLabel(dayKey, timeZone);
        return (
          <section key={dayKey} aria-labelledby={`day-${dayKey}`} className="flex flex-col gap-2">
            <h2
              id={`day-${dayKey}`}
              className="flex items-baseline gap-2 text-sm font-medium text-muted-foreground"
            >
              {relative && <span className="text-foreground">{relative}</span>}
              {formatDayHeading(dayKey)}
            </h2>
            <ul className="flex flex-col gap-2">
              {dayEvents.map((event) => (
                <li key={event.id}>
                  <article className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40">
                    <div className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums sm:w-28 sm:text-sm">
                      <EventTime event={event} timeZone={timeZone} />
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left outline-none focus-visible:underline"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words">
                          <Highlight text={event.title} query={query} />
                        </h3>
                        <ImportanceBadge importance={event.importance} />
                      </div>
                      {event.description && (
                        <p className="line-clamp-2 text-sm break-words whitespace-pre-line text-muted-foreground">
                          <Highlight text={event.description} query={query} />
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit “${event.title}”`}
                            onClick={() => openEdit(event)}
                          >
                            <PencilIcon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete “${event.title}”`}
                            onClick={() => requestDelete(event)}
                            className="hover:text-destructive"
                          >
                            <Trash2Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {hasMore && limit < LIST_MAX_LIMIT && (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => void setParams({ limit: limit + LIST_PAGE_SIZE })}
        >
          Show more
        </Button>
      )}
    </div>
  );
}
