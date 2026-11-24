import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export const LOCALE = "en-GB";
export const WEEK_STARTS_ON = 1;

export function toDayKey(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function startOfTodayIn(timeZone: string, now = new Date()): Date {
  return new Date(startOfDay(new TZDate(now, timeZone)).getTime());
}

export function getCalendarRange(anchorDayKey: string, timeZone: string) {
  const [y, m, d] = anchorDayKey.split("-").map(Number) as [number, number, number];
  const anchor = new TZDate(y, m - 1, d, timeZone);
  const from = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  const to = addDays(from, 42);
  return {
    from: new Date(from.getTime()),
    to: new Date(to.getTime()),
    fromDay: dateKeyToUtc(format(from, "yyyy-MM-dd")),
    toDay: dateKeyToUtc(format(to, "yyyy-MM-dd")),
  };
}

export function toDateTimeLocalValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function formatShortDate(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, day: "numeric", month: "short" }).format(
    new Date(date),
  );
}

export function dateKeyToUtc(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function utcDateKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDaysToKey(key: string, days: number): string {
  const date = dateKeyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}
