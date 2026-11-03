import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("export, restore, invalid backup, and subtitle placement preferences", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your collection. Your cinema." }),
  ).toBeVisible();
  await expect(page.locator(".profile-badge")).toHaveCount(0);
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveVideo({
      id: "example",
      name: "A Fictional Film.mp4",
      size: 100,
      modified: 1,
      format: "mp4",
      added: 1,
      duration: 100,
      width: 1920,
      height: 1080,
      position: 35,
      favorite: true,
    });
    await storage.savePlaylist({
      id: "weekend",
      name: "Weekend",
      videoIds: ["example"],
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const offset = page.getByRole("slider", {
    name: "Subtitle distance from edge",
  });
  await offset.fill("2");
  await page.reload();
  await expect(offset).toHaveValue("2");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export user data" }).click();
  const file = await download;
  const text = await readFile((await file.path())!, "utf8");
  const backup = JSON.parse(text);
  expect(backup.videos[0].position).toBe(35);
  expect(backup.preferences.subtitleOffset).toBe(2);
  expect(backup.playlists[0].name).toBe("Weekend");
  await page
    .getByRole("button", { name: "Clear entire library & imports" })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("0 library entries · Metadata and thumbnails only"),
  ).toBeVisible();
  const upload = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import user data" }).click();
  await (
    await upload
  ).setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("1 library entries · Metadata and thumbnails only"),
  ).toBeVisible();
  const invalid = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import user data" }).click();
  await (
    await invalid
  ).setFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"app":"Other"}'),
  });
  await expect(page.getByText(/Import failed:/)).toBeVisible();
  await expect(
    page.getByText("1 library entries · Metadata and thumbnails only"),
  ).toBeVisible();
});

test("auto-sync refreshes added, missing and restored files while preserving history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const permission = { granted: true };
    const movie = (name: string) => ({
      kind: "file",
      name,
      getFile: async () => new File(["demo"], name, { lastModified: 1 }),
    });
    const files = [movie("New.mkv"), movie("Kept.mkv")];
    const directory = {
      kind: "directory",
      name: "Movies",
      queryPermission: async () => (permission.granted ? "granted" : "prompt"),
      requestPermission: async () => {
        permission.granted = true;
        return "granted";
      },
      values: async function* () {
        yield* files;
      },
    };
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args: Parameters<typeof indexedDB.open>) => {
      const request = open(...args);
      request.addEventListener("success", () => {
        const database = request.result;
        const transaction = database.transaction.bind(database);
        database.transaction = (
          ...input: Parameters<typeof database.transaction>
        ) => {
          const tx = transaction(...input);
          const objectStore = tx.objectStore.bind(tx);
          tx.objectStore = (name: string) => {
            const store = objectStore(name);
            if (name === "folders") {
              const getAll = store.getAll.bind(store);
              store.getAll = (...query: Parameters<typeof store.getAll>) => {
                const result = getAll(...query);
                result.addEventListener("success", () => {
                  for (const folder of result.result) folder.handle = directory;
                });
                return result;
              };
              const put = store.put.bind(store);
              store.put = (value, key?) => {
                const { handle: _, ...rest } = value;
                return key === undefined ? put(rest) : put(rest, key);
              };
            }
            if (name === "videos") {
              const put = store.put.bind(store);
              store.put = (value, key?) => {
                const { handle: _, ...rest } = value;
                return key === undefined ? put(rest) : put(rest, key);
              };
            }
            return store;
          };
          return tx;
        };
      });
      return request;
    };
    Object.assign(window, { syncDemo: { files, permission, movie } });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveFolder({ id: "movies", name: "Movies", added: 1 });
    for (const name of ["Kept.mkv", "Removed.mkv"])
      await storage.saveVideo({
        id: `${name}:4:1`,
        name,
        size: 4,
        modified: 1,
        format: "mkv",
        added: 1,
        duration: 100,
        width: 0,
        height: 0,
        position: 35,
        favorite: true,
        folderId: "movies",
      });
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText(/Auto-sync on/)).toBeVisible({ timeout: 20000 });
  const state = () =>
    page.evaluate(async () => {
      const module = "/src/lib/storage.ts";
      return (await import(module)).storage.videos();
    });
  await expect
    .poll(
      async () =>
        (await state()).find((v: { name: string }) => v.name === "Removed.mkv")
          ?.missing,
    )
    .toBe(true);
  expect(
    (await state()).find((v: { name: string }) => v.name === "Kept.mkv")
      ?.position,
  ).toBe(35);
  await page.evaluate(() => {
    const demo = (window as any).syncDemo;
    demo.files.push(demo.movie("Removed.mkv"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect
    .poll(
      async () =>
        (await state()).find((v: { name: string }) => v.name === "Removed.mkv")
          ?.missing,
    )
    .toBe(false);
  await page.getByRole("button", { name: "All Videos 3", exact: true }).click();
  await page
    .getByRole("button", { name: "Options for New.mkv", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove from library", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText(/Auto-sync on/)).toBeVisible();
  expect(
    (await state()).some((v: { name: string }) => v.name === "New.mkv"),
  ).toBe(false);
  await page.evaluate(() => {
    (window as any).syncDemo.permission.granted = false;
    window.dispatchEvent(new Event("focus"));
  });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByText("Folder access needed", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reconnect Movies", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".sidebar").getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveAttribute("href", "https://github.com/shash3n/CineCove");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reconnect Movies", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reconnect Movies", exact: true })
    .click();
  await expect(page.locator(".folder-permission-banner")).toHaveCount(0);
  expect(
    (await state()).some((v: { name: string }) => v.name === "New.mkv"),
  ).toBe(false);
});
