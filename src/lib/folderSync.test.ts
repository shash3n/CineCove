import { describe, it, expect, vi } from "vitest";
import { scanFolder } from "./folderSync";
import type { Folder } from "../types";
describe("automatic folder scans", () => {
  it("checks permissions without prompting", async () => {
    const requestPermission = vi.fn();
    const folder = {
      id: "f",
      name: "Movies",
      added: 1,
      handle: { queryPermission: async () => "prompt", requestPermission },
    } as unknown as Folder;
    expect(await scanFolder(folder)).toBeNull();
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it("finds nested videos and paths without reading file contents", async () => {
    const arrayBuffer = vi.fn();
    const file = {
      name: "Episode.mkv",
      size: 100,
      lastModified: 1,
      arrayBuffer,
    };
    const child = { kind: "file", getFile: async () => file };
    const directory = {
      kind: "directory",
      name: "Season 1",
      async *values() {
        yield child;
      },
    };
    const folder = {
      id: "f",
      name: "Show",
      added: 1,
      handle: {
        queryPermission: async () => "granted",
        async *values() {
          yield directory;
        },
      },
    } as unknown as Folder;
    const result = await scanFolder(folder);
    expect(result?.paths).toEqual(["", "Season 1"]);
    expect(result?.found.get("Episode.mkv:100:1")?.relativePath).toBe(
      "Season 1/Episode.mkv",
    );
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
  it("does not return a partial scan when a drive fails", async () => {
    const folder = {
      id: "f",
      name: "Drive",
      added: 1,
      handle: {
        queryPermission: async () => "granted",
        async *values() {
          throw new Error("Drive offline");
        },
      },
    } as unknown as Folder;
    await expect(scanFolder(folder)).rejects.toThrow("Drive offline");
  });
});
