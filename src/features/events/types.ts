import type { Importance } from "./constants";

export type EventDTO = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  importance: Importance;
};
