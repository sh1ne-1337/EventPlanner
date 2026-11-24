"use server";

import { updateTag } from "next/cache";

import { ActionError } from "@/lib/errors";
import { authActionClient } from "@/lib/safe-action";
import * as eventRepository from "@/server/repositories/event-repository";

import { eventsTag } from "./cache";
import { toEventDTO } from "./dto";
import {
  createEventSchema,
  deleteEventSchema,
  moveEventSchema,
  updateEventSchema,
} from "./schemas";

const NOT_FOUND = "Event not found. It may have been deleted.";

export const createEventAction = authActionClient
  .inputSchema(createEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const event = await eventRepository.createEvent(ctx.user.id, parsedInput);
    updateTag(eventsTag(ctx.user.id));
    return { event: toEventDTO(event) };
  });

export const updateEventAction = authActionClient
  .inputSchema(updateEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const event = await eventRepository.updateEvent(ctx.user.id, parsedInput);
    if (!event) throw new ActionError(NOT_FOUND);
    updateTag(eventsTag(ctx.user.id));
    return { event: toEventDTO(event) };
  });

export const moveEventAction = authActionClient
  .inputSchema(moveEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const event = await eventRepository.updateEvent(ctx.user.id, parsedInput);
    if (!event) throw new ActionError(NOT_FOUND);
    updateTag(eventsTag(ctx.user.id));
    return { event: toEventDTO(event) };
  });

export const deleteEventAction = authActionClient
  .inputSchema(deleteEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const deleted = await eventRepository.deleteEvent(ctx.user.id, parsedInput.id);
    if (!deleted) throw new ActionError(NOT_FOUND);
    updateTag(eventsTag(ctx.user.id));
    return { id: parsedInput.id };
  });
