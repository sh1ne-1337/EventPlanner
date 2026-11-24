import { config } from "dotenv";

export function loadTestDatabaseEnv() {
  config({ path: ".env.test", quiet: true });
  const url = process.env.DATABASE_URL;
  const dbName = url ? new URL(url).pathname.slice(1) : "";
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${dbName || "<unset>"}": the database name must end with "_test".`,
    );
  }
}
