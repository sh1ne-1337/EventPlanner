import { execSync } from "node:child_process";

import { loadTestDatabaseEnv } from "./test-db";

export default function setup() {
  loadTestDatabaseEnv();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
