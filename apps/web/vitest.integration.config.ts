import { defineConfig } from "vitest/config";

/** Row Level Security tests against the local Supabase stack (see tests/integration/helpers.ts). */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.int.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
