import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { EmbeddedMediaService, EmbeddedTrack } from "./embedded";
const WINDOW = 120;
export function useSegmentAudio(
  video: RefObject<HTMLVideoElement | null>,
  service: RefObject<EmbeddedMediaService | null>,
  volume: number,
  muted: boolean,
  speed: number,
  notify: (s: string, error?: boolean) => void,
) {
  const audio = useRef<HTMLAudioElement | null>(null),
    selected = useRef<EmbeddedTrack | null>(null),
    windowStart = useRef(-1),
    cache = useRef(new Map<string, Promise<Blob>>()),
    url = useRef(""),
    serial = useRef(0),
    buffering = useRef(false),
    background = useRef(false),
    wantPlay = useRef(false),
    mounted = useRef(true);
  const [active, setActive] = useState<number | null>(null),
    [loading, setLoading] = useState(false);
  const current = useRef({ volume, muted, speed, notify });
  current.current = { volume, muted, speed, notify };
  const restore = useCallback(() => {
    serial.current++;
    selected.current = null;
    setActive(null);
    buffering.current = false;
    background.current = false;
    setLoading(false);
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    windowStart.current = -1;
    cache.current.clear();
    if (video.current) video.current.muted = current.current.muted;
  }, [video]);
  const chunk = useCallback(
    (track: EmbeddedTrack, start: number) => {
      const key = track.index + ":" + start;
      let promise = cache.current.get(key);
      if (!promise) {
        promise = service.current!.audioSegment(track, start);
        cache.current.set(key, promise);
        while (cache.current.size > 3)
          cache.current.delete(cache.current.keys().next().value!);
        promise.catch(() => {
          if (cache.current.get(key) === promise) cache.current.delete(key);
        });
      }
      return promise;
    },
    [service],
  );
  const prepare = useCallback(
    async (time: number, resume: boolean, keepOriginal = false) => {
      const v = video.current,
        t = selected.current;
      if (!v || !t || !service.current) return;
      const start = Math.floor(time / WINDOW) * WINDOW;
      if (windowStart.current === start && audio.current?.src) {
        const a = audio.current;
        if (Math.abs(a.currentTime - (time - start)) > 0.3)
          a.currentTime = Math.max(0, time - start);
        if (resume) a.play().catch(() => {});
        return;
      }
      const ticket = ++serial.current;
      wantPlay.current = resume;
      buffering.current = true;
      background.current = keepOriginal;
      setLoading(true);
      audio.current?.pause();
      if (!keepOriginal) v.pause();
      try {
        const blob = await chunk(t, start);
        if (!mounted.current || ticket !== serial.current) return;
        const a = audio.current!;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(blob);
        a.src = url.current;
        await new Promise<void>((resolve, reject) => {
          a.onloadedmetadata = () => resolve();
          a.onerror = () =>
            reject(
              new Error("The extracted audio is not playable in this browser."),
            );
        });
        if (!mounted.current || ticket !== serial.current) return;
        windowStart.current = start;
        v.muted = true;
        setActive(t.index);
        background.current = false;
        a.currentTime = Math.max(0, v.currentTime - start);
        a.volume = current.current.volume;
        a.muted = current.current.muted;
        a.playbackRate = current.current.speed;
        buffering.current = false;
        setLoading(false);
        if (wantPlay.current) {
          await a.play();
          await v.play();
        }
      } catch (e) {
        if (mounted.current && ticket === serial.current) {
          const resume = wantPlay.current;
          restore();
          current.current.notify(
            (e as Error).message ||
              "Audio extraction failed. Original audio restored.",
            true,
          );
          if (resume) v.play().catch(() => {});
        }
      }
    },
    [video, service, chunk, restore],
  );
  const select = useCallback(
    (track: EmbeddedTrack | null, resumePlayback?: boolean) => {
      if (!track) {
        const resume = wantPlay.current;
        restore();
        if (resume) video.current?.play().catch(() => {});
        return;
      }
      selected.current = track;
      if (resumePlayback === undefined) setActive(track.index);
      windowStart.current = -1;
      const v = video.current;
      if (v) {
        if (resumePlayback === undefined) v.muted = true;
        void prepare(v.currentTime, !v.paused, resumePlayback !== undefined);
      }
    },
    [video, prepare, restore],
  );
  useEffect(() => {
    mounted.current = true;
    audio.current = new Audio();
    const v = video.current!;
    const play = () => {
      if (!selected.current) return;
      wantPlay.current = true;
      if (buffering.current) {
        if (background.current) return;
        v.pause();
        return;
      }
      void prepare(v.currentTime, true);
    };
    const pause = () => {
      if (!buffering.current || background.current) wantPlay.current = false;
      audio.current?.pause();
    };
    const seeking = () => {
      if (selected.current)
        void prepare(v.currentTime, wantPlay.current || !v.paused);
    };
    const tick = () => {
      const t = selected.current,
        a = audio.current;
      if (!t || !a || buffering.current) return;
      const elapsed = v.currentTime - windowStart.current;
      if (elapsed < 0 || elapsed >= WINDOW) {
        void prepare(v.currentTime, !v.paused);
        return;
      }
      if (Math.abs(a.currentTime - elapsed) > 0.35)
        a.currentTime = Math.max(0, elapsed);
      if (
        !v.paused &&
        WINDOW - elapsed < 25 &&
        Number.isFinite(v.duration) &&
        windowStart.current + WINDOW < v.duration
      )
        chunk(t, windowStart.current + WINDOW).catch(() => {});
    };
    v.addEventListener("play", play);
    v.addEventListener("pause", pause);
    v.addEventListener("seeking", seeking);
    v.addEventListener("timeupdate", tick);
    return () => {
      mounted.current = false;
      serial.current++;
      v.removeEventListener("play", play);
      v.removeEventListener("pause", pause);
      v.removeEventListener("seeking", seeking);
      v.removeEventListener("timeupdate", tick);
      audio.current?.pause();
      audio.current?.removeAttribute("src");
      audio.current?.load();
      if (url.current) URL.revokeObjectURL(url.current);
      cache.current.clear();
    };
  }, [video, prepare, chunk]);
  useEffect(() => {
    const a = audio.current;
    if (a) {
      a.volume = volume;
      a.muted = muted;
      a.playbackRate = speed;
    }
    if (video.current)
      video.current.muted =
        selected.current && !background.current ? true : muted;
  }, [video, volume, muted, speed]);
  return {
    active,
    loading,
    preparingInBackground: loading && background.current,
    select,
    restore,
    audio,
  };
}
