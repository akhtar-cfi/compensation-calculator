import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const repo = fileURLToPath(new URL("..", import.meta.url));

// The security headers the site is served with (vercel.json). The preview server sends the same ones, so the
// end-to-end tests run under the real Content-Security-Policy and fail on any violation.
const vercel = JSON.parse(readFileSync(`${repo}vercel.json`, "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const siteHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === "/(.*)")!.headers.map((h) => [h.key, h.value]),
);

// Link previews (WhatsApp, etc.) need an absolute image address: the production address when Vercel provides it.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/`
  : "";
const siteUrl = (): Plugin => ({
  name: "site-url",
  transformIndexHtml: (html) => html.replaceAll("%SITE%", site),
});

// Static, self-contained build: relative asset paths and hash routing, so it can be hosted anywhere (or opened
// from disk) without a server. No external requests: fonts are bundled, data is baked in at build time.
export default defineConfig({
  root,
  base: "./",
  plugins: [preact(), tailwindcss(), siteUrl()],
  build: { outDir: "dist", emptyOutDir: true, target: "es2020" },
  server: { fs: { allow: [repo] } },
  preview: { headers: siteHeaders },
});
