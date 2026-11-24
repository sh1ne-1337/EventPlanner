"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert } from "@/features/auth/components/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { applyServerValidationErrors } from "@/lib/form-errors";

import { signInAction } from "../actions";
import { signInSchema } from "../schemas";
import { AuthDivider, GoogleButton } from "./google-button";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in with your email and password instead.",
  SessionExpired: "Your session has expired. Please sign in again.",
  AccessDenied: "Access denied. Your Google email must be verified.",
  Configuration: "Sign-in is temporarily unavailable. Please try again later.",
};

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
  const urlError = searchParams.get("error");

  const [formError, setFormError] = useState<string | undefined>(
    urlError
      ? (AUTH_ERROR_MESSAGES[urlError] ?? "Could not sign in. Please try again.")
      : undefined,
  );

  const form = useForm<z.input<typeof signInSchema>, unknown, z.output<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const { execute, isPending } = useAction(signInAction, {
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

          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            Sign in
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
