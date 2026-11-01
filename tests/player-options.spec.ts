import { test, expect } from "@playwright/test";
test("episode browser crosses seasons and subtitle appearance persists and resets", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const module = "/src/lib/storage.ts";
    const { storage } = await import(module);
    await storage.saveShow({ id: "show", name: "Test Show", folders: [] });
    for (let i = 1; i <= 3; i++)
      await storage.saveVideo({
        id: `Episode${i}.mkv:3:1`,
        name: `Episode${i}.mkv`,
        size: 3,
        modified: 1,
        format: "mkv",
        added: 1,
        duration: 100,
        width: 1920,
        height: 800,
        position: 0,
        favorite: false,
        showId: "show",
        season: i < 3 ? 1 : 2,
        episode: i < 3 ? i : 1,
      });
  });
  await page.reload();
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    for (let i = 1; i <= 3; i++)
      transfer.items.add(
        new File(["bad"], `Episode${i}.mkv`, { lastModified: 1 }),
      );
    const input = document.querySelector<HTMLInputElement>(
      "input[type=file][multiple]",
    )!;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(
    page.getByText("3 videos reconnected.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "TV Shows", exact: true }).click();
  await page.getByRole("button", { name: "Open show Test Show" }).click();
  await page
    .getByRole("button", { name: "Play Episode1.mkv", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Previous episode", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next episode", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Playing Episode2.mkv" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next episode", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Playing Episode3.mkv" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next episode", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Season 2", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Previous episode", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Playing Episode2.mkv" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to library" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Subtitle font family" })
    .selectOption("monospace");
  await page.getByRole("slider", { name: "Subtitle text opacity" }).fill("0.5");
  await page
    .getByRole("combobox", { name: "Subtitle character edge" })
    .selectOption("outline");
  await page
    .getByRole("slider", { name: "Subtitle background opacity" })
    .fill("0.3");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Subtitle font family" }),
  ).toHaveValue("monospace");
  await expect(
    page.getByRole("slider", { name: "Subtitle text opacity" }),
  ).toHaveValue("0.5");
  await page.getByRole("button", { name: "Reset subtitle appearance" }).click();
  await expect(
    page.getByRole("combobox", { name: "Subtitle font family" }),
  ).toHaveValue("sans-serif");
  await expect(
    page.getByRole("slider", { name: "Subtitle text opacity" }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("slider", { name: "Subtitle background opacity" }),
  ).toHaveValue("0.7");
});
