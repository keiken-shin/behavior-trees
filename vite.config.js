import { defineConfig } from "vite";

export default defineConfig({
  // Honour an externally assigned port. Without this Vite silently picks its own
  // when the default is taken, and anything that opened the assigned one lands
  // on nothing.
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
  // `content/` holds the curriculum spine, tokens and curated video data. It sits
  // outside src/ on purpose - it is authored material, not application code, and
  // several files there are edited by the scripts/ tooling rather than by hand.
  resolve: {
    alias: { "@content": new URL("./content", import.meta.url).pathname },
  },
  build: {
    target: "es2022",
  },
});
