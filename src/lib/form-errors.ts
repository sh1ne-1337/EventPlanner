import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type FlattenedErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export function applyServerValidationErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: FlattenedErrors | undefined,
  fieldMap: Partial<Record<string, Path<T>>> = {},
): string | undefined {
  if (!errors) return undefined;
  for (const [field, messages] of Object.entries(errors.fieldErrors ?? {})) {
    const message = messages?.[0];
    if (!message) continue;
    const target = fieldMap[field] ?? (field as Path<T>);
    setError(target, { type: "server", message });
  }
  return errors.formErrors?.[0];
}
