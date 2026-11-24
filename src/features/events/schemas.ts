import { z } from "zod";

import { DESCRIPTION_MAX, IMPORTANCE_VALUES, TITLE_MAX } from "./constants";

const MIN_DATE = new Date("1970-01-01T00:00:00Z");
const MAX_DATE = new Date("2100-01-01T00:00:00Z");

const dateSchema = z.coerce
  .date({ error: "Invalid date" })
  .min(MIN_DATE, "Date is out of range")
  .max(MAX_DATE, "Date is out of range");

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .nullish()
  .transform((v) => (v ? v : null));

const importanceSchema = z.enum(IMPORTANCE_VALUES, { error: "Invalid importance" });

export const eventIdSchema = z.string().min(1).max(64);

type Range = { startsAt: Date; endsAt: Date | null; allDay: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

const isUtcMidnight = (date: Date) => date.getTime() % DAY_MS === 0;

function validateRange(data: Range, ctx: z.RefinementCtx) {
  if (data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start" });
  }
  if (data.allDay && !isUtcMidnight(data.startsAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["startsAt"],
      message: "All-day events must start on a date",
    });
  }
  if (data.allDay && data.endsAt && !isUtcMidnight(data.endsAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "All-day events must end on a date",
    });
  }
}

function withAllDayEnd<T extends Range>(data: T): T {
  if (!data.allDay || data.endsAt) return data;
  return { ...data, endsAt: new Date(data.startsAt.getTime() + DAY_MS) };
}

const eventFields = z.object({
  title: titleSchema,
  description: descriptionSchema,
  importance: importanceSchema,
  allDay: z.boolean().default(false),
  startsAt: dateSchema,
  endsAt: dateSchema.nullish().transform((v) => v ?? null),
});

export const createEventSchema = eventFields.superRefine(validateRange).transform(withAllDayEnd);

export const updateEventSchema = eventFields
  .extend({ id: eventIdSchema })
  .superRefine(validateRange)
  .transform(withAllDayEnd);

export const moveEventSchema = z
  .object({
    id: eventIdSchema,
    startsAt: dateSchema,
    endsAt: dateSchema.nullish().transform((v) => v ?? null),
    allDay: z.boolean(),
  })
  .superRefine(validateRange)
  .transform(withAllDayEnd);

export const deleteEventSchema = z.object({ id: eventIdSchema });

export type CreateEventInput = z.output<typeof createEventSchema>;
export type UpdateEventInput = z.output<typeof updateEventSchema>;
export type MoveEventInput = z.output<typeof moveEventSchema>;

export const eventFormSchema = z
  .object({
    title: titleSchema,
    description: z
      .string()
      .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
    importance: importanceSchema,
    allDay: z.boolean(),
    start: z.string().min(1, "Start is required"),
    end: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.end) return;
    const invalid = data.allDay ? data.end < data.start : data.end <= data.start;
    if (invalid) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: data.allDay ? "End date can't be before start date" : "End must be after start",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
