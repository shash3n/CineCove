import { test, expect } from "@playwright/test";
test("compact changes both movie and show grids and list row spacing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your collection. Your cinema." }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveShow({ id: "show", name: "A show", folders: [] });
    for (let i = 0; i < 7; i++)
      await storage.saveVideo({
        id: String(i),
        name: `Movie${i}.mp4`,
        size: 1,
        modified: 1,
        format: "mp4",
        added: 1,
        duration: 10,
        width: 1920,
        height: 1080,
        position: 0,
        favorite: false,
        ...(i === 6 ? { showId: "show", season: 1, episode: 1 } : {}),
      });
  });
  await page.reload();
  const columns = (selector: string) =>
    page
      .locator(selector)
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
  await expect.poll(() => columns(".library-section .video-grid")).toBe(4);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Compact library" }).click();
  await page.getByRole("button", { name: "All Videos 7", exact: true }).click();
  await expect.poll(() => columns(".library-section .video-grid")).toBe(5);
  await expect.poll(() => columns(".library-section .show-grid")).toBe(5);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".video-row").first()).toHaveCSS(
    "padding-top",
    "8px",
  );
  await page.reload();
  await expect(page.locator(".workspace")).toHaveClass(/layout-compact/);
});
