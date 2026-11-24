"use client";

import { PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { createContext, use, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DEFAULT_ERROR_MESSAGE } from "@/lib/messages";
import { cn } from "@/lib/utils";

import { deleteEventAction, moveEventAction } from "../actions";
import type { CalendarView, ListScope } from "../search-params";
import type { EventDTO } from "../types";
import { CalendarSkeleton } from "./skeletons";
import { DeleteEventDialog } from "./delete-event-dialog";
import { EventFormDialog, type EventFormDefaults } from "./event-form-dialog";
import { EventList } from "./event-list";
import { useEventsTransition } from "./events-transition";

const EventCalendar = dynamic(() => import("./event-calendar").then((m) => m.EventCalendar), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
});

type OptimisticAction = { type: "delete"; id: string } | { type: "update"; event: EventDTO };

function eventsReducer(events: EventDTO[], action: OptimisticAction): EventDTO[] {
  switch (action.type) {
    case "delete":
      return events.filter((e) => e.id !== action.id);
    case "update":
      return events.map((e) => (e.id === action.event.id ? action.event : e));
  }
}

type DialogState =
  { mode: "create"; defaults?: EventFormDefaults } | { mode: "edit"; event: EventDTO } | null;

type EventsActions = {
  openCreate: (defaults?: EventFormDefaults) => void;
  openEdit: (event: EventDTO) => void;
  requestDelete: (event: EventDTO) => void;
  moveEvent: (event: EventDTO) => Promise<boolean>;
};

const EventsActionsContext = createContext<EventsActions | null>(null);

export function useEventsActions() {
  const ctx = use(EventsActionsContext);
  if (!ctx) throw new Error("useEventsActions must be used within EventsBoard");
  return ctx;
}

type EventsBoardProps = {
  events: EventDTO[];
  timeZone: string;
  query: string;
  hasFilters: boolean;
} & (
  | { view: "calendar"; anchor: string; calendarView: CalendarView }
  | { view: "list"; scope: ListScope; limit: number; hasMore: boolean }
);

export function EventsBoard(props: EventsBoardProps) {
  const { events, timeZone } = props;
  const { isPending: isNavigating } = useEventsTransition();
  const [, startMutation] = useTransition();

  const [optimisticEvents, applyOptimistic] = useOptimistic(events, eventsReducer);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [pendingDelete, setPendingDelete] = useState<EventDTO | null>(null);

  const actions: EventsActions = {
    openCreate: (defaults) => setDialog({ mode: "create", defaults }),
    openEdit: (event) => setDialog({ mode: "edit", event }),
    requestDelete: (event) => setPendingDelete(event),
    moveEvent: (event) =>
      new Promise<boolean>((resolve) => {
        startMutation(async () => {
          applyOptimistic({ type: "update", event });
          const result = await moveEventAction({
            id: event.id,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            allDay: event.allDay,
          });
          const ok = Boolean(result?.data);
          if (ok) toast.success("Event rescheduled");
          else toast.error(result?.serverError ?? "Could not reschedule the event");
          resolve(ok);
        });
      }),
  };

  function confirmDelete(event: EventDTO) {
    setPendingDelete(null);
    setDialog(null);
    startMutation(async () => {
      applyOptimistic({ type: "delete", id: event.id });
      const result = await deleteEventAction({ id: event.id });
      if (result?.data) toast.success(`“${event.title}” deleted`);
      else toast.error(result?.serverError ?? DEFAULT_ERROR_MESSAGE);
    });
  }

  return (
    <EventsActionsContext value={actions}>
      <section
        aria-busy={isNavigating}
        className={cn("flex flex-col gap-3 transition-opacity", isNavigating && "opacity-60")}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {optimisticEvents.length === 0
              ? "No events"
              : `${optimisticEvents.length}${props.view === "list" && props.hasMore ? "+" : ""} event${optimisticEvents.length === 1 ? "" : "s"}`}
            {props.view === "calendar" && optimisticEvents.length > 0 && " in this period"}
          </p>
          <Button onClick={() => actions.openCreate()}>
            <PlusIcon />
            New event
          </Button>
        </div>

        {props.view === "calendar" ? (
          <EventCalendar
            events={optimisticEvents}
            anchor={props.anchor}
            calendarView={props.calendarView}
          />
        ) : (
          <EventList
            events={optimisticEvents}
            timeZone={timeZone}
            query={props.query}
            hasFilters={props.hasFilters}
            scope={props.scope}
            limit={props.limit}
            hasMore={props.hasMore}
          />
        )}
      </section>

      <EventFormDialog
        state={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        onRequestDelete={(event) => setPendingDelete(event)}
      />
      <DeleteEventDialog
        event={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </EventsActionsContext>
  );
}
