import { test, expect } from "@playwright/test";

test("queue reorder, removal, auto-next, credits watch status, and blinds work together", async ({
  page,
}) => {
  await page.goto("/");
  const bytes = await page.evaluate(async () => {
    const module = "/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js";
    const { FFmpeg } = await import(module);
    const engine = new FFmpeg();
    await engine.load({
      coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
      wasmURL: location.origin + "/ffmpeg/ffmpeg-core.wasm",
    });
    if (
      await engine.exec([
        "-f",
        "lavfi",
        "-i",
        "color=c=0x243550:s=320x180:r=12",
        "-t",
        "12",
        "-c:v",
        "libx264",
        "fixture.mp4",
      ])
    )
      throw new Error("Fixture generation failed");
    const data = await engine.readFile("fixture.mp4");
    engine.terminate();
    return Array.from(data as Uint8Array);
  });
  const names = ["Episode1.mp4", "Episode2.mp4", "Episode3.mp4", "Movie.mp4"];
  await page.evaluate(
    async ({ bytes, names }) => {
      const module = "/src/lib/storage.ts";
      const { storage } = await import(module);
      await storage.saveShow({
        id: "series",
        name: "Test Series",
        folders: [],
      });
      for (const [i, name] of names.entries())
        await storage.saveVideo({
          id: `${name}:${bytes.length}:1`,
          name,
          size: bytes.length,
          modified: 1,
          added: i,
          format: "mp4",
          width: 320,
          height: 180,
          duration: 12,
          position: 0,
          favorite: false,
          ...(i < 3
            ? {
                showId: "series",
                season: i === 2 ? 2 : 1,
                episode: i === 2 ? 1 : i + 1,
              }
            : {}),
        });
    },
    { bytes, names },
  );
  await page.reload();
  await page.evaluate(
    ({ bytes, names }) => {
      const transfer = new DataTransfer();
      names.forEach((name) =>
        transfer.items.add(
          new File([new Uint8Array(bytes)], name, {
            lastModified: 1,
            type: "video/mp4",
          }),
        ),
      );
      const input = document.querySelector<HTMLInputElement>(
        "input[type=file][multiple]",
      )!;
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { bytes, names },
  );
  await expect(
    page.getByText("4 videos reconnected.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Options for Movie.mp4", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  await page.getByRole("button", { name: "Test Series", exact: true }).click();
  await page
    .getByRole("button", { name: "Play Episode1.mp4", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await page
    .getByRole("button", { name: "Playback queue (1)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Queue Episode3", exact: true })
    .click();
  const rows = page.locator(".queue-item");
  await expect(rows.locator("strong")).toHaveText(["Movie", "Episode3"]);
  await page
    .getByRole("button", { name: "Drag Movie to reorder", exact: true })
    .dragTo(rows.filter({ hasText: "Episode3" }));
  await expect(rows.locator("strong")).toHaveText(["Episode3", "Movie"]);
  await page
    .getByRole("button", { name: "Move Movie up", exact: true })
    .click();
  await expect(rows.locator("strong")).toHaveText(["Movie", "Episode3"]);
  await page
    .getByRole("button", { name: "Remove Movie from queue", exact: true })
    .click();
  await expect(rows).toHaveCount(1);
  await page.getByRole("button", { name: "Clear queue", exact: true }).click();
  await expect(rows).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Add videos", exact: true })
    .fill("Movie");
  await page.getByRole("button", { name: "Queue Movie", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Add videos", exact: true })
    .fill("Episode3");
  await page
    .getByRole("button", { name: "Queue Episode3", exact: true })
    .click();
  await expect(rows.locator("strong")).toHaveText(["Movie", "Episode3"]);
  await page.screenshot({
    path: "test-results/playback-queue.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Close playback menu" }).click();
  const autoNext = page.getByRole("switch", { name: "Auto-next", exact: true });
  await autoNext.click();
  await expect(autoNext).toHaveAttribute("aria-checked", "false");
  // The watched flag is persisted at the credits threshold, before the video ends.
  await page.locator("video").evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration * 0.86;
    v.dispatchEvent(new Event("timeupdate"));
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const module = "/src/lib/storage.ts";
        const { storage } = await import(module);
        return (await storage.videos()).find(
          (v: any) => v.name === "Episode1.mp4",
        ).completed;
      }),
    )
    .toBe(true);
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.1;
    await v.play();
  });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.ended),
    )
    .toBe(true);
  await expect(
    page.getByRole("dialog", { name: "Playing Episode1.mp4", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Blinds mode", exact: true }).click();
  await expect(page.locator(".blinds-backdrop")).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.screenshot({
    path: "test-results/blinds-mode.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Exit blinds mode", exact: true })
    .click({ position: { x: 4, y: 4 } });
  await expect(page.locator(".blinds-backdrop")).toHaveCount(0);
  await autoNext.click();
  await page.getByRole("button", { name: "Toggle fullscreen (F)" }).click();
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.1;
    await v.play();
  });
  await expect(
    page.getByRole("dialog", { name: "Playing Movie.mp4", exact: true }),
  ).toBeVisible();
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Playback queue (1)", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play next video", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Playing Episode3.mp4", exact: true }),
  ).toBeVisible();
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await expect(
    page.getByRole("button", { name: "Playback queue (0)", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
  await page
    .getByRole("button", { name: "Previous episode", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Playing Episode2.mp4", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.1;
    await v.play();
  });
  await expect(
    page.getByRole("dialog", { name: "Playing Episode3.mp4", exact: true }),
  ).toBeVisible();
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await page.getByRole("switch", { name: "Auto-next", exact: true }).click();
  await page.getByRole("button", { name: "Back to library" }).click();
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cinevault.preferences")!).autoNext,
      ),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("cinevault.queue")!)),
    )
    .toEqual([]);
});
