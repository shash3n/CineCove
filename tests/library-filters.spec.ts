import { test, expect } from "@playwright/test";

test("watch status and media type combine with existing filters and clear together", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveShow({
      id: "series",
      name: "Filter series",
      folders: [{ folderId: "linked", path: "Season 1", season: 1 }],
    });
    for (const [id, position, format, extra] of [
      ["Watched movie", 95, "mp4", {}],
      ["Unwatched movie", 20, "mkv", {}],
      ["Watched episode", 95, "mp4", { showId: "series", season: 1 }],
      [
        "Linked episode",
        0,
        "mkv",
        { folderId: "linked", relativePath: "Season 1/Episode 2.mkv" },
      ],
    ] as const) {
      await storage.saveVideo({
        id,
        name: `${id}.${format}`,
        position,
        format,
        duration: 100,
        size: 3,
        modified: 1,
        added: 1,
        width: 1920,
        height: 1080,
        favorite: true,
        ...extra,
      });
    }
  });
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Favorites", exact: true })
    .click();
  const library = page.locator(".library-section");
  await library.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("Filter watch status").selectOption("watched");
  await expect(library.locator(".video-card")).toHaveCount(2);
  await page.getByLabel("Filter media type").selectOption("movies");
  await expect(library.locator(".video-card")).toHaveCount(1);
  await expect(library.locator(".card-title")).toHaveText("Watched movie");
  await page.getByLabel("Filter watch status").selectOption("unwatched");
  await expect(library.locator(".card-title")).toHaveText("Unwatched movie");
  await page.getByLabel("Filter media type").selectOption("tv");
  await expect(library.locator(".card-title")).toHaveText("Linked episode");
  await page.getByLabel("Filter format").selectOption("mp4");
  await expect(library.locator(".video-card")).toHaveCount(0);
  await library.getByRole("button", { name: "Clear filters" }).click();
  await expect(library.locator(".video-card")).toHaveCount(4);
  for (const label of [
    "Filter format",
    "Filter resolution",
    "Filter watch status",
    "Filter media type",
  ])
    await expect(page.getByLabel(label)).toHaveValue("");
  await page.getByLabel("Filter resolution").selectOption("720p");
  await expect(library.locator(".video-card")).toHaveCount(0);
  await library.getByRole("button", { name: "Clear filters" }).click();
  await page.screenshot({ path: "test-results/library-filters-desktop.png" });
  await page.getByLabel("Filter watch status").click();
  await page.screenshot({ path: "test-results/library-dropdown.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/library-filters-mobile.png",
    animations: "disabled",
  });
  const panel = await library.locator(".filter-panel").boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  await page.getByLabel("Filter media type").selectOption("movies");
  await expect(library.locator(".video-card")).toHaveCount(2);
});
