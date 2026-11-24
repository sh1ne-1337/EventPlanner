import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/server/db";

import { auth } from "./index";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true },
  });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=SessionExpired");
  return user;
}
