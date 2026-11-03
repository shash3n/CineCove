import { test, expect } from "@playwright/test";

test("shortcut editor works in fullscreen, remembers bindings, toggles captions and restores defaults", async ({
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
    const code = await engine.exec([
      "-f",
      "lavfi",
      "-i",
      "color=c=0x243550:s=320x180:r=12",
      "-t",
      "12",
      "-c:v",
      "libx264",
      "fixture.mp4",
    ]);
    if (code) throw new Error("Fixture generation failed");
    const data = await engine.readFile("fixture.mp4");
    engine.terminate();
    return Array.from(data as Uint8Array);
  });
  await page
    .locator("input[type=file][multiple]")
    .first()
    .setInputFiles({
      name: "Shortcuts.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from(bytes),
    });
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Play Shortcuts.mp4", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await page.getByRole("button", { name: "Toggle fullscreen (F)" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.locator(".player-stage").focus();
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", {
    name: "Keyboard shortcuts",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) => !!document.fullscreenElement?.contains(element),
      ),
    )
    .toBe(true);
  const captions = dialog.getByRole("textbox", {
    name: "Shortcut for Toggle captions",
    exact: true,
  });
  await captions.press("m");
  await expect(dialog.getByRole("status")).toContainText("already used");
  await expect(captions).toHaveValue("C");
  await captions.press("v");
  await expect(captions).toHaveValue("V");
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator(".player-stage").focus();
  await page.keyboard.press("a");
  await expect(page.locator(".player-popover h3")).toHaveText("Audio");
  await page.getByRole("button", { name: "Close playback menu" }).click();
  await page.locator("input[accept='.srt,.vtt,.ass,.ssa']").setInputFiles({
    name: "test.srt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "1\n00:00:00,000 --> 00:00:10,000\nCaption shortcut test\n",
    ),
  });
  await expect(page.locator(".subtitle-overlay")).toBeVisible();
  await page.locator(".player-stage").focus();
  await page.keyboard.press("v");
  await expect(page.locator(".subtitle-overlay")).toHaveCount(0);
  await page.keyboard.press("v");
  await expect(page.locator(".subtitle-overlay")).toBeVisible();
  await page.keyboard.press("?");
  await expect(dialog).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/fullscreen-shortcuts.png",
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole("button", { name: "Back to library" }).click();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Play Shortcuts.mp4", exact: true })
    .click();
  await page.locator(".player-stage").focus();
  await page.keyboard.press("?");
  await expect(captions).toHaveValue("V");
  await dialog
    .getByRole("button", { name: "Reset shortcuts", exact: true })
    .click();
  await expect(captions).toHaveValue("C");
  await expect(
    dialog.getByRole("textbox", {
      name: "Shortcut for Audio tracks",
      exact: true,
    }),
  ).toHaveValue("A");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cinecove.preferences")!)
            .keyboardShortcuts,
      ),
    )
    .toEqual({});
});
