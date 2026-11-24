import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const emptyModule = fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { "server-only": emptyModule },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          env: { TZ: "Europe/Kyiv" },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
