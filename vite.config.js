import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Fixed timezone so date-based tests are deterministic (inherited by test workers).
process.env.TZ = "Europe/Paris";

export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.js"],
  },
});
