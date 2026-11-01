import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Captions,
  AudioLines,
  Gauge,
  X,
  LoaderCircle,
  AlertTriangle,
  RefreshCw,
  Keyboard,
  Heart,
  ChevronDown,
  SkipBack,
  SkipForward,
  Check,
  Upload,
  Monitor,
  SlidersHorizontal,
} from "lucide-react";
import type { VideoEntry, Preferences, Cue, AudioTrack } from "../types";
import {
  PlaybackService,
  playbackError,
  time,
  title,
  resolution,
  CONVERSION_LIMIT,
  size,
  extension,
} from "../lib/media";
import { parseSubtitles } from "../lib/subtitles";
import { SubtitleAppearance, subtitleStyle } from "./SubtitleAppearance";
import { EmbeddedMediaService, trackLabel } from "../lib/embedded";
import type { EmbeddedTrack, MediaProbe } from "../lib/embedded";
import { useSegmentAudio } from "../lib/useSegmentAudio";
const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
import { TimelinePreview } from "../lib/timelinePreview";
export function Timeline({
  position,
  duration,
  onSeek,
  mediaSource,
}: {
  position: number;
  duration: number;
  onSeek: (n: number) => void;
  mediaSource?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const decoder = useRef<TimelinePreview | null>(null);
  useEffect(() => {
    const service = mediaSource ? new TimelinePreview(mediaSource) : null;
    decoder.current = service;
    setPreview(null);
    return () => {
      service?.dispose();
      decoder.current = null;
    };
  }, [mediaSource]);
  const target =
    hover === null || !Number.isFinite(duration)
      ? null
      : Math.floor((hover * duration) / 2) * 2;
  useEffect(() => {
    let active = true;
    setPending(target !== null);
    if (target === null) return;
    const cached = decoder.current?.cached(target);
    if (cached) {
      setPreview(cached);
      setPending(false);
      return;
    }
    const timer = setTimeout(() => {
      const service = decoder.current;
      if (!service) {
        setPending(false);
        return;
      }
      service
        .frame(target)
        .catch(() => null)
        .then((frame) => {
          if (active) {
            if (frame) setPreview(frame);
            setPending(false);
            if (frame) void service.prefetch(target);
          }
        });
    }, 60);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [target, mediaSource]);
  return (
    <div
      className="timeline-wrap"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      }}
    >
      {hover !== null && duration > 0 && (
        <span
          className="seek-preview"
          style={{ left: `${Math.min(94, Math.max(6, hover * 100))}%` }}
        >
          {preview ? (
            <img src={preview} alt="Nearby timeline frame" />
          ) : (
            <span className="preview-message">
              {pending ? "Loading preview…" : "Preview unavailable"}
            </span>
          )}
          <strong>{time(hover * duration)}</strong>
        </span>
      )}
      <input
        className="timeline"
        aria-label="Seek video"
        aria-valuetext={`${time(position)} of ${time(duration)}`}
        type="range"
        min="0"
        max={duration || 1}
        step="0.1"
        value={Math.min(position, duration || 1)}
        onChange={(e) => onSeek(+e.target.value)}
        style={
          {
            "--progress": `${duration ? (position / duration) * 100 : 0}%`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
export function VolumeControl({
  volume,
  muted,
  setVolume,
  toggleMute,
}: {
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}) {
  return (
    <div className="volume-control">
      <button
        className="player-button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute (M)" : "Mute (M)"}
      >
        {muted || !volume ? <VolumeX size={21} /> : <Volume2 size={21} />}
      </button>
      <input
        aria-label="Volume"
        type="range"
        min="0"
        max="1"
        step=".01"
        value={muted ? 0 : volume}
        onChange={(e) => setVolume(+e.target.value)}
      />
    </div>
  );
}
export function PlaybackSpeedMenu({
  speed,
  setSpeed,
}: {
  speed: number;
  setSpeed: (v: number) => void;
}) {
  return (
    <div className="speed-options">
      {speeds.map((s) => (
        <button
          key={s}
          className={s === speed ? "selected" : ""}
          onClick={() => setSpeed(s)}
        >
          {s}×{s === speed && <Check size={13} />}
        </button>
      ))}
    </div>
  );
}
export function SubtitleMenu({
  prefs,
  setPrefs,
  cues,
  name,
  enabled,
  setEnabled,
  delay,
  setDelay,
  onLoad,
  tracks,
  onTrack,
  selectedTrack,
  embedded = [],
  onEmbedded,
  embeddedSelected,
  inspection,
  trackBusy,
  onCancel,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  cues: Cue[];
  name: string;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  delay: number;
  setDelay: (v: number) => void;
  onLoad: () => void;
  tracks: TextTrack[];
  onTrack: (id: number) => void;
  selectedTrack: number;
  embedded?: EmbeddedTrack[];
  onEmbedded?: (track: EmbeddedTrack) => void;
  embeddedSelected?: number | null;
  inspection?: string;
  trackBusy?: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      <h3>Subtitles</h3>
      {inspection && (
        <p className="fine-print" role="status">
          {inspection}
        </p>
      )}
      {trackBusy && (
        <button className="menu-row accent" onClick={onCancel}>
          <LoaderCircle size={14} className="spin" />
          Reading embedded subtitles… Cancel
        </button>
      )}
      {embedded.map((t) => (
        <button
          className="menu-row"
          key={t.index}
          disabled={!t.supported || trackBusy}
          onClick={() => onEmbedded?.(t)}
          title={
            !t.supported
              ? "Image-based subtitles require an external SRT/VTT file."
              : trackLabel(t)
          }
        >
          {trackLabel(t)}
          {!t.supported ? (
            " · Image/unsupported"
          ) : embeddedSelected === t.index && enabled ? (
            <Check size={14} />
          ) : null}
        </button>
      ))}
      <button
        className="menu-row"
        onClick={() => {
          setEnabled(false);
          onTrack(-1);
        }}
      >
        Off{!enabled && selectedTrack < 0 && <Check size={15} />}
      </button>
      {cues.length > 0 && embeddedSelected == null && (
        <button
          className="menu-row"
          onClick={() => {
            setEnabled(true);
            onTrack(-1);
          }}
        >
          {name}
          {enabled && <Check size={15} />}
        </button>
      )}
      {tracks.map((t, i) => (
        <button
          className="menu-row"
          key={i}
          onClick={() => {
            setEnabled(false);
            onTrack(i);
          }}
        >
          {t.label || t.language || `Embedded track ${i + 1}`}
          {selectedTrack === i && <Check size={15} />}
        </button>
      ))}
      <button className="menu-row accent" onClick={onLoad}>
        <Upload size={15} />
        Load subtitle file
      </button>
      <p className="fine-print">
        SRT, VTT, ASS/SSA. ASS styling and animation are rendered as plain text.
      </p>
      <label className="player-setting">
        Size
        <select
          value={prefs.subtitleSize}
          onChange={(e) =>
            setPrefs({ ...prefs, subtitleSize: +e.target.value })
          }
        >
          {[16, 20, 24, 28, 32, 40].map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
      </label>
      <label className="player-setting">
        Color
        <input
          aria-label="Subtitle color"
          type="color"
          value={prefs.subtitleColor}
          onChange={(e) =>
            setPrefs({ ...prefs, subtitleColor: e.target.value })
          }
        />
      </label>
      <label className="player-setting">
        Background
        <input
          type="checkbox"
          checked={prefs.subtitleBackground}
          onChange={(e) =>
            setPrefs({ ...prefs, subtitleBackground: e.target.checked })
          }
        />
      </label>
      <label className="player-setting">
        Position
        <select
          value={prefs.subtitlePosition}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              subtitlePosition: e.target.value as "top" | "bottom",
            })
          }
        >
          <option value="bottom">Bottom</option>
          <option value="top">Top</option>
        </select>
      </label>
      {cues.length > 0 && (
        <label className="player-setting">
          Timing offset (s)
          <input
            aria-label="Subtitle timing offset"
            type="number"
            min="-120"
            max="120"
            step=".25"
            value={delay}
            onChange={(e) =>
              setDelay(Math.max(-120, Math.min(120, +e.target.value)))
            }
          />
        </label>
      )}
      <p className="fine-print">
        Positive offset shows subtitles later. Embedded text tracks use the same
        timing offset when extracted locally.
      </p>
      <SubtitleAppearance prefs={prefs} setPrefs={setPrefs} />
    </>
  );
}
export function AudioTrackMenu({
  tracks,
  onSelect,
  onOutput,
  canOutput,
  embedded = [],
  selectedEmbedded,
  onEmbedded,
  inspection,
  loading,
  onCancel,
}: {
  tracks: AudioTrack[];
  onSelect: (id: string) => void;
  onOutput: () => void;
  canOutput: boolean;
  embedded?: EmbeddedTrack[];
  selectedEmbedded?: number | null;
  onEmbedded?: (track: EmbeddedTrack | null) => void;
  inspection?: string;
  loading?: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      <h3>Audio</h3>
      {inspection && (
        <p className="fine-print" role="status">
          {inspection}
        </p>
      )}
      {!!embedded.length && (
        <>
          <button className="menu-row" onClick={() => onEmbedded?.(null)}>
            Original audio (browser)
            {selectedEmbedded == null && <Check size={14} />}
          </button>
          {embedded.map((t) => (
            <button
              className="menu-row"
              key={t.index}
              disabled={!t.supported}
              onClick={() => onEmbedded?.(t)}
            >
              {trackLabel(t)}
              {selectedEmbedded === t.index && <Check size={14} />}
            </button>
          ))}
          <p className="fine-print">
            Alternate audio is decoded locally in 2-minute windows. Seeking may
            briefly buffer. Output is stereo AAC; the original track is
            untouched.
          </p>
        </>
      )}
      {loading && (
        <button className="menu-row accent" onClick={onCancel}>
          <LoaderCircle size={14} className="spin" />
          Preparing audio… Cancel
        </button>
      )}
      {tracks.length ? (
        tracks.map((t) => (
          <button
            className="menu-row"
            key={t.id}
            onClick={() => onSelect(t.id)}
          >
            {t.label || t.language || "Audio track"}
            {t.enabled && <Check size={14} />}
          </button>
        ))
      ) : !embedded.length && !inspection ? (
        <p className="fine-print">
          Your browser does not expose selectable audio tracks for this video.
          The default audio will play. Embedded track switching may require a
          desktop player.
        </p>
      ) : null}
      {canOutput && (
        <button className="menu-row" onClick={onOutput}>
          <Monitor size={15} />
          Choose audio output
        </button>
      )}
      <p className="fine-print">
        Audio delay and normalization are unavailable in the native playback
        pipeline.
      </p>
    </>
  );
}
export function PlayerControls({
  playing,
  toggle,
  seek,
  position,
  duration,
  volume,
  muted,
  setVolume,
  toggleMute,
  speed,
  menu,
  setMenu,
  fullscreen,
  toggleFullscreen,
  pip,
  canPip,
  mediaSource,
}: {
  playing: boolean;
  toggle: () => void;
  seek: (s: number) => void;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  speed: number;
  menu: string | null;
  setMenu: (s: string | null) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  pip: () => void;
  canPip: boolean;
  mediaSource?: string;
}) {
  return (
    <div className="player-controls">
      <Timeline
        position={position}
        duration={duration}
        onSeek={seek}
        mediaSource={mediaSource}
      />
      <div className="controls-bottom">
        <div className="control-group">
          <button
            className="player-button main-play"
            aria-label={playing ? "Pause (Space)" : "Play (Space)"}
            onClick={toggle}
          >
            {playing ? (
              <Pause size={25} fill="currentColor" />
            ) : (
              <Play size={25} fill="currentColor" />
            )}
          </button>
          <button
            className="player-button"
            aria-label="Rewind 10 seconds (J)"
            onClick={() => seek(position - 10)}
          >
            <RotateCcw size={21} />
            <small>10</small>
          </button>
          <button
            className="player-button"
            aria-label="Forward 10 seconds (L)"
            onClick={() => seek(position + 10)}
          >
            <RotateCw size={21} />
            <small>10</small>
          </button>
          <VolumeControl
            volume={volume}
            muted={muted}
            setVolume={setVolume}
            toggleMute={toggleMute}
          />
          <span className="player-time">
            {time(position)}
            <i>/</i>
            <span>{time(duration)}</span>
          </span>
        </div>
        <div className="control-group">
          <button
            className={`player-button speed-button ${menu === "speed" ? "active" : ""}`}
            title="Playback speed"
            aria-label="Playback speed"
            onClick={() => setMenu(menu === "speed" ? null : "speed")}
          >
            {speed}×
          </button>
          <button
            className={`player-button ${menu === "subtitles" ? "active" : ""}`}
            aria-label="Subtitles"
            onClick={() => setMenu(menu === "subtitles" ? null : "subtitles")}
          >
            <Captions size={23} />
          </button>
          <button
            className={`player-button ${menu === "audio" ? "active" : ""}`}
            aria-label="Audio tracks"
            onClick={() => setMenu(menu === "audio" ? null : "audio")}
          >
            <AudioLines size={21} />
          </button>
          <button
            className={`player-button ${menu === "settings" ? "active" : ""}`}
            aria-label="Playback settings"
            onClick={() => setMenu(menu === "settings" ? null : "settings")}
          >
            <SlidersHorizontal size={20} />
          </button>
          {canPip && (
            <button
              className="player-button pip-button"
              aria-label="Picture in picture"
              onClick={pip}
            >
              <PictureInPicture2 size={21} />
            </button>
          )}
          <button
            className="player-button"
            aria-label="Toggle fullscreen (F)"
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
export default function VideoPlayer({
  entry,
  file,
  prefs,
  setPrefs,
  onSave,
  onClose,
  onFavorite,
  notify,
  children,
}: {
  entry: VideoEntry;
  file: File;
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  onSave: (patch: Partial<VideoEntry>) => void;
  onClose: () => void;
  onFavorite: () => void;
  notify: (message: string, error?: boolean) => void;
  children?: React.ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stage = useRef<HTMLDivElement>(null),
    service = useRef(new PlaybackService()),
    subtitleInput = useRef<HTMLInputElement>(null),
    lastSave = useRef(0),
    alive = useRef(true),
    originalResume = useRef(entry.completed ? 0 : entry.position),
    pendingStart = useRef(true);
  const embeddedService = useRef<EmbeddedMediaService | null>(null);
  const callbacks = useRef({ onSave, onClose, notify, prefs });
  callbacks.current = { onSave, onClose, notify, prefs };
  const [src, setSrc] = useState(""),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(entry.duration),
    [volume, setVolumeState] = useState(prefs.volume),
    [muted, setMuted] = useState(false),
    [speed, setSpeedState] = useState(entry.speed || prefs.speed),
    [fullscreen, setFullscreen] = useState(false),
    [visible, setVisible] = useState(true),
    [menu, setMenu] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [conversion, setConversion] = useState<{
      n: number;
      message: string;
    } | null>(null),
    [converted, setConverted] = useState(false),
    [showResume, setShowResume] = useState(
      !prefs.autoResume && originalResume.current > 5,
    ),
    [resumeNote, setResumeNote] = useState(
      prefs.autoResume && originalResume.current > 5,
    ),
    [cues, setCues] = useState<Cue[]>([]),
    [subtitleName, setSubtitleName] = useState(""),
    [subEnabled, setSubEnabled] = useState(false),
    [delay, setDelay] = useState(0),
    [tracks, setTracks] = useState<TextTrack[]>([]),
    [trackIndex, setTrackIndex] = useState(-1),
    [audio, setAudio] = useState<AudioTrack[]>([]),
    [waiting, setWaiting] = useState(true),
    [hints, setHints] = useState(false);
  const [probe, setProbe] = useState<MediaProbe | null>(null),
    [inspection, setInspection] = useState(
      "Inspecting embedded tracks locally…",
    ),
    [subtitleBusy, setSubtitleBusy] = useState(false),
    [embeddedSubtitle, setEmbeddedSubtitle] = useState<number | null>(null);
  const subtitleRequest = useRef(0);
  const segmentAudio = useSegmentAudio(
    video,
    embeddedService,
    volume,
    muted,
    speed,
    notify,
  );
  useEffect(() => {
    let cancelled = false;
    const engine = new EmbeddedMediaService(file);
    embeddedService.current = engine;
    setInspection("Inspecting embedded tracks locally…");
    setProbe(null);
    engine
      .probe()
      .then((result) => {
        if (cancelled) return;
        setProbe(result);
        setInspection("");
        if (result.width && result.height)
          callbacks.current.onSave({
            sourceWidth: result.width,
            sourceHeight: result.height,
          });
      })
      .catch(() => {
        if (!cancelled)
          setInspection(
            "Local track inspection failed. Browser-exposed tracks and external subtitles are still available.",
          );
      });
    return () => {
      cancelled = true;
      subtitleRequest.current++;
      engine.dispose();
    };
  }, [file]);
  const loadEmbeddedSubtitle = async (track: EmbeddedTrack) => {
    const request = ++subtitleRequest.current;
    setSubtitleBusy(true);
    try {
      const parsed = await embeddedService.current!.subtitles(track);
      if (!alive.current || request !== subtitleRequest.current) return;
      setCues(parsed);
      setSubtitleName(trackLabel(track));
      setEmbeddedSubtitle(track.index);
      setSubEnabled(true);
      selectTrack(-1);
    } catch (e) {
      if (alive.current && request === subtitleRequest.current)
        notify(
          (e as Error).message || "Embedded subtitle extraction failed.",
          true,
        );
    } finally {
      if (alive.current && request === subtitleRequest.current)
        setSubtitleBusy(false);
    }
  };
  const cancelTracks = () => {
    subtitleRequest.current++;
    setSubtitleBusy(false);
    segmentAudio.restore();
    embeddedService.current?.dispose();
  };
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const save = useCallback(() => {
    const v = video.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0)
      callbacks.current.onSave({
        position: v.currentTime,
        duration: v.duration,
        width: v.videoWidth,
        height: v.videoHeight,
        lastPlayed: Date.now(),
        speed: v.playbackRate,
        completed: v.currentTime / v.duration >= 0.95,
      });
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    stage.current?.focus();
    const hidden = () => {
      if (document.hidden) save();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", save);
    return () => {
      document.body.style.overflow = prior;
      previous?.focus();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", save);
    };
  }, [save]);
  useEffect(() => {
    alive.current = true;
    const engine = service.current;
    setSrc(engine.open(file));
    return () => {
      alive.current = false;
      save();
      engine.cancel();
      engine.release();
      clearTimeout(hideTimer.current);
    };
  }, [file, save]);
  useEffect(() => {
    const v = video.current;
    if (v) {
      v.volume = volume;
      v.muted = segmentAudio.active !== null ? true : muted;
      v.playbackRate = speed;
    }
  }, [src, volume, muted, speed, segmentAudio.active]);
  const wake = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (video.current && !video.current.paused) setVisible(false);
    }, 3000);
  }, []);
  useEffect(() => {
    wake();
  }, [playing, menu, wake]);
  const safePlay = useCallback(() => {
    video.current?.play().catch((e: DOMException) => {
      if (e.name !== "AbortError" && e.name !== "NotSupportedError")
        callbacks.current.notify("Press play to start playback.");
    });
  }, []);
  const toggle = useCallback(() => {
    const v = video.current;
    if (!v || showResume) return;
    if (v.paused) safePlay();
    else v.pause();
    wake();
  }, [safePlay, showResume, wake]);
  const seek = useCallback(
    (s: number) => {
      const v = video.current;
      if (v && Number.isFinite(v.duration)) {
        v.currentTime = Math.max(0, Math.min(v.duration, s));
        setPosition(v.currentTime);
        wake();
      }
    },
    [wake],
  );
  const changeVolume = useCallback((n: number) => {
    setVolumeState(Math.max(0, Math.min(1, n)));
    setMuted(false);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (stage.current?.requestFullscreen)
      stage.current
        .requestFullscreen()
        .catch(() =>
          callbacks.current.notify(
            "Fullscreen is unavailable in this browser.",
            true,
          ),
        );
    else if ((video.current as any)?.webkitEnterFullscreen)
      (video.current as any).webkitEnterFullscreen();
    else
      callbacks.current.notify(
        "Fullscreen is unavailable in this browser.",
        true,
      );
  }, []);
  useEffect(() => {
    const f = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (hints) {
        if (e.key === "Escape") {
          e.preventDefault();
          setHints(false);
        }
        return;
      }
      if (
        (e.target as HTMLElement).closest(
          'input,select,textarea,[role="dialog"]:not(.player-shell)',
        )
      )
        return;
      if (e.key === " " && (e.target as HTMLElement).closest("button")) return;
      const v = video.current;
      if (!v) return;
      let handled = true;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          toggle();
          break;
        case "arrowleft":
          seek(v.currentTime - 5);
          break;
        case "arrowright":
          seek(v.currentTime + 5);
          break;
        case "j":
          seek(v.currentTime - 10);
          break;
        case "l":
          seek(v.currentTime + 10);
          break;
        case "arrowup":
          changeVolume(v.volume + 0.05);
          break;
        case "arrowdown":
          changeVolume(v.volume - 0.05);
          break;
        case "m":
          setMuted((x) => !x);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "home":
          seek(0);
          break;
        case "end":
          seek(v.duration);
          break;
        case ",":
          v.pause();
          seek(v.currentTime - 1 / 30);
          break;
        case ".":
          v.pause();
          seek(v.currentTime + 1 / 30);
          break;
        case "escape":
          if (menu) setMenu(null);
          else if (!document.fullscreenElement) {
            save();
            callbacks.current.onClose();
          }
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
        wake();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [toggle, seek, changeVolume, toggleFullscreen, save, wake, menu, hints]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const refresh = () => {
      const ts = Array.from(v.textTracks).filter(
        (t) => t.kind === "subtitles" || t.kind === "captions",
      );
      setTracks(ts);
      const wanted = ts.findIndex(
        (t) => t.language === callbacks.current.prefs.subtitleLanguage,
      );
      if (wanted >= 0 && trackIndex < 0) {
        ts.forEach((t, i) => (t.mode = i === wanted ? "showing" : "disabled"));
        setTrackIndex(wanted);
      }
      const a = (v as any).audioTracks;
      setAudio(
        a
          ? Array.from(a as ArrayLike<AudioTrack>).map((t, i) => ({
              id: String(i),
              label: t.label,
              language: t.language,
              enabled: t.enabled,
            }))
          : [],
      );
    };
    v.textTracks.addEventListener("addtrack", refresh);
    v.addEventListener("loadeddata", refresh);
    refresh();
    return () => {
      v.textTracks.removeEventListener("addtrack", refresh);
      v.removeEventListener("loadeddata", refresh);
    };
  }, [src]);
  const selectTrack = (index: number) => {
    tracks.forEach((t, i) => (t.mode = i === index ? "showing" : "disabled"));
    setTrackIndex(index);
  };
  const loadSub = async (f: File) => {
    try {
      if (f.size > 5 * 1024 * 1024)
        throw new Error("Subtitle files must be under 5 MB.");
      const parsed = parseSubtitles(await f.text(), extension(f.name));
      setCues(parsed);
      setSubtitleName(f.name);
      setEmbeddedSubtitle(null);
      setSubEnabled(true);
      selectTrack(-1);
      setMenu(null);
      if (["ass", "ssa"].includes(extension(f.name)))
        notify(
          "ASS/SSA loaded as plain text; advanced styling is not supported.",
        );
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const convert = async (mode: "remux" | "transcode") => {
    if (busy) return;
    segmentAudio.restore();
    video.current?.pause();
    setBusy(true);
    setConversion({ n: 0, message: "Preparing compatibility engine…" });
    try {
      const blob = await service.current.convert(file, mode, (n, message) => {
        if (alive.current) setConversion({ n, message });
      });
      if (!alive.current) return;
      setError("");
      setConverted(true);
      pendingStart.current = true;
      setSrc(service.current.open(blob));
      setWaiting(true);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) {
        setBusy(false);
        setConversion(null);
      }
    }
  };
  const pip = async () => {
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else await video.current?.requestPictureInPicture();
    } catch {
      notify("Picture in picture is unavailable for this video.", true);
    }
  };
  const output = async () => {
    try {
      const device = await (navigator.mediaDevices as any).selectAudioOutput();
      await (video.current as any).setSinkId(device.deviceId);
      if (
        segmentAudio.audio.current &&
        "setSinkId" in segmentAudio.audio.current
      )
        await (segmentAudio.audio.current as any).setSinkId(device.deviceId);
      notify("Audio output updated.");
    } catch {
      notify("Audio output selection was cancelled or denied.", true);
    }
  };
  const activeCues = subEnabled
    ? cues.filter(
        (c) => position - delay >= c.start && position - delay < c.end,
      )
    : [];
  const close = () => {
    save();
    video.current?.pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  };
  return (
    <div
      className="player-shell"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${entry.name}`}
    >
      <header className="player-header">
        <button className="button subtle" onClick={close}>
          <ArrowLeft size={18} />
          <span>Back to library</span>
        </button>
        <span className="player-wordmark">
          CINEVAULT <i>/</i> NOW PLAYING
        </span>
        <button
          className={`icon-button ${entry.favorite ? "accent" : ""}`}
          onClick={onFavorite}
          aria-label="Toggle favorite"
        >
          <Heart size={20} fill={entry.favorite ? "currentColor" : "none"} />
        </button>
      </header>
      <div
        ref={stage}
        className={`player-stage ${visible || !playing || menu ? "controls-visible" : "controls-hidden"}`}
        onMouseMove={wake}
        onTouchStart={wake}
        onDoubleClick={(e) => {
          if (
            !(e.target as HTMLElement).closest("button,input,.player-popover")
          )
            toggleFullscreen();
        }}
        tabIndex={0}
        style={
          {
            ...subtitleStyle(prefs),
          } as React.CSSProperties
        }
      >
        <video
          ref={video}
          src={src || undefined}
          playsInline
          preload="metadata"
          onClick={toggle}
          onLoadedMetadata={() => {
            const v = video.current!;
            setDuration(v.duration);
            setWaiting(false);
            onSave({
              duration: v.duration,
              width: v.videoWidth,
              height: v.videoHeight,
            });
            if (pendingStart.current) {
              pendingStart.current = false;
              if (prefs.autoResume && originalResume.current > 0)
                v.currentTime = Math.min(originalResume.current, v.duration);
              if (!showResume) safePlay();
            }
          }}
          onTimeUpdate={() => {
            const v = video.current!;
            setPosition(v.currentTime);
            if (Date.now() - lastSave.current > 5000) {
              lastSave.current = Date.now();
              save();
            }
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            save();
          }}
          onEnded={() => {
            setPlaying(false);
            save();
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onError={() => {
            setWaiting(false);
            setError(playbackError(video.current?.error));
          }}
        />
        {(waiting || segmentAudio.loading) && !error && !busy && (
          <div className="video-wait">
            <LoaderCircle className="spin" size={35} />
            <span>
              {segmentAudio.loading
                ? "Preparing selected audio locally…"
                : "Opening your video…"}
            </span>
          </div>
        )}
        {!playing && !waiting && !error && !busy && !showResume && (
          <button
            className="center-play"
            onClick={toggle}
            aria-label="Play video"
          >
            <Play size={32} fill="currentColor" />
          </button>
        )}
        {activeCues.length > 0 && (
          <div
            className={`subtitle-overlay ${prefs.subtitlePosition === "top" ? "top" : ""}`}
          >
            <span>{activeCues.map((c) => c.text).join("\n")}</span>
          </div>
        )}
        {resumeNote && !error && !showResume && (
          <div className="resume-note">
            <RefreshCw size={15} />
            <span>Resumed at {time(originalResume.current)}</span>
            <button
              onClick={() => {
                seek(0);
                setResumeNote(false);
              }}
            >
              Start over
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss resume message"
              onClick={() => setResumeNote(false)}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {showResume && !error && (
          <div className="resume-prompt">
            <RefreshCw size={27} />
            <h2>Welcome back.</h2>
            <p>Continue from {time(originalResume.current)}?</p>
            <div>
              <button
                className="button primary"
                onClick={() => {
                  seek(originalResume.current);
                  setShowResume(false);
                  safePlay();
                }}
              >
                Resume playback
              </button>
              <button
                className="button subtle"
                onClick={() => {
                  seek(0);
                  setShowResume(false);
                  safePlay();
                }}
              >
                Start over
              </button>
            </div>
          </div>
        )}
        {(error || busy) && (
          <div className="playback-error">
            {busy ? (
              <LoaderCircle className="spin" size={32} />
            ) : (
              <AlertTriangle size={31} />
            )}
            <h2>
              {busy
                ? "Making it play beautifully."
                : "This video needs a little help."}
            </h2>
            <p>{busy ? conversion?.message : error}</p>
            {busy ? (
              <>
                <progress max="1" value={conversion?.n || 0} />
                <span>
                  {Math.round((conversion?.n || 0) * 100)}% · Keep this tab open
                </span>
                <button
                  className="button subtle"
                  onClick={() => service.current.cancel()}
                >
                  Cancel conversion
                </button>
              </>
            ) : (
              <>
                <div className="conversion-options">
                  {file.size <= CONVERSION_LIMIT && (
                    <>
                      <button
                        className="button primary"
                        onClick={() => convert("remux")}
                      >
                        <RefreshCw size={16} />
                        Repackage as MP4
                      </button>
                      <button
                        className="button subtle"
                        onClick={() => convert("transcode")}
                      >
                        Full conversion
                      </button>
                    </>
                  )}
                  <button
                    className="button subtle"
                    onClick={() => {
                      setError("");
                      video.current?.load();
                    }}
                  >
                    Retry native playback
                  </button>
                </div>
                <p className="fine-print">
                  {file.size > CONVERSION_LIMIT
                    ? `This file is ${size(file.size)}. Local conversion is limited to 256 MB. Convert large movies to H.264/AAC MP4 with a desktop tool.`
                    : "Conversion runs locally and temporarily uses browser memory. Repackaging preserves video quality; full conversion uses H.264/AAC, up to 1080p. Some codecs cannot be converted. Your original stays untouched."}
                </p>
              </>
            )}
          </div>
        )}
        <div className="stage-title">
          <span className="eyebrow">NOW PLAYING</span>
          <h2>{title(entry.name)}</h2>
        </div>
        {menu && (
          <div className="player-popover">
            <button
              className="popover-close icon-button"
              onClick={() => setMenu(null)}
              aria-label="Close playback menu"
            >
              <X size={16} />
            </button>
            {menu === "speed" && (
              <>
                <h3>
                  <Gauge size={16} />
                  Playback speed
                </h3>
                <PlaybackSpeedMenu
                  speed={speed}
                  setSpeed={(s) => {
                    setSpeedState(s);
                    setMenu(null);
                  }}
                />
              </>
            )}
            {menu === "subtitles" && (
              <SubtitleMenu
                prefs={prefs}
                setPrefs={setPrefs}
                cues={cues}
                name={subtitleName}
                enabled={subEnabled}
                setEnabled={(enabled) => {
                  if (!enabled) {
                    subtitleRequest.current++;
                    setSubtitleBusy(false);
                  }
                  setSubEnabled(enabled);
                }}
                delay={delay}
                setDelay={setDelay}
                onLoad={() => subtitleInput.current?.click()}
                tracks={tracks}
                selectedTrack={trackIndex}
                onTrack={selectTrack}
                embedded={probe?.tracks.filter((t) => t.type === "subtitle")}
                onEmbedded={loadEmbeddedSubtitle}
                embeddedSelected={embeddedSubtitle}
                inspection={inspection}
                trackBusy={subtitleBusy}
                onCancel={cancelTracks}
              />
            )}
            {menu === "audio" && (
              <AudioTrackMenu
                tracks={audio}
                embedded={
                  !audio.length
                    ? probe?.tracks.filter((t) => t.type === "audio")
                    : []
                }
                selectedEmbedded={segmentAudio.active}
                onEmbedded={segmentAudio.select}
                inspection={inspection}
                loading={segmentAudio.loading}
                onCancel={cancelTracks}
                onSelect={(id) => {
                  const a = (video.current as any)?.audioTracks;
                  if (a) {
                    for (let i = 0; i < a.length; i++)
                      a[i].enabled = String(i) === id;
                    setAudio((prev) =>
                      prev.map((t) => ({ ...t, enabled: t.id === id })),
                    );
                  }
                }}
                onOutput={output}
                canOutput={
                  !!(navigator.mediaDevices as any)?.selectAudioOutput &&
                  "setSinkId" in HTMLMediaElement.prototype
                }
              />
            )}
            {menu === "settings" && (
              <>
                <h3>Playback details</h3>
                <div className="player-setting">
                  <span>Source</span>
                  <strong>
                    {converted ? "Converted MP4" : entry.format.toUpperCase()}
                  </strong>
                </div>
                <div className="player-setting">
                  <span>Resolution</span>
                  <strong>
                    {video.current?.videoWidth
                      ? `${video.current.videoWidth} × ${video.current.videoHeight}`
                      : resolution(entry)}
                  </strong>
                </div>
                <div className="player-setting">
                  <span>Engine</span>
                  <strong>HTML5 Video</strong>
                </div>
                <div className="frame-controls">
                  <button
                    className="button subtle"
                    onClick={() => {
                      video.current?.pause();
                      seek(position - 1 / 30);
                    }}
                  >
                    <SkipBack size={15} />
                    Frame
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => {
                      video.current?.pause();
                      seek(position + 1 / 30);
                    }}
                  >
                    Frame
                    <SkipForward size={15} />
                  </button>
                </div>
                <p className="fine-print">
                  Frame steps use an approximate 30 fps interval. Exact frame
                  navigation varies by codec.
                </p>
                <button
                  className="menu-row"
                  onClick={() => {
                    setHints(true);
                    setMenu(null);
                  }}
                >
                  <Keyboard size={16} />
                  Keyboard shortcuts
                </button>
              </>
            )}
          </div>
        )}
        <PlayerControls
          playing={playing}
          toggle={toggle}
          seek={seek}
          position={position}
          duration={duration}
          volume={volume}
          muted={muted}
          setVolume={changeVolume}
          toggleMute={() => setMuted((v) => !v)}
          speed={speed}
          menu={menu}
          setMenu={setMenu}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          pip={pip}
          canPip={!!document.pictureInPictureEnabled}
          mediaSource={src}
        />
      </div>
      <div className="now-playing-info">
        <div>
          <div className="now-playing-tag">
            <span />
            YOUR PRIVATE SCREENING
          </div>
          <h1>{title(entry.name)}</h1>
          <p>
            <span>{entry.format.toUpperCase()}</span>
            <i />
            {duration ? time(duration) : "Duration unknown"}
            <i />
            {size(entry.size)}
            {entry.height > 0 && (
              <>
                <i />
                {resolution(entry)}
              </>
            )}
            <span className="local-pill">LOCAL FILE</span>
          </p>
        </div>
        <button className="button subtle" onClick={() => setHints(true)}>
          <Keyboard size={17} />
          <span>Keyboard shortcuts</span>
          <ChevronDown size={14} />
        </button>
      </div>
      {children}
      <input
        type="file"
        hidden
        ref={subtitleInput}
        accept=".srt,.vtt,.ass,.ssa"
        onChange={(e) => {
          if (e.target.files?.[0]) void loadSub(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {hints && (
        <div className="shortcut-backdrop" onClick={() => setHints(false)}>
          <div className="shortcut-dialog" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Stay in the story.</h2>
              <button
                className="icon-button"
                onClick={() => setHints(false)}
                aria-label="Close shortcuts"
              >
                <X />
              </button>
            </header>
            <p>Keep your hands on the keyboard.</p>
            <div className="shortcut-grid">
              {[
                ["Space / K", "Play / pause"],
                ["← / →", "Seek 5 seconds"],
                ["J / L", "Seek 10 seconds"],
                ["↑ / ↓", "Adjust volume"],
                ["M", "Mute / unmute"],
                ["F", "Fullscreen"],
                ["Escape", "Exit fullscreen / player"],
                ["Home / End", "Beginning / end"],
                [", / .", "Approximate frame step"],
              ].map(([k, d]) => (
                <div key={k}>
                  <span>{d}</span>
                  <kbd>{k}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
