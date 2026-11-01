import { useState } from "react";
import { SkipBack, SkipForward, Play } from "lucide-react";
import type { VideoEntry, TVShow } from "../types";
import { episodeFor } from "../lib/organization";
import { title, time } from "../lib/media";
export function EpisodeBrowser({
  entry,
  videos,
  shows,
  onPlay,
}: {
  entry: VideoEntry;
  videos: VideoEntry[];
  shows: TVShow[];
  onPlay: (v: VideoEntry) => void;
}) {
  const current = episodeFor(entry, shows);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  if (!current) return null;
  const show = shows.find((s) => s.id === current.showId);
  if (!show) return null;
  const episodes = videos
    .map((v) => ({ video: v, info: episodeFor(v, shows) }))
    .filter((e) => e.info?.showId === show.id)
    .sort(
      (a, b) =>
        a.info!.season - b.info!.season ||
        (a.info!.episode ?? 9999) - (b.info!.episode ?? 9999) ||
        a.video.name.localeCompare(b.video.name, undefined, { numeric: true }),
    );
  const index = episodes.findIndex((e) => e.video.id === entry.id),
    seasons = [...new Set(episodes.map((e) => e.info!.season))],
    season = selected ?? current.season;
  return (
    <section className="episode-browser" aria-label="Show episodes">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            NOW WATCHING · SEASON {current.season}
            {current.episode ? ` · EPISODE ${current.episode}` : ""}
          </span>
          <h2>{show.name}</h2>
        </div>
        <div className="episode-navigation">
          <button
            className="button subtle"
            disabled={index <= 0}
            onClick={() => onPlay(episodes[index - 1].video)}
          >
            <SkipBack size={16} />
            Previous episode
          </button>
          <button
            className="button primary"
            disabled={index < 0 || index === episodes.length - 1}
            onClick={() => onPlay(episodes[index + 1].video)}
          >
            Next episode
            <SkipForward size={16} />
          </button>
        </div>
      </div>
      <div className="season-tabs" role="tablist" aria-label="Episode seasons">
        {seasons.map((s) => (
          <button
            role="tab"
            aria-selected={s === season}
            className={s === season ? "selected" : ""}
            key={s}
            onClick={() => setSelected(s)}
          >
            {s === 0 ? "Specials" : `Season ${s}`}
          </button>
        ))}
      </div>
      <div className="episode-list">
        {episodes
          .filter((e) => e.info!.season === season)
          .map(({ video: v, info }) => (
            <button
              className={`episode-item ${v.id === entry.id ? "current" : ""}`}
              aria-current={v.id === entry.id ? "true" : undefined}
              key={v.id}
              onClick={() => onPlay(v)}
            >
              <span className="episode-thumbnail">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" loading="lazy" />
                ) : (
                  <Play size={22} />
                )}
              </span>
              <span>
                <strong>
                  {info!.episode ? `${info!.episode}. ` : ""}
                  {title(v.name)}
                </strong>
                <small>
                  {v.id === entry.id
                    ? "Playing now"
                    : v.completed
                      ? "Watched"
                      : v.position
                        ? `Resume at ${time(v.position)}`
                        : v.duration
                          ? time(v.duration)
                          : "Not watched"}
                </small>
              </span>
              <Play size={16} />
            </button>
          ))}
      </div>
    </section>
  );
}
