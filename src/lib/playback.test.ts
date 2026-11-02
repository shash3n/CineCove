import { expect, it } from "vitest";
import { isWatched, canContinue } from "./playback";
import type { VideoEntry } from "../types";

it("excludes credits at 85 percent, preserves unfinished and unknown-duration progress", () => {
  expect(isWatched({ position: 84.9, duration: 100 })).toBe(false);
  expect(isWatched({ position: 85, duration: 100 })).toBe(true);
  expect(isWatched({ position: 20, duration: 0 })).toBe(false);
  expect(isWatched({ position: 20, duration: 100, completed: true })).toBe(
    true,
  );
  expect(
    canContinue({
      position: 20,
      duration: 100,
      continueHidden: true,
    } as VideoEntry),
  ).toBe(false);
});
