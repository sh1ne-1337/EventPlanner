import type { EventRecord } from "@/server/repositories/event-repository";

import type { EventDTO } from "./types";

export function toEventDTO(event: EventRecord): EventDTO {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    allDay: event.allDay,
    importance: event.importance,
  };
}
