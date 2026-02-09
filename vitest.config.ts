import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/vite-env.d.ts"],
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "date-fns/locale/pt-BR", replacement: path.resolve(__dirname, "./node_modules/date-fns/locale/pt-BR.js") },
      { find: "date-fns/locale", replacement: path.resolve(__dirname, "./node_modules/date-fns/locale.js") },
      { find: /^date-fns$/, replacement: path.resolve(__dirname, "./node_modules/date-fns/index.js") },
    ],
  },
});
