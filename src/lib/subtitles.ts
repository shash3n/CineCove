import type { Cue } from "../types";
export function timestamp(value: string) {
  const p = value.trim().replace(",", ".").split(":").map(Number);
  return p.reduce((sum, n) => sum * 60 + n, 0);
}
export function parseSubtitles(source: string, extension: string): Cue[] {
  if (!["srt", "vtt", "ass", "ssa"].includes(extension))
    throw new Error("Use an SRT, WebVTT, ASS, or SSA subtitle file.");
  const cues: Cue[] = [];
  if (extension === "ass" || extension === "ssa") {
    let fields = [
      "layer",
      "start",
      "end",
      "style",
      "name",
      "marginl",
      "marginr",
      "marginv",
      "effect",
      "text",
    ];
    let inEvents = false;
    for (const line of source.split(/\r?\n/)) {
      if (line.startsWith("["))
        inEvents = line.trim().toLowerCase() === "[events]";
      if (!inEvents) continue;
      if (/^Format:/i.test(line))
        fields = line
          .slice(7)
          .split(",")
          .map((x) => x.trim().toLowerCase());
      if (/^Dialogue:/i.test(line)) {
        const parts = line.slice(9).split(",");
        const start = timestamp(parts[fields.indexOf("start")]);
        const end = timestamp(parts[fields.indexOf("end")]);
        const text = parts
          .slice(fields.indexOf("text"))
          .join(",")
          .replace(/\{[^}]*\}/g, "")
          .replace(/\\[Nn]/g, "\n")
          .replace(/\\h/g, " ");
        cues.push({ start, end, text });
      }
    }
  } else {
    for (const block of source
      .replace(/^\uFEFF/, "")
      .replace(/\r/g, "")
      .split(/\n\s*\n/)) {
      const lines = block.split("\n");
      const index = lines.findIndex((l) => l.includes("-->"));
      if (index < 0) continue;
      const [a, b] = lines[index].split("-->");
      const start = timestamp(a);
      const end = timestamp(b.trim().split(/\s/)[0]);
      const text = lines
        .slice(index + 1)
        .join("\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      cues.push({ start, end, text });
    }
  }
  const valid = cues
    .map((c) => ({ ...c, text: c.text.trimEnd() }))
    .filter(
      (c) =>
        Number.isFinite(c.start) &&
        Number.isFinite(c.end) &&
        c.end > c.start &&
        c.text.trim(),
    )
    .sort((a, b) => a.start - b.start);
  if (!valid.length)
    throw new Error(
      "No readable subtitle cues were found. Check the file uses a supported text subtitle format.",
    );
  return valid;
}
