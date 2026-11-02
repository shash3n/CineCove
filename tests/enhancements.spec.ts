import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
test("folder input preserves nesting, TV seasons are editable, and legacy entries survive", async ({
  page,
}, info) => {
  const root = info.outputPath("Collection");
  await mkdir(path.join(root, "Nature", "Season 1"), { recursive: true });
  await mkdir(path.join(root, "Nature", "Season 2"), { recursive: true });
  await writeFile(
    path.join(root, "Nature", "Season 1", "Nature.S01E01.mkv"),
    "fixture one",
  );
  await writeFile(
    path.join(root, "Nature", "Season 2", "Nature.S02E01.mkv"),
    "fixture two",
  );
  await writeFile(path.join(root, "Movie.mp4"), "fixture three");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your collection. Your cinema." }),
  ).toBeVisible();
  await page.locator("input[webkitdirectory]").setInputFiles(root);
  await expect(
    page.getByRole("button", { name: "Open folder Collection", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".library-section .video-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Open folder Collection", exact: true })
    .click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open folder Nature", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open folder Season 1", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".library-section .video-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Organize as TV show", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Show name" })).toHaveValue(
    "Nature",
  );
  await page.getByRole("button", { name: "Save show", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Season 1 1" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Season 2 1" })).toBeVisible();
  await page.getByRole("tab", { name: "Season 2 1" }).click();
  await expect(
    page.getByRole("button", { name: "Play Nature.S02E01.mkv", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit show & season folders" })
    .click();
  await page
    .getByRole("textbox", { name: "Show name" })
    .fill("Nature documentaries");
  await page
    .getByRole("spinbutton", {
      name: "Season for Nature/Season 2",
      exact: true,
    })
    .fill("3");
  await page.getByRole("button", { name: "Save show", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Season 3 1" })).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "All Videos 3" })
    .click();
  await page
    .getByRole("button", { name: "Open folder Collection", exact: true })
    .click();
  await page.getByRole("button", { name: "Options for Movie.mp4" }).click();
  await page
    .getByRole("button", { name: "Organize as TV episode", exact: true })
    .click();
  const showId = await page
    .getByRole("combobox", { name: "TV show" })
    .locator("option")
    .last()
    .getAttribute("value");
  await page.getByRole("combobox", { name: "TV show" }).selectOption(showId!);
  await page.getByRole("spinbutton", { name: "Episode season" }).fill("3");
  await page.getByRole("spinbutton", { name: "Episode number" }).fill("2");
  await page.getByRole("button", { name: "Save episode" }).click();
  await page.reload();
  await page.getByRole("button", { name: "TV Shows", exact: true }).click();
  await page
    .getByRole("button", { name: "Open show Nature documentaries" })
    .click();
  await expect(page.getByRole("tab", { name: "Season 3 2" })).toBeVisible();
  await page.getByRole("tab", { name: "Season 3 2" }).click();
  await expect(
    page.getByRole("button", { name: "Play Movie.mp4", exact: true }),
  ).toBeVisible();
});
test("continue watching can hide one entry or clear all without deleting resume data", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    for (let i = 1; i <= 2; i++)
      await storage.saveVideo({
        id: "video" + i,
        name: `Movie${i}.mp4`,
        size: 100,
        modified: 1,
        format: "mp4",
        added: 1,
        duration: 1000,
        width: 1920,
        height: 800,
        position: 50 * i,
        lastPlayed: 1,
        favorite: false,
      });
  });
  await page.reload();
  await page
    .locator(".continue-section")
    .getByRole("button", { name: "Options for Movie1.mp4" })
    .click();
  await page
    .getByRole("button", { name: "Remove from Continue Watching", exact: true })
    .click();
  await expect(page.locator(".continue-section .video-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Continue Watching", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear Continue Watching", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No videos here yet" }),
  ).toBeVisible();
  const saved = await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    return (await import(module)).storage.videos();
  });
  expect(saved).toHaveLength(2);
  expect(saved.map((v: any) => v.position)).toEqual([50, 100]);
  expect(saved.every((v: any) => v.continueHidden)).toBe(true);
  await page.reload();
  await expect(page.locator(".continue-section")).toHaveCount(0);
});
test("daylight surfaces stay readable and the logo and hero follow every accent", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const colors: string[] = [];
  for (const accent of ["violet", "blue", "mint"]) {
    await page.getByRole("button", { name: `${accent} accent` }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("light");
    const computed = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      heading: getComputedStyle(document.querySelector(".settings-card h2")!)
        .color,
      logo: getComputedStyle(document.querySelector(".brand-icon")!).color,
      nav: getComputedStyle(document.querySelector(".nav-item.active")!).color,
    }));
    expect(computed.text).toBe("rgb(36, 35, 49)");
    expect(computed.heading).toBe(computed.text);
    await expect(page.locator(".nav-item.active")).toHaveCSS(
      "color",
      computed.logo,
    );
    colors.push(computed.logo);
    expect(computed.background).not.toBe("rgb(16, 17, 20)");
  }
  expect(new Set(colors).size).toBe(3);
  await page.screenshot({
    path: "test-results/cinevault-daylight.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.screenshot({
    path: "test-results/cinevault-mint.png",
    fullPage: true,
  });
});
test("v1 IndexedDB metadata is migrated without clearing the library", async ({
  page,
}) => {
  await page.route("**/migration", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Migration fixture</title>",
    }),
  );
  await page.goto("/migration");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("cinevault", 1);
      req.onupgradeneeded = () => {
        for (const name of ["videos", "playlists", "folders"])
          req.result.createObjectStore(name, { keyPath: "id" });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("videos", "readwrite");
        tx.objectStore("videos").put({
          id: "legacy",
          name: "Legacy.mp4",
          size: 42,
          modified: 1,
          format: "mp4",
          added: 1,
          duration: 100,
          width: 1920,
          height: 800,
          position: 20,
          favorite: true,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto("/");
  await expect(
    page
      .locator(".library-section")
      .getByRole("button", { name: "Play Legacy.mp4", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".library-section .format-badge")).toHaveText(
    "1080p",
  );
  await page.getByRole("button", { name: "TV Shows", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Give your shows their own home" }),
  ).toBeVisible();
});
test("MKV exposes and plays embedded subtitle and alternate audio tracks locally", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    (window as any).Audio = function (src?: string) {
      const a = new OriginalAudio(src);
      (window as any).__alternateAudio = a;
      return a;
    };
  });
  await page.goto("/");
  const fixture = await page.evaluate(async () => {
    const module = "/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js";
    const { FFmpeg } = await import(module);
    const e = new FFmpeg();
    await e.load({
      coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
      wasmURL: location.origin + "/ffmpeg/ffmpeg-core.wasm",
    });
    await e.writeFile(
      "captions.srt",
      "1\n00:00:00,000 --> 00:00:12,000\nEmbedded movie subtitles.\n",
    );
    const code = await e.exec([
      "-f",
      "lavfi",
      "-i",
      "color=c=0x18352e:s=320x180:r=12",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=880",
      "-i",
      "captions.srt",
      "-t",
      "12",
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-map",
      "2:a",
      "-map",
      "3:s",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-c:s",
      "srt",
      "-metadata:s:a:0",
      "language=eng",
      "-metadata:s:a:1",
      "language=spa",
      "-metadata:s:s:0",
      "language=eng",
      "-disposition:a:0",
      "0",
      "-disposition:a:1",
      "default",
      "-disposition:s:0",
      "default",
      "fixture.mkv",
    ]);
    if (code) throw new Error("Fixture generation failed");
    const data = await e.readFile("fixture.mkv");
    e.terminate();
    return Array.from(data as Uint8Array);
  });
  await page
    .locator("input[type=file][multiple]")
    .first()
    .setInputFiles({
      name: "Embedded.mkv",
      mimeType: "video/x-matroska",
      buffer: Buffer.from(fixture),
    });
  await expect(
    page.getByText("1 video added to your library.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play Embedded.mkv", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((v: HTMLVideoElement) => {
    v.pause();
    v.currentTime = 1;
  });
  // Defaults are applied without opening a playback menu.
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__alternateAudio.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await expect(page.locator("video")).toHaveJSProperty("muted", true);

  await expect(page.locator(".subtitle-overlay")).toHaveText(
    "Embedded movie subtitles.",
  );
  await page.getByRole("button", { name: "Subtitles", exact: true }).click();
  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cinevault.preferences")!)
            .captionsEnabled,
      ),
    )
    .toBe(false);
  await page.getByRole("button", { name: "Close playback menu" }).click();
  await page.getByRole("button", { name: "Audio tracks", exact: true }).click();
  await page.getByRole("button", { name: /spa · AAC/ }).click();
  await expect(page.getByText("Preparing audio… Cancel")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.muted),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Close playback menu" }).click();
  await page.locator(".player-stage").focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => (window as any).__alternateAudio.paused))
    .toBe(false);
  await page.getByRole("slider", { name: "Seek video" }).fill("4");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(
          (window as any).__alternateAudio.currentTime -
            document.querySelector("video")!.currentTime,
        ),
      ),
    )
    .toBeLessThan(0.5);
  await page
    .getByRole("button", { name: "Playback speed", exact: true })
    .click();
  await page.getByRole("button", { name: "1.5×", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__alternateAudio.playbackRate),
    )
    .toBe(1.5);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await expect
    .poll(() => page.evaluate(() => (window as any).__alternateAudio.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Audio tracks", exact: true }).click();
  await page.getByRole("button", { name: "Original audio (browser)" }).click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.muted),
    )
    .toBe(false);
  await page.locator("video").evaluate((v: HTMLVideoElement) => {
    v.currentTime = 6;
    v.pause();
  });
  await page.getByRole("button", { name: "Back to library" }).click();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Play Embedded.mkv", exact: true })
    .click();
  await expect(page.locator(".resume-note")).toBeVisible();
  await page.screenshot({
    path: "test-results/resume-toast.png",
    animations: "disabled",
  });
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  await expect(page.locator(".subtitle-overlay")).toHaveCount(0);
  await page.getByRole("button", { name: "Subtitles", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Off", exact: true }),
  ).toContainText("Off");
  await page.getByRole("button", { name: "Close playback menu" }).click();
  await page.mouse.move(0, 0);
  await expect(page.locator(".resume-note")).toHaveCount(0, { timeout: 12000 });
  // Also verify output decoding and exact subtitle timing independently of the UI.
  const result = await page.evaluate(async (data) => {
    const module = "/src/lib/embedded.ts";
    const { EmbeddedMediaService } = await import(module);
    const s = new EmbeddedMediaService(
      new File([new Uint8Array(data)], "fixture.mkv"),
    );
    try {
      const probe = await s.probe();
      const sub = probe.tracks.find((t: any) => t.type === "subtitle");
      const audio = probe.tracks.filter((t: any) => t.type === "audio");
      const cues = await s.subtitles(sub);
      const blob = await s.audioSegment(audio[1], 0);
      const a = new Audio();
      const url = URL.createObjectURL(blob);
      a.src = url;
      await new Promise<void>((resolve, reject) => {
        a.onloadeddata = () => resolve();
        a.onerror = () => reject(new Error("Audio decode failed"));
      });
      const duration = a.duration;
      a.removeAttribute("src");
      a.load();
      URL.revokeObjectURL(url);
      return { tracks: probe.tracks, cues, duration };
    } finally {
      s.dispose();
    }
  }, fixture);
  expect(
    result.tracks
      .filter((t: any) => t.type === "audio")
      .map((t: any) => t.language),
  ).toEqual(["eng", "spa"]);
  expect(result.cues[0].text).toBe("Embedded movie subtitles.");
  expect(result.duration).toBeGreaterThan(10);
});
