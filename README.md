# CineVault

A private, local-first cinema for your browser. React + TypeScript, Tailwind CSS, HTML5 Video, IndexedDB, and an optional, self-hosted FFmpeg.wasm engine. Includes an original CineVault app icon and a responsive midnight/daylight interface.

## Run locally

Install Node.js 22.12+ (Node 24 recommended), then:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173** in Chrome, Edge, or Firefox. Use the same address and port each time to keep access to the same browser library. Use localhost/HTTPS, not `file://`; file system APIs require a secure context. No backend, account, API key, or cloud storage is required. Dependencies are downloaded during installation; normal playback and conversion use local assets only.

## Production

```sh
npm run build
npm run preview
```

The production application is in `dist/`. Serve that folder with any static HTTP server. FFmpeg’s approximately 32 MB WASM asset is included in the build. The local engine loads when a video opens to inspect embedded tracks, and is also used for requested track extraction and compatibility conversion. The single-thread engine does not require cross-origin isolation. For deployment at a subpath, preserve the folder structure. No media is sent to the static server.

## Use

- **Import** individual/multiple video files, connect a folder (recursive), or drop video files on the application. In Chrome/Edge, selected file and folder handles are saved in IndexedDB. The browser may require renewed read permission. In browsers without the pickers, standard file and directory inputs are used.
- **Folder library:** folders appear above videos. Open a root folder, then its subfolders, to see the videos directly in that location. Breadcrumbs navigate back up. Search and history/favorite collections can span folders. Connect once, then use Settings → reconnect/scan beside a folder to restore permission and find new videos. **For folders imported by an older version, reconnect and scan once to rebuild their subfolder paths**; previous versions did not store relative paths. Scanning is explicit; there is no filesystem watcher. A disconnected, renamed, moved, or changed file needs reconnecting/reimporting. Files with identical name, size, and modification date are deduplicated. Empty folders are recorded by the native picker; standard directory inputs can only infer directories containing selected files.
- **Privacy:** video bytes stay on the device; no analytics, accounts, CDNs, external fonts, or media services. IndexedDB contains metadata, cached thumbnails, playlists, history, and file handles where supported. File objects from fallback inputs are kept only for the current session. Reconnect original files after reload; saved positions survive. LocalStorage contains preferences only. No copies of entire movies are persisted.
- **Organize:** filename search, format/resolution filters, name/date/duration/size sorting, grid/list view, favorites, playlists (create/rename/delete/add/remove), video details, custom thumbnails, and library removal without deleting originals. Cached previews are generated sequentially and reused. Unsupported files remain in the library with unknown metadata until playable.
- **Resume:** position, last played date, speed, and completion state save every five seconds, on pause, and when leaving the player. Resume automatically or enable a resume/restart prompt in Settings. Playback at 95% or later marks a video watched. Fully watched entries start over on their next opening. Closing the OS/browser abruptly may lose the final few seconds.
- **Continue Watching:** a video's menu can remove it from the row; use Clear all on Home or Clear Continue Watching on its dedicated page to hide all entries. Hiding keeps saved resume positions, library membership, favorites, and history. Playing a hidden video again brings it back. Clear playback history in Settings additionally resets watch positions.
- **TV shows:** use TV Shows → Create TV show, a folder's TV icon / Organize as TV show action, or a video's menu → Organize as TV episode. `Season 1`, `Season 2`, and `S01` subfolders are suggested as season mappings. Edit a show's name, add/remove folder mappings, or change season numbers through Edit show & season folders. Nested folders inherit their mapping; the most specific mapping wins. Individual show/season/episode assignments override folder mappings. Season 0 is for specials. These are library assignments, not physical file moves or directory renames. Existing entries migrate to IndexedDB v2 without being cleared.
- **Subtitles:** load UTF-8 SRT, WebVTT, ASS, or SSA, or select an embedded text subtitle in the player menu. Local FFprobe inspects embedded streams even when the browser exposes no tracks. SRT/SubRip, WebVTT, ASS/SSA and MP4 `mov_text` tracks can be extracted to WebVTT using a read-only WORKERFS file mount. Cues render as safe text with font size/color/background/position and ±120 second timing offset. ASS/SSA override tags, animations, fonts, and complex styling are not supported; text and timing are preserved. PGS, VobSub, DVB and other image-based/unsupported tracks are listed with an explanation and disabled; use external SRT/VTT or a desktop renderer. Extraction scans the file, can take time on large movies, and can be cancelled. Subtitle output is capped at 10 MB, with at most three extracted tracks cached per open video. Appearance/language preferences persist; loaded/extracted cues are session-local.
- **Audio:** use native track switching where the browser exposes it. Otherwise, the menu lists the file's probed audio streams with language, codec and title. Select a stream to decode stereo AAC locally in **120-second windows**, synchronized with video play/pause, seeking, volume/mute and playback speed. At most three windows are cached, each bounded to 8 MB output, with prefetch near window boundaries. Seeking to an uncached part may briefly pause for decoding. Revert to Original audio (browser) at any time; failed decoding restores original audio. The source file is mounted read-only without copying the entire movie into WASM memory. Unsupported codecs, encrypted/damaged media, browser/WASM file-size limits or insufficient memory can still prevent extraction. Output selection appears only when `selectAudioOutput` and `setSinkId` are supported. Normalization and independent audio delay are unavailable.
- **Resolution:** quality buckets consider both source dimensions: 1920×800 → 1080p class, 3840×1600 → 4K class, 1280×544 → 720p class. Video details show exact dimensions. The original source dimensions are retained independently of a temporary downscaled compatibility output. Filename claims never override measured dimensions.
- **Appearance:** Daylight changes the page, text, cards, inputs and navigation together. Accent colors also update the CineVault mark, favicon, hero artwork, and subtle background tints. The screening room remains dark for playback.
- **Player:** seek, volume/mute, ten playback rates from 0.25×–3×, fullscreen, double-click fullscreen, picture in picture where supported, approximate frame stepping, auto-hiding controls, and keyboard hints. Seek hover shows the cached poster and target time; it does not decode a separate preview frame for every point. Source resolution is informational, not a fake quality selector. Skip-intro is omitted because local files do not provide reliable intro markers.

