import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  functions: {
    progress: {
      name: "Service progress API",
      source: "./functions/progress.mjs",
    },
  },
});