"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { applyServerValidationErrors } from "@/lib/form-errors";

import { signUpAction } from "../actions";
import { signUpSchema } from "../schemas";
import { Alert } from "./alert";
import { AuthDivider, GoogleButton } from "./google-button";

type Input = z.input<typeof signUpSchema>;

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const callbackUrl = useSearchParams().get("callbackUrl") ?? undefined;
  const [formError, setFormError] = useState<string>();

  const form = useForm<Input, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const { execute, isPending } = useAction(signUpAction, {
    onError: ({ error }) => {
      const fromValidation = applyServerValidationErrors(form.setError, error.validationErrors);
      setFormError(error.serverError ?? fromValidation);
    },
  });

  return (
    <div>
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <AuthDivider />
        </>
      )}

      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          setFormError(undefined);
          execute({ ...values, callbackUrl });
        })}
      >
        <FieldGroup>
          {formError && <Alert>{formError}</Alert>}

          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Jane Doe"
              {...form.register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password ? (
              <FieldError errors={[errors.password]} />
            ) : (
              <FieldDescription>At least 8 characters, with a letter and a digit.</FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            Create account
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
