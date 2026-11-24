import { afterAll, beforeEach } from "vitest";

import { loadTestDatabaseEnv } from "./test-db";

loadTestDatabaseEnv();

const { db } = await import("@/server/db");

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE events, accounts, users RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await db.$disconnect();
});
