import { describe, it, expect, vi } from "vitest";
import { resolveVideoFile } from "./fileAccess";
import type { Folder, VideoEntry } from "../types";
const video = {
  id: "episode",
  name: "Episode.mkv",
  size: 100,
  modified: 1,
  relativePath: "Season 1/Episode.mkv",
} as VideoEntry;
describe("restoring local playback access", () => {
  it("resolves a nested file through its saved folder without an individual file handle", async () => {
    const file = { name: video.name, size: 100, lastModified: 1 };
    const handle = { getFile: async () => file };
    const requestPermission = vi.fn(async () => "granted");
    const getFileHandle = vi.fn(async () => handle);
    const getDirectoryHandle = vi.fn(async () => ({ getFileHandle }));
    const folder = {
      handle: { requestPermission, getDirectoryHandle },
    } as unknown as Folder;
    expect(await resolveVideoFile(video, folder)).toEqual({ file, handle });
    expect(requestPermission).toHaveBeenCalledWith({ mode: "read" });
    expect(getDirectoryHandle).toHaveBeenCalledWith("Season 1");
    expect(getFileHandle).toHaveBeenCalledWith("Episode.mkv");
  });
  it("renews folder permission instead of using a stale file handle", async () => {
    const stale = vi.fn(async () => {
      throw new Error("stale");
    });
    const file = { name: video.name, size: 100, lastModified: 1 };
    const folder = {
      handle: {
        requestPermission: async () => "granted",
        getFileHandle: async () => ({ getFile: async () => file }),
      },
    } as unknown as Folder;
    expect(
      (
        await resolveVideoFile(
          {
            ...video,
            relativePath: video.name,
            handle: { getFile: stale } as unknown as FileSystemFileHandle,
          },
          folder,
        )
      )?.file,
    ).toBe(file);
    expect(stale).not.toHaveBeenCalled();
  });
  it("reuses a saved individual handle and refuses changed or denied files", async () => {
    const handle = {
      requestPermission: async () => "granted",
      getFile: async () => ({ name: video.name, size: 100, lastModified: 1 }),
    } as unknown as FileSystemFileHandle;
    expect((await resolveVideoFile({ ...video, handle }))?.handle).toBe(handle);
    await expect(
      resolveVideoFile({ ...video, size: 200, handle }),
    ).rejects.toThrow("changed");
    const denied = {
      handle: { requestPermission: async () => "denied" },
    } as unknown as Folder;
    await expect(resolveVideoFile(video, denied)).rejects.toThrow("permission");
    expect(await resolveVideoFile(video)).toBeNull();
  });
});
