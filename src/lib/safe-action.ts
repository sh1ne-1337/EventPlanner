import "server-only";

import { createSafeActionClient } from "next-safe-action";

import { ActionError } from "@/lib/errors";
import { DEFAULT_ERROR_MESSAGE } from "@/lib/messages";
import { requireUser } from "@/server/auth/session";

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: "flattened",
  handleServerError(error) {
    if (error instanceof ActionError) return error.message;
    console.error("[server-action]", error);
    return DEFAULT_ERROR_MESSAGE;
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await requireUser();
  return next({ ctx: { user } });
});
