import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    pool: "threads",
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
