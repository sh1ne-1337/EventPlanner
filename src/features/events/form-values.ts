import { addDays, addHours, setHours, startOfHour } from "date-fns";

import {
  addDaysToKey,
  dateKeyToUtc,
  parseDateInputValue,
  toDateInputValue,
  toDateTimeLocalValue,
  utcDateKey,
} from "@/lib/datetime";

import type { EventFormValues } from "./schemas";
import type { EventDTO } from "./types";

export type EventFormDefaults = { start: Date; end?: Date; allDay?: boolean };

const DEFAULT_START_HOUR = 9;

export function defaultsToFormValues(
  defaults?: EventFormDefaults,
  now = new Date(),
): EventFormValues {
  const base = { title: "", description: "", importance: "NORMAL" as const };

  if (defaults?.allDay) {
    const lastDay = defaults.end ? addDays(defaults.end, -1) : defaults.start;
    const end = toDateInputValue(lastDay);
    const start = toDateInputValue(defaults.start);
    return { ...base, allDay: true, start, end: end === start ? "" : end };
  }

  let start = defaults?.start ?? addHours(startOfHour(now), 1);
  if (defaults && !defaults.end && start.getHours() === 0 && start.getMinutes() === 0) {
    start = setHours(start, DEFAULT_START_HOUR);
  }
  const end = defaults?.end ?? addHours(start, 1);
  return {
    ...base,
    allDay: false,
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  };
}

export function eventToFormValues(event: EventDTO): EventFormValues {
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;

  if (event.allDay) {
    const start = utcDateKey(startsAt);
    const end = endsAt ? addDaysToKey(utcDateKey(endsAt), -1) : "";
    return {
      title: event.title,
      description: event.description ?? "",
      importance: event.importance,
      allDay: true,
      start,
      end: end === start ? "" : end,
    };
  }

  return {
    title: event.title,
    description: event.description ?? "",
    importance: event.importance,
    allDay: false,
    start: toDateTimeLocalValue(startsAt),
    end: endsAt ? toDateTimeLocalValue(endsAt) : "",
  };
}

export function toggleAllDayValues(
  values: Pick<EventFormValues, "start" | "end">,
  allDay: boolean,
): Pick<EventFormValues, "start" | "end"> {
  if (allDay) {
    const start = values.start.slice(0, 10);
    const end = values.end.slice(0, 10);
    return { start, end: end && end !== start ? end : "" };
  }
  const startDay = values.start.slice(0, 10);
  const endDay = values.end.slice(0, 10) || startDay;
  const hour = String(DEFAULT_START_HOUR).padStart(2, "0");
  const nextHour = String(DEFAULT_START_HOUR + 1).padStart(2, "0");
  return {
    start: startDay ? `${startDay}T${hour}:00` : "",
    end: startDay ? `${endDay}T${nextHour}:00` : "",
  };
}

export function formValuesToInput(values: EventFormValues) {
  const common = {
    title: values.title,
    description: values.description.trim() || null,
    importance: values.importance,
    allDay: values.allDay,
  };

  if (values.allDay) {
    const lastDay = values.end || values.start;
    return {
      ...common,
      startsAt: dateKeyToUtc(values.start).toISOString(),
      endsAt: dateKeyToUtc(addDaysToKey(lastDay, 1)).toISOString(),
    };
  }

  return {
    ...common,
    startsAt: new Date(values.start).toISOString(),
    endsAt: values.end ? new Date(values.end).toISOString() : null,
  };
}

export function shiftEndWithStart(
  prev: Pick<EventFormValues, "start" | "end">,
  nextStart: string,
  allDay: boolean,
): string {
  if (!prev.end || !prev.start || !nextStart) return prev.end;

  const parse = allDay ? parseDateInputValue : (v: string) => new Date(v);
  const [oldStart, oldEnd, newStart] = [parse(prev.start), parse(prev.end), parse(nextStart)];
  if ([oldStart, oldEnd, newStart].some((d) => Number.isNaN(d.getTime()))) return prev.end;

  const shifted = new Date(newStart.getTime() + (oldEnd.getTime() - oldStart.getTime()));
  return allDay ? toDateInputValue(shifted) : toDateTimeLocalValue(shifted);
}
