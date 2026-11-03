import { test, expect } from "@playwright/test";

test("queue keeps video, metadata and episodes aligned on wide screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveShow({
      id: "layout",
      name: "Layout series",
      folders: [],
    });
    for (let i = 1; i <= 2; i++)
      await storage.saveVideo({
        id: `Episode${i}.mp4:3:1`,
        name: `Episode${i}.mp4`,
        size: 3,
        modified: 1,
        added: 1,
        format: "mp4",
        duration: 100,
        width: 0,
        height: 0,
        position: 0,
        favorite: false,
        showId: "layout",
        season: 1,
        episode: i,
      });
    localStorage.setItem(
      "cinecove.queue",
      JSON.stringify(["Episode2.mp4:3:1"]),
    );
  });
  await page.reload();
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    for (let i = 1; i <= 2; i++)
      transfer.items.add(
        new File(["bad"], `Episode${i}.mp4`, { lastModified: 1 }),
      );
    const input = document.querySelector<HTMLInputElement>(
      "input[type=file][multiple]",
    )!;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page
    .getByRole("button", { name: "Layout series", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Play Episode1.mp4", exact: true })
    .click();
  await expect(page.locator(".queue-sidebar")).toBeVisible();
  const autoNext = (await page.locator(".auto-next-toggle").boundingBox())!;
  const nextIcon = (await page
    .getByRole("button", { name: "Audio tracks", exact: true })
    .locator("svg")
    .boundingBox())!;
  expect(Math.abs(autoNext.height - nextIcon.height)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      autoNext.y + autoNext.height / 2 - nextIcon.y - nextIcon.height / 2,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/player-controls-alignment.png" });
  const stage = (await page.locator(".player-stage").boundingBox())!;
  for (const selector of [".now-playing-info", ".episode-browser"]) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(Math.abs(box.x - stage.x)).toBeLessThan(1);
    expect(Math.abs(box.width - stage.width)).toBeLessThan(1);
    expect(box.y).toBeGreaterThanOrEqual(stage.y + stage.height);
  }
});
