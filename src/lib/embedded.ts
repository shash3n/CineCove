import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { Cue } from "../types";
import { parseSubtitles } from "./subtitles";

export interface EmbeddedTrack {
  index: number;
  type: "audio" | "subtitle";
  codec: string;
  language: string;
  title: string;
  default: boolean;
  supported: boolean;
}
export interface MediaProbe {
  tracks: EmbeddedTrack[];
  width: number;
  height: number;
  duration: number;
}
const textCodecs = new Set([
  "subrip",
  "srt",
  "ass",
  "ssa",
  "webvtt",
  "mov_text",
  "text",
]);
export function trackLabel(t: EmbeddedTrack) {
  return `${t.title || t.language || (t.type === "audio" ? "Audio" : "Subtitles")} · ${t.codec.toUpperCase()}${t.default ? " · Default" : ""}`;
}
/** WORKERFS provides seekable, read-only File access. Video bytes never enter MEMFS. */
export class EmbeddedMediaService {
  private engine?: FFmpeg;
  private initialization?: Promise<FFmpeg>;
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private subtitleCache = new Map<number, Cue[]>();
  constructor(private file: File) {}
  dispose() {
    this.generation++;
    this.engine?.terminate();
    this.engine = undefined;
    this.initialization = undefined;
    this.queue = Promise.resolve();
    this.subtitleCache.clear();
  }
  private load() {
    if (!this.initialization) {
      const generation = this.generation;
      this.initialization = (async () => {
        const { FFmpeg, FFFSType } = await import("@ffmpeg/ffmpeg");
        if (generation !== this.generation)
          throw new Error("Track operation cancelled.");
        const engine = new FFmpeg();
        this.engine = engine;
        await engine.load({
          coreURL: new URL("ffmpeg/ffmpeg-core.js", document.baseURI).href,
          wasmURL: new URL("ffmpeg/ffmpeg-core.wasm", document.baseURI).href,
        });
        await engine.createDir("/source");
        await engine.mount(
          FFFSType.WORKERFS,
          { files: [this.file] },
          "/source",
        );
        return engine;
      })().catch((e) => {
        if (generation === this.generation) {
          this.engine?.terminate();
          this.engine = undefined;
          this.initialization = undefined;
        }
        throw e;
      });
    }
    return this.initialization;
  }
  private task<T>(
    fn: (engine: FFmpeg, input: string) => Promise<T>,
  ): Promise<T> {
    const generation = this.generation;
    const result = this.queue
      .catch(() => {})
      .then(async () => {
        if (generation !== this.generation)
          throw new Error("Track operation cancelled.");
        const e = await this.load();
        return fn(e, "/source/" + this.file.name);
      });
    this.queue = result;
    return result;
  }
  probe(): Promise<MediaProbe> {
    return this.task(async (e, input) => {
      const code = await e.ffprobe(
        [
          "-v",
          "error",
          "-show_streams",
          "-show_format",
          "-of",
          "json",
          "-o",
          "probe.json",
          input,
        ],
        30000,
      );
      // Some single-thread cores leave ffprobe's status at -1 after writing
      // valid JSON. Validate the actual output instead of discarding its tracks.
      if (code !== 0 && code !== -1)
        throw new Error(
          `Embedded tracks could not be inspected (engine status ${code}). The container may be damaged, encrypted, or unsupported by the local engine.`,
        );
      try {
        const data = await e.readFile("probe.json", "utf8");
        const parsed = JSON.parse(data as string);
        if (!Array.isArray(parsed.streams) || !parsed.streams.length)
          throw new Error("No readable streams were found in this file.");
        const video = parsed.streams?.find(
          (s: any) => s.codec_type === "video" && !s.disposition?.attached_pic,
        );
        return {
          width: video?.width || 0,
          height: video?.height || 0,
          duration: Number(parsed.format?.duration) || 0,
          tracks: (parsed.streams || [])
            .filter((s: any) => ["audio", "subtitle"].includes(s.codec_type))
            .map((s: any) => ({
              index: s.index,
              type: s.codec_type,
              codec: s.codec_name || "unknown",
              language: s.tags?.language || "",
              title: s.tags?.title || "",
              default: !!s.disposition?.default,
              supported:
                s.codec_type === "audio"
                  ? !["unknown", "none"].includes(s.codec_name || "unknown")
                  : textCodecs.has(s.codec_name),
            })),
        };
      } finally {
        await e.deleteFile("probe.json").catch(() => {});
      }
    });
  }
  subtitles(track: EmbeddedTrack): Promise<Cue[]> {
    if (!track.supported)
      return Promise.reject(
        new Error(
          "This is an image-based or unsupported subtitle track. Use an external SRT/VTT file for this track.",
        ),
      );
    if (this.subtitleCache.has(track.index))
      return Promise.resolve(this.subtitleCache.get(track.index)!);
    return this.task(async (e, input) => {
      try {
        const code = await e.exec(
          [
            "-v",
            "error",
            "-i",
            input,
            "-map",
            `0:${track.index}`,
            "-vn",
            "-an",
            "-c:s",
            "webvtt",
            "-f",
            "webvtt",
            "-y",
            "subtitles.vtt",
          ],
          300000,
        );
        if (code !== 0)
          throw new Error(
            "This subtitle track could not be extracted. It may use unsupported encoding or compression.",
          );
        const data = await e.readFile("subtitles.vtt");
        if (typeof data === "string" || data.byteLength > 10 * 1024 * 1024)
          throw new Error("The subtitle track is too large to render safely.");
        const cues = parseSubtitles(new TextDecoder().decode(data), "vtt");
        this.subtitleCache.set(track.index, cues);
        while (this.subtitleCache.size > 3)
          this.subtitleCache.delete(this.subtitleCache.keys().next().value!);
        return cues;
      } finally {
        await e.deleteFile("subtitles.vtt").catch(() => {});
      }
    });
  }
  /** Small AAC windows bound output memory independently of the movie's size. */
  audioSegment(
    track: EmbeddedTrack,
    start: number,
    seconds = 120,
  ): Promise<Blob> {
    return this.task(async (e, input) => {
      try {
        const code = await e.exec(
          [
            "-v",
            "error",
            "-ss",
            String(Math.max(0, start)),
            "-i",
            input,
            "-t",
            String(Math.min(120, seconds)),
            "-map",
            `0:${track.index}`,
            "-vn",
            "-sn",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            "-y",
            "audio.m4a",
          ],
          120000,
        );
        if (code !== 0)
          throw new Error(
            "This audio codec could not be decoded by the local engine. Original browser audio has been restored.",
          );
        const data = await e.readFile("audio.m4a");
        if (typeof data === "string" || data.byteLength > 8 * 1024 * 1024)
          throw new Error("The audio window exceeded its memory budget.");
        return new Blob([new Uint8Array(data)], { type: "audio/mp4" });
      } finally {
        await e.deleteFile("audio.m4a").catch(() => {});
      }
    });
  }
}
