import type { NextRequest } from "next/server";

import { handlers } from "@/server/auth";

const BLOCKED_CREDENTIALS_PATHS = [
  "/api/auth/callback/credentials",
  "/api/auth/signin/credentials",
];

export const { GET } = handlers;

export function POST(request: NextRequest) {
  if (BLOCKED_CREDENTIALS_PATHS.includes(request.nextUrl.pathname)) {
    return new Response("Not Found", { status: 404 });
  }
  return handlers.POST(request);
}
