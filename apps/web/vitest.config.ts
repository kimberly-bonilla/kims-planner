import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Database tests need a running local Supabase: `npm run test:integration`.
    exclude: ["tests/integration/**", "node_modules/**"],
    environment: "node",
  },
});