## Format compatibility and MKV

Recognized containers: MP4, MKV, AVI, MOV, WebM, M4V, MPEG, MPG, WMV, FLV, 3GP, TS, MTS, M2TS, OGV. Recognition is **not** a promise of playback. The actual HTML5 media decoder is tried first; decode errors offer useful recovery actions. Codec support differs across browsers, operating systems, and devices.

MP4 with H.264 video/AAC audio and WebM with VP8/VP9/Opus generally have the broadest support. MKV is important but is not universally supported. Native playback is attempted without reading the movie into JavaScript memory. If it fails:

1. **Repackage as MP4:** copies the first video track and encodes the first audio track to AAC. Fast and lossless for supported video codecs. Not every MKV codec can be put into a playable MP4.
2. **Full conversion:** first video/audio tracks → H.264, AAC, YUV420p, max width 1920, MP4. This is slower and changes quality. Additional audio/subtitle tracks are not muxed into the temporary output, but remain selectable from the read-only original through the embedded-track service.

Conversion is opt-in and limited to **256 MB input**, with a ten-minute execution timeout and a cancel action. This is a conservative input limit, **not** a guarantee that every device has enough memory. FFmpeg’s memory filesystem copies input/output and decoding needs additional RAM. Large local movies still play natively with object URLs when their codecs are supported; large incompatible files should be converted with desktop FFmpeg/HandBrake or played in VLC. Encrypted, corrupted, unusual codecs and low-memory devices may fail. Temporary conversion data and the worker are released afterward; output is not cached across sessions. Original files are never modified.

## Architecture

```text
src/
  App.tsx                    Library coordinator, import queue, file permissions
  types.ts                   Shared library, playlist, folder, settings types
  components/
    Navigation.tsx           AppSidebar, TopNavigation, SearchBar
    Library.tsx              VideoLibrary, VideoCard, VideoGrid, VideoList,
                             Hero, ContinueWatching, RecentlyPlayed,
                             VideoDetails, PlaylistManager
    VideoPlayer.tsx          VideoPlayer, PlayerControls, Timeline,
                             VolumeControl, PlaybackSpeedMenu,
                             SubtitleMenu, AudioTrackMenu
    ImportDialog.tsx         Privacy-aware file/folder entry points
    SettingsPage.tsx         Appearance, playback, subtitles, library, storage
    FolderBrowser.tsx        Folder-first browsing, breadcrumbs, show actions
    TVShows.tsx              Show collections, season folders, episode editing
    UI.tsx                   Modal, ToastNotifications, LoadingIndicator,
                             ErrorDialog, shared primitives
  lib/
    media.ts                 PlaybackService, native probing, cached previews,
                             container recognition, FFmpeg conversion lifecycle
    storage.ts               IndexedDB repositories, LocalStorage preferences
    subtitles.ts             SRT/VTT/ASS/SSA parsing to safe timed cues
    embedded.ts              File-backed FFprobe, text extraction, audio windows
    useSegmentAudio.ts       Synchronized alternate-audio lifecycle and caching
    organization.ts          Directory paths, folder membership, season mapping
  styles.css                 Tailwind entry, themes, layouts, screening room
public/icon.svg              Original CineVault brand icon
vite.config.ts               Local FFmpeg asset serving and production bundling
tests/app.spec.ts            Real browser integration scenarios
```

Object URLs avoid copying large videos for native playback and are revoked on switching/closing. A separate muted video probes metadata and generates one 480 px cached JPEG per import. Processing is sequential to bound decoder/memory pressure, with a seven-second timeout per import probe. Custom images are resized before caching. Library data is specific to the browser profile and origin; clearing site data removes it. Originals remain untouched. This version renders the current filtered collection without virtualization; very large libraries may benefit from virtualized grids in a future release.

## Verification

```sh
npm test
npm run build
# Start npm run dev in a separate terminal, then:
npx playwright test
```

Browser tests use locally installed Google Chrome (`channel: 'chrome'`). They synthesize a short WebM in-browser, then exercise import, native playback, seeking, speed, subtitle rendering, mute, progress persistence, favorites, playlists, reconnect prompts, search, themes, mobile navigation, unsupported-media recovery, and loading the local FFmpeg engine. Tests assert that the normal library/player flow makes no external network requests. Unit tests cover subtitle parsing, unsafe markup removal, container recognition, time/size utilities, and memory-limit rejection.

The MKV integration tests generate actual H.264 MKVs locally with FFmpeg, run repackaging/transcoding, verify decoded preview pixels, and generate a two-audio-language MKV with embedded subtitles. Tests verify track detection, subtitle rendering and alternate-audio synchronization. Additional tests cover nested folder imports, editable show seasons, individual episode assignment, Continue Watching hiding, all accent/Daylight combinations, cropped resolutions, and v1 → v2 database migration. The unsupported-file recovery test can also run against the production preview by setting `CINEVAULT_TEST_URL=http://127.0.0.1:4173` and filtering with `npx playwright test -g "unsupported file"`.

Manual testing is still appropriate for physical folder permission prompts, real-world MKV/codec combinations, multiple embedded audio tracks, OS fullscreen/PiP, mobile devices, and browser/OS combinations beyond the automated Chrome run.

Technical references: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/), [File System Access](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker), [native audio tracks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/audioTracks).
