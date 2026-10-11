import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

// Static, self-contained build: relative asset paths and hash routing, so it can be hosted anywhere (or opened
// from disk) without a server. No external requests: fonts are bundled, data is baked in at build time.
export default defineConfig({
  root,
  base: "./",
  plugins: [preact(), tailwindcss()],
  build: { outDir: "dist", emptyOutDir: true, target: "es2020" },
  server: { fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
});
