import { test, expect } from "@playwright/test";

test("credits are excluded and playlists support search, bulk selection, cancel and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    for (const [id, position] of [
      ["Early", 40],
      ["Credits", 85],
      ["Finished", 98],
    ] as const)
      await storage.saveVideo({
        id,
        name: `${id}.mp4`,
        position,
        duration: 100,
        size: 3,
        modified: 1,
        added: 1,
        format: "mp4",
        width: 0,
        height: 0,
        favorite: false,
      });
    await storage.savePlaylist({
      id: "weekend",
      name: "Weekend",
      videoIds: [],
    });
  });
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Continue Watching", exact: true })
    .click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(1);
  await expect(
    page
      .locator(".library-section")
      .getByRole("button", { name: "Play Early.mp4", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import videos", exact: true }),
  ).toHaveCount(1);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Weekend", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select videos", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Search videos" }).fill("Early");
  await page.getByRole("button", { name: "Select all shown" }).click();
  await page.getByRole("textbox", { name: "Search videos" }).fill("Credits");
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("status")).toHaveText("2 selected");
  await page.getByRole("textbox", { name: "Search videos" }).fill("");
  await page.screenshot({ path: "test-results/playlist-selection.png" });
  await page.getByRole("button", { name: "Save selection" }).click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Select videos", exact: true })
    .click();
  await page.getByRole("button", { name: "Clear shown" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(2);
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Weekend", exact: true })
    .click();
  await expect(page.locator(".library-section .video-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Options for Early.mp4", exact: true })
    .click();
  await expect(page.locator(".dropdown .danger-text")).toHaveCSS(
    "color",
    "rgb(240, 120, 134)",
  );
  const bounds = await page.locator(".dropdown").boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.screenshot({ path: "test-results/video-menu.png" });
});
