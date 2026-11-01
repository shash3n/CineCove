import { describe, it, expect } from "vitest";
import { describeFile, resolution } from "./media";
import {
  directoryPaths,
  folderChildren,
  episodeFor,
  suggestedSeasons,
} from "./organization";
import type { Folder, TVShow } from "../types";
describe("folder browsing, television, and source resolutions", () => {
  const folder: Folder = {
    id: "root",
    name: "Shows",
    added: 1,
    paths: [
      "",
      "Nature",
      "Nature/Season 1",
      "Nature/Season 2",
      "Nature/Season 2/Extras",
      "Empty",
    ],
  };
  const video = {
    ...describeFile(new File(["a"], "Nature.S02E03.mkv")),
    folderId: "root",
    relativePath: "Nature/Season 2/Nature.S02E03.mkv",
  };
  const show: TVShow = {
    id: "show",
    name: "Nature",
    folders: [
      { folderId: "root", path: "Nature", season: 1 },
      { folderId: "root", path: "Nature/Season 2", season: 2 },
    ],
  };
  it("keeps immediate folders separate from nested episodes", () => {
    expect(folderChildren(folder, [video], "")).toEqual(["Empty", "Nature"]);
    expect(folderChildren(folder, [video], "Nature")).toEqual([
      "Nature/Season 1",
      "Nature/Season 2",
    ]);
    expect(directoryPaths({ ...folder, paths: undefined }, [video])).toContain(
      "Nature/Season 2",
    );
  });
  it("maps specific season folders before their parent and honors episode overrides", () => {
    expect(episodeFor(video, [show])).toEqual({
      showId: "show",
      season: 2,
      episode: 3,
    });
    expect(
      episodeFor({ ...video, showId: "other", season: 4, episode: 8 }, [show]),
    ).toEqual({ showId: "other", season: 4, episode: 8 });
    expect(
      episodeFor({ ...video, relativePath: "Nature documentary/Other.mkv" }, [
        show,
      ]),
    ).toBeUndefined();
  });
  it("suggests season folders without flattening nested extras", () => {
    expect(suggestedSeasons(folder, [video], "Nature")).toEqual([
      { folderId: "root", path: "Nature/Season 1", season: 1 },
      { folderId: "root", path: "Nature/Season 2", season: 2 },
    ]);
  });
  it("classifies cropped widescreen using both dimensions", () => {
    expect(resolution({ ...video, width: 1920, height: 800 })).toBe("1080p");
    expect(resolution({ ...video, width: 3840, height: 1600 })).toBe("4K");
    expect(resolution({ ...video, width: 1280, height: 544 })).toBe("720p");
    expect(
      resolution({
        ...video,
        width: 1920,
        height: 1080,
        sourceWidth: 3840,
        sourceHeight: 1600,
      }),
    ).toBe("4K");
    expect(resolution({ ...video, width: 640, height: 360 })).toBe("360p");
  });
});
