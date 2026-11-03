import { test, expect } from "@playwright/test";

test("the new brand keeps existing libraries, preferences, queues, and old backups", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveVideo({
      id: "legacy",
      name: "Legacy movie.mp4",
      size: 1,
      modified: 1,
      added: 1,
      format: "mp4",
      width: 0,
      height: 0,
      duration: 100,
      position: 42,
      favorite: true,
    });
    localStorage.removeItem("cinecove.preferences");
    localStorage.removeItem("cinecove.queue");
    localStorage.setItem(
      "cinevault.preferences",
      JSON.stringify({ theme: "light", volume: 0.35 }),
    );
    localStorage.setItem("cinevault.queue", JSON.stringify(["legacy"]));
  });
  await page.reload();
  await expect(page).toHaveTitle("CineCove — Your private cinema");
  await expect(page.locator(".brand")).toContainText("CineCove");
  const restored = await page.evaluate(async () => {
    const storageModule = "/src/lib/storage.ts",
      queueModule = "/src/lib/queue.ts";
    const { storage, loadPreferences } = await import(storageModule);
    const { loadQueue } = await import(queueModule);
    return {
      videos: await storage.videos(),
      prefs: loadPreferences(),
      queue: loadQueue(),
      databases: await indexedDB.databases(),
    };
  });
  expect(restored.videos[0].position).toBe(42);
  expect(restored.prefs.theme).toBe("light");
  expect(restored.prefs.volume).toBe(0.35);
  expect(restored.queue).toEqual(["legacy"]);
  expect(restored.databases.some((db) => db.name === "cinevault")).toBe(true);
  await expect(
    page.locator(".sidebar").getByRole("link", { name: "GitHub" }),
  ).toHaveAttribute("href", "https://github.com/shash3n/CineCove");
});
