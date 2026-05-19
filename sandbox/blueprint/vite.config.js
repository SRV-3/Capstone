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
    hmr: { clientPort: 80, protocol: "ws" }, // tell the browser to connect HMR on port 80 (ingress)
    watch: {
      // must live inside `server`, not root
      usePolling: true,
      interval: 300,
      ignored: ["node_modules"],
    },
  },
});
