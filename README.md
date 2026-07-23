<div align="center">

# YT+

**Make YouTube yours.** A single userscript that kills ads, clutter, and telemetry, adds powerful theming, SponsorBlock, screenshots, keyboard control, session history, and more.

[![Version](https://img.shields.io/badge/version-3.0.20.0-ff3d7f)](https://github.com/mheci/ytplus/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Userscript](https://img.shields.io/badge/install-userscript-orange)](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)

**[Install →](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)**

</div>

---

## What's New in v3.0.20.0

**Audit round 2** — ten more themed passes over all 25k+ lines (full ledger in [AUDIT.md](AUDIT.md)). This round caught a family of long-standing latent bugs no earlier pass had found, plus four new creative features:

**Critical fixes**
- **Four same-name function collisions** at the IIFE top level (present since v1.0.0). With hoisting, the last declaration wins everywhere — so:
  - the **channel blocker** never matched (it compared channels against the *font list*) and its Block button **corrupted `channelBlockerList` with font names**,
  - the entire **force-CC** ("always turn on captions") family was a dead no-op,
  - the **caption settings card crashed** while rendering its font preview.
- **Chain-safety of network wrappers**: toggling geo-override or net-monitor off restored the *pristine* `fetch`/`XHR`/`sendBeacon`, silently knocking **data-minimization** out of the chain for the rest of the session. Wrappers now persist and self-neutralize on their own toggles instead.
- **BFCache restore** no longer kills the memory-protection registry (pagehide is a soft checkpoint, not a teardown).
- **SponsorBlock cache key** now includes the server + privacy mode (no more stale segments after switching instances).

**New creative features** (all opt-in / rebindable)
- **Copy screenshots to clipboard** instead of downloading.
- **Configurable speed-step hotkeys** (±0.05x to ±1x).
- **Per-channel speed memory** — YT+ remembers each channel's speed (LRU-capped) and restores it on their videos.
- **SponsorBlock jump-to-highlight** palette action (seek to the POI highlight).

Also: `@icon` 404 fixed (62 KB optimized icon back in the repo), `@description` slimmed 4.5 KB → 0.55 KB, `yt+.meta.js` restored in-repo (update checker clients fetch less on every background check), un-capped rebuffer toasts capped, import validation hardened, and the **test suites recovered from git history** — 9 suites / 324+ checks now gate every push in CI. Details: [CHANGELOG.md](CHANGELOG.md).

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

---

## Features (120+)

**Core Strengths**
- SponsorBlock (12 categories, per-segment/channel overrides, HUD, seekbar marks, vote/edit, jump-to-highlight)
- Full keyboard control + command palette + cheat sheet + configurable speed step
- Data Minimization (kills YouTube telemetry without breaking playback)
- Session History + Resume (with oEmbed backfill)
- Glassmorphism + 126 themes (fully isolated)
- Bookmarks, Force Watched, Screenshots (download or clipboard), PiP, Sleep Timer, Per-channel speed memory, etc.

**Privacy & Cleanup**
- Data Minimization, Private Mode, Geo/Language override
- Hide Shorts, Recommendations, Comments, Live Chat, AI features, etc.
- Channel blocker + keyword filter

**Playback & UI**
- Speed (+ per-channel memory), A-B loop, Frame step, Theater/Cinema/Ambient modes
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

The script updates itself automatically via your userscript manager (background checks fetch the tiny `yt+.meta.js` from `/releases/latest/download/`).

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

## Development

- `npm install` then `npm test` — runs the full QA matrix (9 suites: jsdom behavior tests for data-minimization, SponsorBlock, hotkeys, force-watched, memory protection, update checker, plus static scope/feature/meta guards).
- CI runs the same matrix on every push and PR.
- [AUDIT.md](AUDIT.md) is the standing ledger of the multi-pass production audits (Round 1: v3.0.19.0 · Round 2: v3.0.20.0).

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
