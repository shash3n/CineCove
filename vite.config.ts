import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
// Serve the optional engine from the same origin; no CDN or media requests.
const engine = {
  name: "local-ffmpeg-core",
  configureServer(server: any) {
    server.middlewares.use("/ffmpeg", (req: any, res: any, next: any) => {
      const name = req.url?.split("?")[0];
      if (!["/ffmpeg-core.js", "/ffmpeg-core.wasm"].includes(name))
        return next();
      res.setHeader(
        "Content-Type",
        name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
      );
      res.end(
        readFileSync(
          new URL(
            `./node_modules/@ffmpeg/core/dist/esm${name}`,
            import.meta.url,
          ),
        ),
      );
    });
  },
  generateBundle(this: any) {
    for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"])
      this.emitFile({
        type: "asset",
        fileName: `ffmpeg/${name}`,
        source: readFileSync(
          new URL(
            `./node_modules/@ffmpeg/core/dist/esm/${name}`,
            import.meta.url,
          ),
        ),
      });
  },
};
export default defineConfig({
  plugins: [react(), tailwindcss(), engine],
  base: "./",
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg"] },
});
