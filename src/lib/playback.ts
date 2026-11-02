import type { VideoEntry } from "../types";
export const WATCHED_THRESHOLD = 0.85;
export function isWatched(
  video: Pick<VideoEntry, "position" | "duration" | "completed">,
) {
  return (
    !!video.completed ||
    (video.duration > 0 && video.position / video.duration >= WATCHED_THRESHOLD)
  );
}
export function canContinue(video: VideoEntry) {
  return video.position > 0 && !isWatched(video) && !video.continueHidden;
}
