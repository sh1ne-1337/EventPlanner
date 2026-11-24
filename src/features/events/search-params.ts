import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { IMPORTANCE_VALUES, LIST_PAGE_SIZE } from "./constants";

export const VIEWS = ["calendar", "list"] as const;
export const CALENDAR_VIEWS = ["dayGridMonth", "timeGridWeek", "timeGridDay"] as const;
export const LIST_SCOPES = ["upcoming", "past", "all"] as const;

export type View = (typeof VIEWS)[number];
export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export type ListScope = (typeof LIST_SCOPES)[number];

export const eventsSearchParams = {
  view: parseAsStringLiteral(VIEWS).withDefault("calendar"),
  q: parseAsString.withDefault(""),
  importance: parseAsArrayOf(parseAsStringLiteral(IMPORTANCE_VALUES)).withDefault([]),
  date: parseAsIsoDate,
  cv: parseAsStringLiteral(CALENDAR_VIEWS).withDefault("dayGridMonth"),
  scope: parseAsStringLiteral(LIST_SCOPES).withDefault("upcoming"),
  limit: parseAsInteger.withDefault(LIST_PAGE_SIZE),
};

export const loadEventsSearchParams = createLoader(eventsSearchParams);
export const serializeEventsSearchParams = createSerializer(eventsSearchParams);
