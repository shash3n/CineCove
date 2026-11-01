import { test, expect } from "@playwright/test";
test("timeline decodes different frames without seeking the playing video", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const module = "/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js";
    const { FFmpeg } = await import(module);
    const engine = new FFmpeg();
    await engine.load({
      coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
      wasmURL: location.origin + "/ffmpeg/ffmpeg-core.wasm",
    });
    const code = await engine.exec([
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=160x90:r=10:d=3",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=160x90:r=10:d=3",
      "-filter_complex",
      "[0:v][1:v]concat=n=2:v=1:a=0",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "movie.mp4",
    ]);
    if (code) throw new Error("Fixture generation failed");
    const data = await engine.readFile("movie.mp4");
    engine.terminate();
    const url = URL.createObjectURL(new Blob([data], { type: "video/mp4" }));
    const playing = document.createElement("video");
    playing.src = url;
    await new Promise<void>(
      (resolve) => (playing.onloadeddata = () => resolve()),
    );
    playing.currentTime = 1;
    await new Promise<void>((resolve) => (playing.onseeked = () => resolve()));
    const previewModule = "/src/lib/timelinePreview.ts";
    const { TimelinePreview } = await import(previewModule);
    const previews = new TimelinePreview(url);
    try {
      const first = await previews.frame(0),
        second = await previews.frame(4),
        cached = await previews.frame(4);
      return { first, second, cached, position: playing.currentTime };
    } finally {
      previews.dispose();
      playing.removeAttribute("src");
      playing.load();
      URL.revokeObjectURL(url);
    }
  });
  expect(result.first).toMatch(/^data:image/);
  expect(result.second).toMatch(/^data:image/);
  expect(result.first).not.toBe(result.second);
  expect(result.cached).toBe(result.second);
  expect(result.position).toBe(1);
});
