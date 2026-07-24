<div align="center">

# YT+

**Make YouTube yours.** A single userscript that kills ads, clutter, and telemetry, adds powerful theming, SponsorBlock, screenshots, keyboard control, session history, and more.

[![Version](https://img.shields.io/badge/version-3.0.21.0-ff3d7f)](https://github.com/mheci/ytplus/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Userscript](https://img.shields.io/badge/install-userscript-orange)](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)
[![CI](https://github.com/mheci/ytplus/actions/workflows/ci.yml/badge.svg)](https://github.com/mheci/ytplus/actions/workflows/ci.yml)

**[Install →](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)**

</div>

---

## What's New in v3.0.21.0

- **Packaging slim-down** — the script `@icon` is now served from the GitHub release assets (`releases/latest/download/icon.png`) instead of the repo tree, reducing clone size and aligning with the release-CDN distribution model. No functional changes to playback, blocking, or UI.
- **CI & QA hardening** — full test matrix (9 jsdom suites, 324+ checks) with scope-collision guard, header/meta lockstep, size sanity, and cross-platform validation (Node 18/20/22, Ubuntu/Windows/macOS) now runs on every push/PR.

## What's New in v3.0.20.0

**Audit round 2** — ten themed passes over all 25k+ lines caught a family of long-standing latent bugs, plus four new creative features:

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

## What's New in v3.0.19.0

- Major production-grade audit and performance refactor (full repository review by Senior JS Performance Engineer).
- **Startup improvements**: deferral of heavy initialization via `requestIdleCallback` (significant reduction in initial page load cost).
- **Glassmorphism fixes**: complete isolation of glass effects — menus, dialogs, popups, flyouts, overlays, and context menus now render correctly.
- **Observer consolidation**: single centralized YouTube SPA + player-ready observer replaces multiple redundant MutationObservers.
- **Hotkey system optimization**: single global key listener with proper guards and delegation.
- Memory protection (`_mp`) enforcement and lifecycle hardening.

Older release notes live on the **[Releases page](https://github.com/mheci/ytplus/releases)**.

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

The script updates itself automatically via your userscript manager — background checks fetch the tiny `yt+.meta.js` asset from the [latest release](https://github.com/mheci/ytplus/releases/latest), so update checks stay cheap.

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

The repo contains the single-file product (`yt+.user.js`, `yt+.meta.js`, `icon.png`) plus a lightweight QA harness:

```bash
npm install
npm test          # 9 jsdom suites, 324+ checks
npm run check     # node --check syntax
```

- `tests/` — jsdom behavior suites covering data-minimization, SponsorBlock, force-watched, hotkeys, memory protection, scope-guard, meta consistency, update-check, and feature flags.
- `.github/workflows/ci.yml` — validates syntax, headers, scope collisions, size, meta lockstep, and runs the full QA matrix on Node 18/20/22 and Ubuntu/Windows/macOS.
- `tools/release.sh` — bumps version, regenerates meta, runs QA, commits/tags, and optionally creates the GitHub release via `gh`.

See [AUDIT.md](AUDIT.md) and [CHANGELOG.md](CHANGELOG.md) for audit methodology and full history.

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
