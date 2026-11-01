import type { VideoEntry } from "../types";
export const formats = [
  "mp4",
  "mkv",
  "avi",
  "mov",
  "webm",
  "m4v",
  "mpeg",
  "mpg",
  "wmv",
  "flv",
  "3gp",
  "ts",
  "mts",
  "m2ts",
  "ogv",
];
export const accept = formats.map((x) => "." + x).join(",");
export const extension = (name: string) =>
  name.split(".").pop()?.toLowerCase() || "";
export const isVideo = (file: File) =>
  formats.includes(extension(file.name)) || file.type.startsWith("video/");
export const fileId = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
export function time(seconds: number, hours = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  return `${h || hours ? h + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") : Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function size(bytes: number) {
  if (!bytes) return "0 B";
  const n = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** n).toFixed(n > 1 ? 1 : 0)} ${["B", "KB", "MB", "GB"][n]}`;
}
export function title(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_.]/g, " ");
}
export function resolution(v: VideoEntry) {
  const w = v.sourceWidth || v.width,
    h = v.sourceHeight || v.height;
  const long = w ? Math.max(w, h) : (h * 16) / 9,
    short = w ? Math.min(w, h) : h;
  return long >= 3840 || short >= 2160
    ? "4K"
    : long >= 1920 || short >= 1080
      ? "1080p"
      : long >= 1280 || short >= 720
        ? "720p"
        : v.height
          ? `${v.height}p`
          : "Unprobed";
}
export function describeFile(file: File): VideoEntry {
  return {
    id: fileId(file),
    name: file.name,
    size: file.size,
    modified: file.lastModified,
    format: extension(file.name),
    added: Date.now(),
    duration: 0,
    width: 0,
    height: 0,
    position: 0,
    favorite: false,
  };
}
export function inspectFile(
  file: File,
  thumbnail: boolean,
): Promise<Partial<VideoEntry>> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (result: Partial<VideoEntry>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = setTimeout(() => finish({}), 7000);
    const info = () => ({
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
    });
    video.muted = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (!thumbnail || !video.videoWidth) return finish(info());
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(10, video.duration * 0.12)
        : 0.2;
    };
    video.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 480;
        c.height = Math.round((480 * video.videoHeight) / video.videoWidth);
        c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
        finish({ ...info(), thumbnail: c.toDataURL("image/jpeg", 0.76) });
      } catch {
        finish(info());
      }
    };
    video.onerror = () => finish({});
    video.src = url;
  });
}
export async function* walkFolder(
  handle: FileSystemDirectoryHandle,
  path = "",
  onDirectory?: (path: string) => void,
): AsyncGenerator<{
  file: File;
  handle: FileSystemFileHandle;
  relativePath: string;
}> {
  onDirectory?.(path);
  for await (const child of (handle as any).values()) {
    if (child.kind === "directory")
      yield* walkFolder(
        child,
        path ? `${path}/${child.name}` : child.name,
        onDirectory,
      );
    else {
      const file = await child.getFile();
      if (isVideo(file))
        yield {
          file,
          handle: child,
          relativePath: path ? `${path}/${file.name}` : file.name,
        };
    }
  }
}
export function playbackError(error?: MediaError | null) {
  if (error?.code === 2)
    return "The file could not be read. Check that the drive is connected, then reconnect the file.";
  if (error?.code === 3)
    return "Your browser could not decode this video. Its codec may be unsupported or the file may be damaged.";
  return "This container or codec is not supported by your browser. Try local compatibility conversion for smaller files, or use a desktop player for large movies.";
}
export const CONVERSION_LIMIT = 256 * 1024 * 1024;
export class PlaybackService {
  private url?: string;
  private engine?: import("@ffmpeg/ffmpeg").FFmpeg;
  open(file: File | Blob) {
    this.release();
    this.url = URL.createObjectURL(file);
    return this.url;
  }
  release() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
  }
  cancel() {
    this.engine?.terminate();
    this.engine = undefined;
  }
  async convert(
    file: File,
    mode: "remux" | "transcode",
    progress: (n: number, message: string) => void,
  ): Promise<Blob> {
    if (file.size > CONVERSION_LIMIT)
      throw new Error(
        "Browser conversion is limited to 256 MB to protect memory. For this movie, convert to H.264/AAC MP4 with a desktop tool such as HandBrake or FFmpeg. Your original stays untouched.",
      );
    try {
      progress(0, "Loading the local compatibility engine…");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const engine = new FFmpeg();
      this.engine = engine;
      engine.on("progress", ({ progress: p }) =>
        progress(
          Number.isFinite(p) ? Math.max(0, Math.min(0.99, p)) : 0,
          mode === "remux"
            ? "Repackaging into MP4…"
            : "Converting to H.264 / AAC…",
        ),
      );
      await engine.load({
        coreURL: new URL("ffmpeg/ffmpeg-core.js", document.baseURI).href,
        wasmURL: new URL("ffmpeg/ffmpeg-core.wasm", document.baseURI).href,
      });
      progress(0.02, "Reading the file into conversion memory…");
      await engine.writeFile(
        "input." + extension(file.name),
        new Uint8Array(await file.arrayBuffer()),
      );
      const args = [
        "-i",
        "input." + extension(file.name),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        ...(mode === "remux"
          ? ["-c:v", "copy", "-c:a", "aac"]
          : [
              "-vf",
              "scale='min(1920,iw)':-2",
              "-c:v",
              "libx264",
              "-preset",
              "ultrafast",
              "-crf",
              "23",
              "-pix_fmt",
              "yuv420p",
              "-c:a",
              "aac",
            ]),
        "-movflags",
        "+faststart",
        "output.mp4",
      ];
      const code = await engine.exec(args, 600000);
      if (code !== 0)
        throw new Error(
          "The media engine could not convert this file. Try full conversion if repackaging failed. Encrypted, damaged, or unusual codecs may need a desktop player.",
        );
      const data = await engine.readFile("output.mp4");
      if (typeof data === "string")
        throw new Error("Unexpected conversion output.");
      const result = new Blob([new Uint8Array(data)], { type: "video/mp4" });
      progress(1, "Ready to play");
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes("could not convert"))
        throw error;
      throw new Error(
        "Compatibility conversion failed or was cancelled. The engine may be unavailable, the codec unsupported, or browser memory insufficient. Try a desktop conversion for this file.",
      );
    } finally {
      this.cancel();
    }
  }
}
