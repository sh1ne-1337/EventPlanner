"use client";

import type {
  DatesSetArg,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { differenceInCalendarDays } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import {
  addDaysToKey,
  dateKeyToUtc,
  toDateInputValue,
  utcDateKey,
  WEEK_STARTS_ON,
} from "@/lib/datetime";

import { IMPORTANCE_META } from "../constants";
import type { CalendarView } from "../search-params";
import type { EventDTO } from "../types";
import { useEventsActions } from "./events-board";
import { useEventsParams } from "./use-events-params";

function toCalendarEvent(event: EventDTO): EventInput {
  const toCalendarDate = (value: string) => (event.allDay ? utcDateKey(value) : value);
  return {
    id: event.id,
    title: event.title,
    start: toCalendarDate(event.startsAt),
    end: event.endsAt ? toCalendarDate(event.endsAt) : undefined,
    allDay: event.allDay,
    classNames: [IMPORTANCE_META[event.importance].eventClassName],
    extendedProps: { dto: event },
  };
}

function toUtcDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function toEventRange(start: Date, end: Date | null, allDay: boolean) {
  if (!allDay) return { startsAt: start.toISOString(), endsAt: end?.toISOString() ?? null };
  const startKey = toDateInputValue(start);
  const endKey = end ? toDateInputValue(end) : addDaysToKey(startKey, 1);
  return {
    startsAt: dateKeyToUtc(startKey).toISOString(),
    endsAt: dateKeyToUtc(endKey).toISOString(),
  };
}

const TIME_FORMAT = { hour: "2-digit", minute: "2-digit", hour12: false } as const;

export function EventCalendar({
  events,
  anchor,
  calendarView,
}: {
  events: EventDTO[];
  anchor: string;
  calendarView: CalendarView;
}) {
  const { openCreate, openEdit, moveEvent } = useEventsActions();
  const [, setParams] = useEventsParams();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarEvents = useMemo(() => events.map(toCalendarEvent), [events]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== calendarView) {
      api.changeView(calendarView, anchor);
    } else if (toUtcDay(api.getDate()).toISOString().slice(0, 10) !== anchor) {
      api.gotoDate(anchor);
    }
  }, [anchor, calendarView]);

  function handleDatesSet(arg: DatesSetArg) {
    const date = toUtcDay(arg.view.calendar.getDate());
    const view = arg.view.type as CalendarView;
    const dateKey = date.toISOString().slice(0, 10);
    if (dateKey === anchor && view === calendarView) return;
    void setParams({ date, cv: view });
  }

  function handleSelect(arg: DateSelectArg) {
    arg.view.calendar.unselect();
    const isSingleDayInMonthGrid =
      arg.view.type === "dayGridMonth" && differenceInCalendarDays(arg.end, arg.start) === 1;
    if (isSingleDayInMonthGrid) openCreate({ start: arg.start });
    else openCreate({ start: arg.start, end: arg.end, allDay: arg.allDay });
  }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    openEdit(arg.event.extendedProps.dto as EventDTO);
  }

  async function handleEventChange(arg: EventDropArg | EventResizeDoneArg) {
    const { event } = arg;
    if (!event.start) return arg.revert();
    const dto = event.extendedProps.dto as EventDTO;
    const ok = await moveEvent({
      ...dto,
      ...toEventRange(event.start, event.end, event.allDay),
      allDay: event.allDay,
    });
    if (!ok) arg.revert();
  }

  return (
    <div className="rounded-xl border bg-card p-2 sm:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={enGbLocale}
        firstDay={WEEK_STARTS_ON}
        initialView={calendarView}
        initialDate={anchor}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
        height="auto"
        events={calendarEvents}
        eventDisplay="block"
        eventTimeFormat={TIME_FORMAT}
        slotLabelFormat={TIME_FORMAT}
        dayMaxEvents={3}
        nowIndicator
        selectable
        selectMirror
        editable
        eventStartEditable
        eventDurationEditable
        scrollTime="08:00:00"
        datesSet={handleDatesSet}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
      />
    </div>
  );
}
