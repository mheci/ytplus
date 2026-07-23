<div align="center">

# YT+

**Make YouTube yours.** A single userscript that kills ads, clutter, and telemetry, adds powerful theming, SponsorBlock, screenshots, keyboard control, session history, and more.

[![Version](https://img.shields.io/badge/version-3.0.19.0-ff3d7f)](https://github.com/mheci/ytplus/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Userscript](https://img.shields.io/badge/install-userscript-orange)](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)

**[Install →](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)**

</div>

---

## What's New in v3.0.19.0

- Major production-grade audit and performance refactor (full repository review by Senior JS Performance Engineer).
- **Startup improvements**: Deferral of heavy initialization via `requestIdleCallback` (significant reduction in initial page load cost).
- **Glassmorphism fixes**: Complete isolation of glass effects — menus, dialogs, popups, flyouts, overlays, and context menus now render correctly.
- **Observer consolidation**: Single centralized YouTube SPA + player-ready observer replaces multiple redundant MutationObservers.
- **Hotkey system optimization**: Single global key listener with proper guards and delegation.
- Memory protection (`_mp`) enforcement and lifecycle hardening.
- All changes are production-ready with regression safeguards.

## What's New in v3.0.18.10

- **"Force video as watched" (Shift+W)** now reliably registers in YouTube Account History using per-video `playbackTracking` URLs.
- Two new toggles: `forceWatchedAccountHistory` and `forceWatchedLocalHistory` (both default ON).
- Toast feedback on hotkey press.
- Legacy endpoints kept as fallback.

## What's New in v3.0.18.9

- "Check for updates" UX improvements (clickable toasts, better cache handling).
- GitHub URLs centralized.
- All 7 test suites passing.

---

## Features (120+)

**Core Strengths**
- SponsorBlock (12 categories, per-segment/channel overrides, HUD, seekbar marks, vote/edit)
- Full keyboard control + command palette + cheat sheet
- Data Minimization (kills YouTube telemetry without breaking playback)
- Session History + Resume (with oEmbed backfill)
- Glassmorphism + 126 themes (fully isolated)
- Bookmarks, Force Watched, Screenshots, PiP, Sleep Timer, etc.

**Privacy & Cleanup**
- Data Minimization, Private Mode, Geo/Language override
- Hide Shorts, Recommendations, Comments, Live Chat, AI features, etc.
- Channel blocker + keyword filter

**Playback & UI**
- Speed, A-B loop, Frame step, Theater/Cinema/Ambient modes
- Custom captions, Volume boost, Filters
- Chapters, Heatmap, In-video search

**Everything else** (full list in the dashboard once installed):
Theme engine, Watch stats, Notes, Transcript, Remote selectors, Adaptive throttle, and 100+ more toggles.

All features are **off by default** and individually toggleable.

---

## Install

1. Install a userscript manager (Tampermonkey, Violentmonkey, etc.)
2. Click the install link above or drag `yt+.user.js` into your browser.

Works on:
- YouTube (desktop + mobile)
- YouTube Music

---

## Update

The script updates itself automatically via your userscript manager (uses `/releases/latest/download/`).

You can also use the menu command **"Check for updates"**.

---

## Privacy

- Runs 100% locally in your browser.
- Only talks to YouTube (playback), SponsorBlock (segments), and GitHub (optional update check).
- **Data Minimization** (opt-in) blocks YouTube's own telemetry beacons.

---

## Hotkeys (examples)

| Key              | Action                     |
|------------------|----------------------------|
| `Ctrl+Shift+K`   | Command palette            |
| `?`              | Cheat sheet                |
| `Alt+Y`          | Dashboard                  |
| `Shift+W`        | Mark as watched            |
| `K` / `J` / `L`  | Play/pause, seek           |
| `B`              | Bookmark                   |
| `X`              | Screenshot                 |

All hotkeys are fully rebindable in the dashboard.

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

---

**Minimal repo** — only the userscript, this README, and the license are kept. All bloat (tests, release scripts, audit artifacts, etc.) has been removed.