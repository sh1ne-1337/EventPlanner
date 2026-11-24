"use server";

import { AuthError } from "next-auth";

import { env } from "@/env";
import { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/errors";
import { actionClient } from "@/lib/safe-action";
import { signIn, signOut } from "@/server/auth";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { createRateLimiter, getClientIp } from "@/server/rate-limit";

import { safeCallbackUrl, signInSchema, signUpSchema } from "./schemas";

const disabled = env.RATE_LIMIT_DISABLED;
const signInLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000, disabled });
const signUpLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000, disabled });

function tooManyAttempts(retryAfterMs: number): never {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  throw new ActionError(
    `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  );
}

async function signInWithCredentials(email: string, password: string, callbackUrl?: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeCallbackUrl(callbackUrl),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      throw new ActionError(
        error.type === "CredentialsSignin"
          ? "Invalid email or password."
          : "Could not sign in. Please try again.",
      );
    }
    throw error;
  }
}

export const signInAction = actionClient
  .inputSchema(signInSchema)
  .action(async ({ parsedInput: { email, password, callbackUrl } }) => {
    const ip = await getClientIp();
    const limit = signInLimiter.check(`${ip}:${email}`);
    if (!limit.success) tooManyAttempts(limit.retryAfterMs);

    await signInWithCredentials(email, password, callbackUrl);
  });

export const signUpAction = actionClient
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput: { name, email, password, callbackUrl } }) => {
    const limit = signUpLimiter.check(await getClientIp());
    if (!limit.success) tooManyAttempts(limit.retryAfterMs);

    try {
      await db.user.create({
        data: { email, name: name || null, passwordHash: await hashPassword(password) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ActionError("An account with this email already exists.");
      }
      throw error;
    }

    await signInWithCredentials(email, password, callbackUrl);
  });

export async function signInWithGoogleAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: safeCallbackUrl(callbackUrl) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
