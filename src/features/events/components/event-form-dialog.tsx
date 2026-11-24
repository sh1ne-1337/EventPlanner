"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert } from "@/features/auth/components/alert";
import { applyServerValidationErrors } from "@/lib/form-errors";

import { createEventAction, updateEventAction } from "../actions";
import {
  DESCRIPTION_MAX,
  IMPORTANCE_META,
  IMPORTANCE_VALUES,
  TITLE_MAX,
  type Importance,
} from "../constants";
import {
  defaultsToFormValues,
  eventToFormValues,
  formValuesToInput,
  shiftEndWithStart,
  toggleAllDayValues,
  type EventFormDefaults,
} from "../form-values";
import { eventFormSchema, type EventFormValues } from "../schemas";
import type { EventDTO } from "../types";
import { ImportanceDot } from "./importance-badge";

export type { EventFormDefaults };

type DialogState =
  { mode: "create"; defaults?: EventFormDefaults } | { mode: "edit"; event: EventDTO } | null;

const SERVER_FIELD_MAP = { startsAt: "start", endsAt: "end" } as const;

export function EventFormDialog({
  state,
  onOpenChange,
  onRequestDelete,
}: {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: (event: EventDTO) => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {state && (
          <EventForm
            key={state.mode === "edit" ? state.event.id : "create"}
            state={state}
            onDone={() => onOpenChange(false)}
            onRequestDelete={onRequestDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  state,
  onDone,
  onRequestDelete,
}: {
  state: NonNullable<DialogState>;
  onDone: () => void;
  onRequestDelete: (event: EventDTO) => void;
}) {
  const isEdit = state.mode === "edit";
  const [formError, setFormError] = useState<string>();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: isEdit ? eventToFormValues(state.event) : defaultsToFormValues(state.defaults),
  });
  const { errors } = form.formState;
  const allDay = useWatch({ control: form.control, name: "allDay" });

  useEffect(() => {
    form.setFocus("title");
  }, [form]);

  const callbacks = {
    onSuccess: () => {
      toast.success(isEdit ? "Event updated" : "Event created");
      onDone();
    },
    onError: ({
      error,
    }: {
      error: {
        serverError?: string;
        validationErrors?: Parameters<typeof applyServerValidationErrors>[1];
      };
    }) => {
      const fromValidation = applyServerValidationErrors(
        form.setError,
        error.validationErrors,
        SERVER_FIELD_MAP,
      );
      setFormError(error.serverError ?? fromValidation);
    },
  };
  const create = useAction(createEventAction, callbacks);
  const update = useAction(updateEventAction, callbacks);
  const isPending = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    const input = formValuesToInput(values);
    if (isEdit) update.execute({ ...input, id: state.event.id });
    else create.execute(input);
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the details of your event." : "Fill in the details of your event."}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        {formError && <Alert>{formError}</Alert>}

        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="event-title">Title</FieldLabel>
          <Input
            id="event-title"
            placeholder="e.g. Team meeting"
            maxLength={TITLE_MAX}
            aria-invalid={!!errors.title}
            {...form.register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name="allDay"
            render={({ field }) => (
              <Switch
                id="event-all-day"
                checked={field.value}
                onCheckedChange={(checked) => {
                  const { start, end } = toggleAllDayValues(form.getValues(), checked);
                  field.onChange(checked);
                  form.setValue("start", start);
                  form.setValue("end", end);
                  form.clearErrors(["start", "end"]);
                }}
              />
            )}
          />
          <FieldLabel htmlFor="event-all-day">All day</FieldLabel>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.start}>
            <FieldLabel htmlFor="event-start">{allDay ? "Start date" : "Starts"}</FieldLabel>
            <Controller
              control={form.control}
              name="start"
              render={({ field }) => (
                <Input
                  id="event-start"
                  type={allDay ? "date" : "datetime-local"}
                  aria-invalid={!!errors.start}
                  {...field}
                  onChange={(e) => {
                    const end = shiftEndWithStart(form.getValues(), e.target.value, allDay);
                    field.onChange(e);
                    form.setValue("end", end, { shouldValidate: form.formState.isSubmitted });
                  }}
                />
              )}
            />
            <FieldError errors={[errors.start]} />
          </Field>
          <Field data-invalid={!!errors.end}>
            <FieldLabel htmlFor="event-end">
              {allDay ? "End date" : "Ends"}{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="event-end"
              type={allDay ? "date" : "datetime-local"}
              aria-invalid={!!errors.end}
              {...form.register("end")}
            />
            <FieldError errors={[errors.end]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.importance}>
          <FieldLabel id="event-importance-label">Importance</FieldLabel>
          <Controller
            control={form.control}
            name="importance"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                aria-labelledby="event-importance-label"
                value={field.value}
                onValueChange={(value) => value && field.onChange(value as Importance)}
                className="w-full"
              >
                {IMPORTANCE_VALUES.map((value) => (
                  <ToggleGroupItem key={value} value={value} className="flex-1">
                    <ImportanceDot importance={value} />
                    {IMPORTANCE_META[value].label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
          <FieldError errors={[errors.importance]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="event-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="event-description"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            placeholder="Agenda, location, links…"
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>

      <DialogFooter className="gap-2 sm:justify-between">
        {isEdit ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => onRequestDelete(state.event)}
            disabled={isPending}
          >
            <Trash2Icon />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
