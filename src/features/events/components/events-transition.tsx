"use client";

import { createContext, use, useTransition, type TransitionStartFunction } from "react";

type EventsTransition = { isPending: boolean; startTransition: TransitionStartFunction };

const EventsTransitionContext = createContext<EventsTransition | null>(null);

export function EventsTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <EventsTransitionContext value={{ isPending, startTransition }}>
      {children}
    </EventsTransitionContext>
  );
}

export function useEventsTransition() {
  const ctx = use(EventsTransitionContext);
  if (!ctx) throw new Error("useEventsTransition must be used within EventsTransitionProvider");
  return ctx;
}
