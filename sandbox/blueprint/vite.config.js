import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tr } from "zod/locales";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
