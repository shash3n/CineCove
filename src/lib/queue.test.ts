import { expect, it } from "vitest";
import { moveQueue } from "./queue";
it("moves queued videos in both directions without mutating or losing entries", () => {
  const initial = ["a", "b", "c"];
  expect(moveQueue(initial, "a", "c")).toEqual(["b", "c", "a"]);
  expect(moveQueue(initial, "c", "a")).toEqual(["c", "a", "b"]);
  expect(moveQueue(initial, "missing", "a")).toBe(initial);
  expect(moveQueue(initial, "b", "b")).toBe(initial);
  expect(initial).toEqual(["a", "b", "c"]);
});
