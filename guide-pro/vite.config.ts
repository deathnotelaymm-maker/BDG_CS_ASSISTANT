import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    tsconfigPaths: true,
  },
  server: { host: "::", port: 8080, strictPort: true },
  preview: { host: "::", port: 8080, strictPort: true },
  build: { outDir: "dist", sourcemap: false },
});
