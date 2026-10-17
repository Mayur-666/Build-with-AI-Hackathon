import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  // `server-only` throws outside Next's server bundle; tests run server code directly.
  resolve: { alias: { "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)) } },
});
