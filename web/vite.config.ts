import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "web",
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:4577",
      "/automation": "http://127.0.0.1:4577",
      "/bridge": "http://127.0.0.1:4577",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
