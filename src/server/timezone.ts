import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_TIME_ZONE, isValidTimeZone, TZ_COOKIE } from "@/lib/timezone";

export async function getUserTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}
