import { test, expect } from "@playwright/test";
test("library, playback, history, subtitles, playlists, settings and privacy", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      !r.url().startsWith(baseURL!) &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      outbound.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your collection. Your cinema." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/cinevault-desktop.png",
    fullPage: true,
  });
  // Produce a real, local WebM fixture in the browser. Nothing is downloaded.
  const data = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
    });
    const chunks: BlobPart[] = [];
    const result = new Promise<number[]>((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(
          Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())),
        );
      };
    });
    recorder.start();
    let frame = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = "#262039";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#c2a4ff";
      ctx.font = "38px sans-serif";
      ctx.fillText("CineVault · Private screening", 45, 175);
      ctx.fillRect(45, 205, (frame++ * 4) % 550, 4);
    }, 83);
    await new Promise((r) => setTimeout(r, 3500));
    clearInterval(timer);
    recorder.stop();
    return result;
  });
  await page
    .locator("input[type=file][multiple]")
    .first()
    .setInputFiles({
      name: "Private.Screening.webm",
      mimeType: "video/webm",
      buffer: Buffer.from(data),
    });
  await expect(
    page.getByRole("button", {
      name: "Play Private.Screening.webm",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("1 video added to your library.", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Add favorite", exact: true }).click();
  await page
    .getByRole("button", { name: "Play Private.Screening.webm", exact: true })
    .click();
  await expect(page.locator("video")).toBeVisible();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await page.getByRole("slider", { name: "Seek video" }).fill("1.2");
  await page
    .getByRole("button", { name: "Playback speed", exact: true })
    .click();
  await page.getByRole("button", { name: "1.5×", exact: true }).click();
  await page.getByRole("button", { name: "Subtitles", exact: true }).click();
  await page.locator('input[accept=".srt,.vtt,.ass,.ssa"]').setInputFiles({
    name: "English.srt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "1\n00:00:00,000 --> 00:00:10,000\nA private movie night.\n",
    ),
  });
  await expect(page.locator(".subtitle-overlay")).toHaveText(
    "A private movie night.",
  );
  await page.getByRole("button", { name: "Subtitles", exact: true }).click();
  await page
    .getByRole("slider", { name: "Subtitle distance from edge" })
    .fill("2");
  const edgeGap = (edge: "top" | "bottom") =>
    page.locator(".subtitle-overlay").evaluate((el, edge) => {
      const box = el.getBoundingClientRect();
      const stage = el.closest(".player-stage")!.getBoundingClientRect();
      return (
        (edge === "top" ? box.top - stage.top : stage.bottom - box.bottom) /
        stage.height
      );
    }, edge);
  await expect.poll(() => edgeGap("bottom")).toBeCloseTo(0.02, 2);
  await page
    .getByRole("combobox", { name: "Subtitle position", exact: true })
    .selectOption("top");
  await expect.poll(() => edgeGap("top")).toBeCloseTo(0.02, 2);
  await page
    .getByRole("button", { name: "Reset subtitle appearance", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Subtitle distance from edge" }),
  ).toHaveValue("4");
  await page.getByRole("button", { name: "Subtitles", exact: true }).click();
  await page.locator(".player-stage").focus();
  await page.keyboard.press("m");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.muted),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Back to library" }).click();
  await expect(
    page.getByRole("heading", { name: "Pick up where you left off" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Playlist name" })
    .fill("Weekend cinema");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Select videos for Weekend cinema" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Options for Private.Screening.webm" })
    .click();
  await page
    .getByRole("button", { name: "Add to playlist", exact: true })
    .click();
  await page.getByRole("button", { name: /Weekend cinema.*0 videos/ }).click();
  await page
    .getByRole("button", { name: "Weekend cinema", exact: true })
    .click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator(".sidebar").getByRole("button", { name: "All Videos 1" }),
  ).toBeVisible();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Play Private.Screening.webm", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Reconnect your video" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.getByRole("switch", { name: "Compact library" }).click();
  await expect(
    page.getByRole("switch", { name: "Compact library" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search your library" })
    .fill("nothing matches");
  await expect(
    page.getByRole("heading", { name: "No videos here yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(page.locator(".sidebar")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, -240, 0)",
  );
  await expect(page.locator(".continue-section .video-card")).toBeVisible();
  await page.screenshot({
    path: "test-results/cinevault-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});
test("unsupported file presents recovery, and optional engine initializes locally", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your collection. Your cinema." }),
  ).toBeVisible();
  await page
    .locator("input[type=file][multiple]")
    .first()
    .setInputFiles({
      name: "Unsupported.mkv",
      mimeType: "video/x-matroska",
      buffer: Buffer.from("not a real video"),
    });
  await expect(
    page.getByText("1 video added to your library.", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("button", { name: "Play Unsupported.mkv", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "This video needs a little help." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Repackage as MP4" }).click();
  await expect(
    page.getByText(/media engine could not convert this file/),
  ).toBeVisible({ timeout: 60000 });
});
test("a real H.264 MKV can be repackaged and transcoded locally", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const engineModule = "/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js";
    const { FFmpeg } = await import(engineModule);
    const engine = new FFmpeg();
    await engine.load({
      coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
      wasmURL: location.origin + "/ffmpeg/ffmpeg-core.wasm",
    });
    const code = await engine.exec([
      "-f",
      "lavfi",
      "-i",
      "color=c=0x39274f:s=320x180:r=12",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "fixture.mkv",
    ]);
    if (code !== 0) throw new Error("Could not generate local MKV fixture");
    const data = await engine.readFile("fixture.mkv");
    engine.terminate();
    const mediaModule = "/src/lib/media.ts";
    const { PlaybackService, inspectFile } = await import(mediaModule);
    const service = new PlaybackService();
    const file = new File([data], "fixture.mkv", { type: "video/x-matroska" });
    const outcomes = [];
    for (const mode of ["remux", "transcode"]) {
      const converted = await service.convert(file, mode, () => {});
      const v = document.createElement("video");
      v.muted = true;
      v.src = service.open(converted);
      await new Promise<void>((resolve, reject) => {
        v.onloadeddata = () => resolve();
        v.onerror = () =>
          reject(new Error("Converted output is not decodable"));
      });
      const preview = await inspectFile(
        new File([converted], "fixture.mp4", { type: "video/mp4" }),
        true,
      );
      if (!preview.thumbnail) throw new Error("Thumbnail generation failed");
      const image = new Image();
      image.src = preview.thumbnail;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0, 1, 1);
      const pixel = Array.from(context.getImageData(0, 0, 1, 1).data);
      outcomes.push({
        mode,
        width: v.videoWidth,
        height: v.videoHeight,
        duration: v.duration,
        bytes: converted.size,
        pixel,
      });
      v.removeAttribute("src");
      v.load();
      service.release();
    }
    return outcomes;
  });
  expect(result).toHaveLength(2);
  for (const output of result) {
    expect(output.width).toBe(320);
    expect(output.height).toBe(180);
    expect(output.duration).toBeGreaterThan(0.5);
    expect(output.bytes).toBeGreaterThan(0);
    expect(output.pixel[0]).toBeGreaterThan(20);
    expect(output.pixel[2]).toBeGreaterThan(40);
  }
});
