"use client";

import { useQueryStates } from "nuqs";

import { eventsSearchParams } from "../search-params";
import { useEventsTransition } from "./events-transition";

export function useEventsParams() {
  const { startTransition } = useEventsTransition();
  return useQueryStates(eventsSearchParams, {
    shallow: false,
    scroll: false,
    startTransition,
  });
}
