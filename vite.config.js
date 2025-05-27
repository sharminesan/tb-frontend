import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["@turtleui/webcomponents"],
  },
});
