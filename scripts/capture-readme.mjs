// Reproducible Chrome captures with an isolated context and fictional data.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = process.env.CINEVAULT_CAPTURE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => console.error(e.message));
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Your collection. Your cinema." })
    .waitFor();
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const c = canvas.getContext("2d");
    const atlas = new Image();
    atlas.src = "/docs/demo-artwork.png";
    await atlas.decode();
    function art(name, index) {
      c.drawImage(
        atlas,
        ((index % 3) * atlas.width) / 3,
        (Math.floor(index / 3) * atlas.height) / 2,
        atlas.width / 3,
        atlas.height / 2,
        0,
        0,
        960,
        540,
      );
      const shade = c.createLinearGradient(0, 270, 0, 540);
      shade.addColorStop(0, "transparent");
      shade.addColorStop(1, "#020617eb");
      c.fillStyle = shade;
      c.fillRect(0, 270, 960, 270);
      c.fillStyle = "#fff";
      c.font = "46px Georgia";
      c.fillText(name, 42, 465);
      c.font = "13px sans-serif";
      c.fillStyle = "#ffffffb0";
      c.fillText("CINEVAULT DEMO · A FICTIONAL STORY", 44, 503);
      return canvas.toDataURL("image/jpeg", 0.87);
    }
    const names = [
      "Midnight Horizon",
      "The Quiet Coast",
      "After the Rain",
      "Signals from Tomorrow",
      "Wildwood",
      "The Last Observatory",
    ];
    const posters = names.map(art);
    const module = "/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js";
    const { FFmpeg } = await import(module);
    const engine = new FFmpeg();
    await engine.load({
      coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
      wasmURL: location.origin + "/ffmpeg/ffmpeg-core.wasm",
    });
    await engine.writeFile(
      "poster.jpg",
      new Uint8Array(await (await fetch(posters[0])).arrayBuffer()),
    );
    await engine.exec([
      "-loop",
      "1",
      "-framerate",
      "1",
      "-i",
      "poster.jpg",
      "-t",
      "180",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "demo.mp4",
    ]);
    const data = await engine.readFile("demo.mp4");
    engine.terminate();
    const storageModule = "/src/lib/storage.ts";
    const { storage } = await import(storageModule);
    const now = Date.now();
    const mainId = `Midnight Horizon.mp4:${data.length}:1`;
    for (let i = 0; i < 6; i++)
      await storage.saveVideo({
        id: i === 0 ? mainId : "demo-" + i,
        name: names[i] + ".mp4",
        size: i === 0 ? data.length : (500 + i * 170) * 1024 * 1024,
        modified: 1,
        format: "mp4",
        added: now - i * 10000,
        duration: i === 0 ? 180 : 3900 + i * 480,
        width: 1920,
        height: 800,
        thumbnail: posters[i],
        position: i < 2 ? 60 + i * 400 : 0,
        lastPlayed: i < 2 ? now - i * 10000 : undefined,
        favorite: [0, 2, 4].includes(i),
      });
    await storage.saveShow({
      id: "show",
      name: "Signals from Tomorrow",
      folders: [],
    });
    for (let i = 1; i <= 6; i++)
      await storage.saveVideo({
        id: "episode-" + i,
        name: `Signals from Tomorrow S0${i < 4 ? 1 : 2}E0${((i - 1) % 3) + 1}.mp4`,
        size: 450 * 1024 * 1024,
        modified: 1,
        format: "mp4",
        added: now - 100000 - i * 1000,
        duration: 2400,
        width: 1920,
        height: 1080,
        thumbnail: posters[3],
        position: 0,
        favorite: false,
        showId: "show",
        season: i < 4 ? 1 : 2,
        episode: ((i - 1) % 3) + 1,
      });
    await storage.savePlaylist({
      id: "weekend",
      name: "Weekend Cinema",
      videoIds: [mainId, "demo-1", "demo-2"],
    });
    await storage.savePlaylist({
      id: "escape",
      name: "A Little Escape",
      videoIds: ["demo-4", "demo-5"],
    });
    await storage.savePlaylist({
      id: "comfort",
      name: "Comfort Watches",
      videoIds: [mainId, "demo-2", "demo-4"],
    });
    localStorage.setItem("cinevault.queue", JSON.stringify(["demo-1", "demo-2"]));
    return Array.from(data);
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Your collection. Your cinema." })
    .waitFor();
  await mkdir("docs/screenshots", { recursive: true });
  const capture = async (name) => {
    console.log(`Capturing ${name}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: false,
      animations: "disabled",
    });
  };
  await capture("home-chrome");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "All Videos 12", exact: true })
    .click();
  await capture("library-chrome");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Favorites", exact: true })
    .click();
  await capture("favorites-chrome");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Playlists", exact: true })
    .click();
  await capture("playlists-chrome");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Weekend Cinema", exact: true })
    .click();
  await capture("playlist-collection-chrome");
  await page.getByRole("button", { name: "Select videos", exact: true }).click();
  await capture("playlist-picker-chrome");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "TV Shows", exact: true }).click();
  await page
    .getByRole("button", { name: "Open show Signals from Tomorrow" })
    .click();
  await capture("show-seasons-chrome");
  await page.evaluate((data) => {
    const input = document.querySelector("input[type=file][multiple]");
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(data)], "Midnight Horizon.mp4", {
        lastModified: 1,
        type: "video/mp4",
      }),
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, clip);
  await page.getByText("1 video reconnected.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page
    .locator(".library-section")
    .getByRole("button", { name: "Play Midnight Horizon.mp4", exact: true })
    .first()
    .click();
  await page.locator("video").evaluate(async (v) => {
    v.preload = "auto";
    v.muted = true;
    await v.play();
    await new Promise((r) => {
      if (v.readyState >= 2) r();
      else v.addEventListener("loadeddata", r, { once: true });
    });
    v.pause();
    await new Promise((resolve) => {
      v.addEventListener("seeked", resolve, { once: true });
      setTimeout(resolve, 5000);
      v.currentTime = 62;
    });
  });
  await page.locator(".player-stage").hover();
  const dismissResume = page.getByRole("button", {
    name: "Dismiss resume message",
  });
  if (await dismissResume.count()) await dismissResume.click();
  await capture("player-chrome");
  await page.locator(".queue-sidebar").screenshot({ path: "docs/screenshots/queue-chrome.png", animations: "disabled" });
  await page.locator(".player-stage").focus();
  await page.keyboard.press("?");
  await page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }).waitFor();
  await capture("shortcuts-chrome");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Blinds mode", exact: true }).click();
  await capture("blinds-chrome");
  await page.getByRole("button", { name: "Exit blinds mode", exact: true }).click({ position: { x: 4, y: 4 } });
  await page.getByRole("button", { name: "Back to library" }).click();
  await capture("mini-player-chrome");
  await page.getByRole("button", { name: "Close video", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("light");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await capture("daylight-chrome");
  await page
    .getByRole("button", { name: "Export user data" })
    .scrollIntoViewIfNeeded();
  await capture("data-settings-chrome");
  await context.close();
} finally {
  await browser.close();
}
