import { describe, it, expect } from "vitest";
import { parseSubtitles, timestamp } from "./subtitles";
import {
  time,
  size,
  fileId,
  isVideo,
  describeFile,
  resolution,
  PlaybackService,
  CONVERSION_LIMIT,
} from "./media";
describe("local media and subtitle handling", () => {
  it("formats long movie times and file sizes", () => {
    expect(time(7351)).toBe("2:02:31");
    expect(time(NaN)).toBe("0:00");
    expect(size(1536 * 1024 * 1024)).toBe("1.5 GB");
    expect(size(1024 * 1024)).toBe("1.0 MB");
  });
  it("recognizes MKV without assuming native codec support", () => {
    const file = new File(["data"], "Movie.mkv", { lastModified: 42 });
    expect(isVideo(file)).toBe(true);
    expect(describeFile(file).format).toBe("mkv");
    expect(describeFile(file).duration).toBe(0);
    expect(fileId(file)).toBe("Movie.mkv:4:42");
    expect(resolution({ ...describeFile(file), height: 2160 })).toBe("4K");
  });
  it("parses SRT with CRLF, commas, multiline cues, and safe plain text", () => {
    const cues = parseSubtitles(
      "1\r\n00:01:02,500 --> 00:01:05,000\r\n<i>Hello</i>\r\nworld\r\n\r\n2\r\n00:01:06,000 --> 00:01:08,000\r\nNext",
      "srt",
    );
    expect(cues).toEqual([
      { start: 62.5, end: 65, text: "Hello\nworld" },
      { start: 66, end: 68, text: "Next" },
    ]);
  });
  it("parses WebVTT settings and ignores malformed cues", () => {
    expect(
      parseSubtitles(
        "WEBVTT\n\n00:01.000 --> 00:03.200 align:start\nFirst\n\nnope --> invalid\nIgnore",
        "vtt",
      ),
    ).toEqual([{ start: 1, end: 3.2, text: "First" }]);
  });
  it("parses ASS event format and commas in dialogue as plain text", () => {
    const source =
      "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.20,0:00:04.00,Default,,0,0,0,,{\\i1}Hello, world\\NAgain";
    expect(parseSubtitles(source, "ass")).toEqual([
      { start: 1.2, end: 4, text: "Hello, world\nAgain" },
    ]);
  });
  it("rejects unsupported or empty subtitle input", () => {
    expect(() => parseSubtitles("data", "sub")).toThrow("Use an SRT");
    expect(() => parseSubtitles("WEBVTT", "vtt")).toThrow("No readable");
    expect(timestamp("01:02:03.125")).toBe(3723.125);
  });
  it("refuses large conversions before allocating input memory", async () => {
    const fake = { size: CONVERSION_LIMIT + 1 } as File;
    await expect(
      new PlaybackService().convert(fake, "transcode", () => {}),
    ).rejects.toThrow("limited to 256 MB");
  });
});
