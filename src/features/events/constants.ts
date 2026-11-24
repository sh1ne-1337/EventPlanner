import { Importance } from "@/generated/prisma/enums";

export { Importance };

export const IMPORTANCE_VALUES = [
  Importance.NORMAL,
  Importance.IMPORTANT,
  Importance.CRITICAL,
] as const;

export const IMPORTANCE_META: Record<
  Importance,
  { label: string; badgeClassName: string; eventClassName: string; dotClassName: string }
> = {
  NORMAL: {
    label: "Normal",
    badgeClassName: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    eventClassName: "event-normal",
    dotClassName: "bg-sky-500",
  },
  IMPORTANT: {
    label: "Important",
    badgeClassName: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    eventClassName: "event-important",
    dotClassName: "bg-amber-500",
  },
  CRITICAL: {
    label: "Critical",
    badgeClassName: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    eventClassName: "event-critical",
    dotClassName: "bg-red-500",
  },
};

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const LIST_PAGE_SIZE = 30;
export const LIST_MAX_LIMIT = 500;
export const CALENDAR_MAX_EVENTS = 1000;
