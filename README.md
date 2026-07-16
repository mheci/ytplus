<div align="center">

# YT+

**Make YouTube yours.** A single userscript that fixes the ads, kills the clutter, kills the telemetry, themes the site, captures screenshots, skips sponsors, remembers where you stopped, and gives you back the keyboard.

[![Version](https://img.shields.io/badge/version-3.0.18.3-ff3d7f)](#whats-new)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Greasy Fork compatible](https://img.shields.io/badge/greasyfork-compatible-success)](https://greasyfork.org)
[![Userscript](https://img.shields.io/badge/install-userscript-orange)](yt+.user.js)

**[Add to your browser →](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)**

</div>

---

## What's new in v3.0.18.6

- **Audit fixes** — five bugs caught during a line-by-line review of all ~25,000 lines:
  1. The "Import settings from file" Tampermonkey menu command was calling `Mo()` — a button-builder helper, not an import function — so clicking it did nothing useful. Now wires to `Xo()`, the real `<input type="file">` → FileReader → JSON.parse import path.
  2. The SponsorBlock mute path had `St_perCat[r] = (St_perCat[r] || 0) + 0;` — a no-op, so muted segments never incremented the per-category count and the "saved" time was never accumulated. Mirrors the skip path now: counts the muted segment once via the `it` Set guard, accumulates the saved time, and emits the same HUD rollup.
  3. `S.ccTextColor` was interpolated raw into the generated caption CSS in two places (the `apply` path and the `cfg.changed` listener). If a user typed an invalid hex (typo, paste of `rgb(...)`, or — worse — a string containing `}` and a new rule), the stylesheet silently broke. Sanitized to a valid `#rgb` or `#rrggbb` before interpolation, falling back to white on parse failure.
  4. `S.idleDimBlur` had the same class of issue. Clamped to the [1, 20] range the dashboard exposes, falling back to 6 on any non-finite value.
  5. The update-available banner built its inner HTML with the GitHub release tag interpolated raw via `innerHTML`. Self-XSS only (the tag is maintainer-controlled), but rebuilt with `textContent` / `createTextNode` for defense-in-depth.
- All 7 test suites pass: `test_sandbox`, `test_dashboard` (12), `test_update_check` (18), `test_sb` (30), `test_dm` (33), `test_hotkeys` (49), `test_memory` (59). **203 total checks.**
- No new features; pure bug fixes from a line-by-line audit.
- **Known feature gap (out of scope, documenting here for transparency):** `sbChapterRules` (chapter skip rules per channel) is collected from config and exposed via the public API but the actual application logic is missing — there's no code path that reads `St_chapterRules` to decide whether to skip a chapter segment. The data model also doesn't have a clean way to get chapter titles (SB segments don't have a `title` field, only `description`). Proper implementation would require fetching YouTube's own chapter metadata. Filed for a future release.

## What's new in v3.0.18.5

- **SponsorBlock privacy-mode fix** — since v3.0.14 (over a year) the SB post-fetch lookup searched the response for `p.hash === hash`, but the SponsorBlock server actually returns `{videoID, segments}` entries — the `hash` field never existed. Privacy mode (default ON) silently returned zero segments for every video because the lookup never matched, even when the server's response had the data. This was masked through v3.0.18.3 because that release crashed with a `_dm` ReferenceError before SB ever ran, so the broken fetch never had a chance to fail visibly. v3.0.18.4 fixed the script load issue, which surfaced this latent SB regression: the script now loaded, but SB was still broken. Fix: look up the response by `p.videoID === e` (the videoId passed into the fetcher). One-line change; non-privacy mode was unaffected, so anyone who already turned off `sbPrivacy` was working fine. v3.0.18.4 (one-liner `_dm` ReferenceError fix) is still included and necessary; v3.0.18.5 is the additional one-line fix that makes SB actually work.

## What's new in v3.0.18.4

- **Critical freeze fix** — v3.0.18.3 had a fresh `ReferenceError: assignment to undeclared variable _dm` on every page load. The data-minimization IIFE that lives at the top of the script (introduced in v3.0.16) had a bare `_dm = { … }` assignment under the outer IIFE's strict mode — same class of bug as the v3.0.18.2 `_dm_active` fix, but one level out. The throw fired in the synchronous part of the IIFE, before the async boot catch at the bottom of the file was even registered, so the script never finished evaluating. In Firefox the resulting partial-eval state has been observed to spam "out of memory" exceptions and freeze the tab. The fix declares `_dm` at the outer IIFE scope (`let _dm = null;`) and assigns the public surface inside the data-min block (`_dm = { … }`). The whole v3.0.18.3 memory protection system is still in place — this release just makes the script actually load.

## What's new in v3.0.18.3

- **Memory protection system** — a new `YTPlus.memory.*` surface and an internal `_mp` resource manager. Every timer, observer, event listener, blob URL, and DOM node the script owns is now tracked in a single registry; every `dispose()` is idempotent (double-free safe); a `FinalizationRegistry` + `WeakRef` safety net recovers anything the script forgot to release; the maintenance tick evicts the oldest 25% of every bounded LRU on a fixed schedule and trims the JSHeap (Chromium) when usage exceeds 80% of the limit. Public API:
  ```js
  YTPlus.memory.snapshot()          // {live, acquired, released, doubleFreeAttempts, byKind, caches, heap, leakScore 0-100, …}
  YTPlus.memory.audit()             // verbose list of every live resource (capped at 200)
  YTPlus.memory.gc()                // alias of runMaintenance()
  YTPlus.memory.runMaintenance()    // force the 30s tick now
  YTPlus.memory.softCleanup()       // drop the oldest 25% of every registered cache
  YTPlus.memory.registerCache(name, map, cap, onEvict)  // give the manager a LRU to manage
  YTPlus.memory.setTimeout / setInterval / observer / listener / blobURL / element / wrap  // safe wrappers
  YTPlus.memory.releaseKind("listener")  // bulk release by kind
  ```
  No new user-facing features — pure plumbing that makes the existing 30+ actions, 120+ features, and 111 timer/observer call-sites deterministic under load. v3.0.18.2 fixed a ReferenceError that froze the tab on load. v3.0.18.1 fixed a global keydown handler that was intercepting YouTube's own keys. v3.0.18 added the hotkey system. See the [release history](#release-history).

## What's new in v3.0.18

- **Hotkeys everywhere** — the hotkey system now covers every module of the userscript. 30+ new actions added: playback (play/pause, mute, speed ±0.25, reset 1x, seek ±5/±10, loop, theater, fullscreen, cinema, ambient, captions, PiP, stop, screenshot), data minimization (toggle + show count), SponsorBlock (toggle, reload, hide-on-video, vote up/down on the current segment), bookmarks, force-watched, force-channel-watched, sleep timer, theme engine, dashboard (open, focus search, reset all), and the global ones (open command palette, show cheat sheet, check for updates, export/import settings). All new actions are rebindable from the existing **Custom Keyboard Shortcuts** panel in the dashboard.
- **Command palette** — `Ctrl+Shift+K` opens a glass modal that fuzzy-matches every registered action and every feature toggle. `Enter` runs, `Esc` closes, arrows navigate. Type `set speedDefault 1.5` to write directly to config. The palette doubles as a launcher: a single keystroke flips any feature, runs any action, or sets any config value.
- **Cheat sheet** — `?` opens a full-screen hotkey reference, filterable, organized by category (playback / modules / sponsorblock / global / dashboard / legacy). Updates live as you re-bind keys.
- **Keyboard-friendly dashboard** — when the dashboard is open, the global keydown handler now also accepts `?` to open the cheat sheet and `/` to focus the search box. Future versions will add j/k card navigation (the infrastructure is in place; the test suite covers it).
- **Action registry on `YTPlus`** — every action is reachable programmatically:
  ```js
  YTPlus.actions.list()              // array of {id, label, cat, def, binding}
  YTPlus.actions.get(id)             // {id, label, cat, def, binding} | null
  YTPlus.actions.run(id)             // boolean
  YTPlus.actions.setBinding(id, key) // boolean
  YTPlus.actions.resetBinding(id)    // boolean
  YTPlus.actions.conflicts()         // {KeyQ: ['dm.showCount', 'update.check']}
  YTPlus.palette.open(q)             // q optional pre-fill
  YTPlus.palette.close()
  YTPlus.palette.isOpen()
  YTPlus.cheat.open() / .close() / .isOpen()
  ```
- **New test file** `test_hotkeys.js` (49 assertions) locks down the registry, the conflict detector, the public surface, and the global dispatch. `release.sh` now runs all 6 test suites. The 5-suite run you know (`test_sandbox`, `test_dashboard`, `test_update_check`, `test_sb`, `test_dm`) is unchanged.

For everything that came before this, see the [release history](#release-history).

---

## What's new in v3.0.17

- **Update banner now installs with one click** — clicking the "YT+ vX.Y.Z available" toast (or banner) now opens the `user.js` file directly, so a single click downloads and installs the new version. Previously it opened the lightweight `meta.js`, which required the userscript manager to then fetch the actual `user.js` separately. The `@updateURL` header still points at `meta.js` for the background update-poll, so the cheap-file win on polls is preserved; the change only affects the manual click path.

For everything that came before this, see the [release history](#release-history).

---

## What's new in v3.0.16

- **Data minimization** *(the headline feature)* — a single master toggle in the dashboard that, when ON, completely kills YouTube's outbound telemetry and tracking without breaking playback. Internally wraps `fetch`, `XMLHttpRequest`, and `navigator.sendBeacon` at the outermost layer (outside the `geoOverride` and `netMonitor` wrappers) and short-circuits requests to:
  - `/api/stats/*` (watchtime, playback, qoe, ads, att_get)
  - `/youtubei/v1/log_event` (the engagement beacon — the biggest one)
  - `/pagead/*` and any `googleads.g.doubleclick.net`, `googleadservices.com`, `googlesyndication.com` request
  - `/ptracking`, `/get_midroll_info`, `/generate_204`, and the desktop polymer log endpoint
  - Player heartbeats (off by default — keep ON so YouTube keeps the stream alive)
  - Replaced with a synthetic 204 Response (fetch), `true` return value (sendBeacon), or a fake `load`/`loadend` event (XHR). Player code doesn't gate playback on any of these, so killing them is invisible to the video. **Opt-in by default** — a behavior change should never be on at install time.
  - Live "X requests blocked" counter with a per-host breakdown, four sub-toggles (block stats / block pagead / block log_event / allow heartbeat), and a `YTPlus.dataMin.shouldDrop(url)` API for external scripts to test before issuing a request.
- **SponsorBlock overhaul** *(v3.0.14–v3.0.15)* — two new categories (chapter, hook), four action types (skip / mute / poi / chapter), all nine `/api/skipSegments` filters (minVotes, minViews, maxViews, locked, hidden, ignored, trimUUIDs, actionTypes, requiredSegments), a public instance picker (Ajay / Lunar / minastyr / Matt / Tatu / Custom), per-segment and per-channel override editors, color override per category, an "up next" preview chip ("Sponsor in 12s"), a user-stats HUD, vote / edit / ignore / hide / lock / viewed endpoints, binary-search segment lookup, debounced seekbar repaint, exponential backoff on 429/5xx, and a 1-hour cache TTL with cache-warm-on-config-change.

For everything that came before this, see the [release history](#release-history).

---

## Install

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari, Opera)
   - [Violentmonkey](https://violentmonkey.github.io/) (Firefox, Chrome, Edge)
   - [Greasemonkey 4](https://www.greasemonkey.net/) (Firefox only)
2. Click the install link at the top of this page.
3. Confirm the install prompt.

That's it. YT+ starts working the next time you load YouTube.

### Manual install

If the one-click link doesn't work for your setup:

1. Download `yt+.user.js` from the [latest release](https://github.com/mheci/ytplus/releases/latest).
2. Drag the file into your browser window, **or** open the userscript manager's dashboard and use its "Import from file" option.
3. Confirm.

## Update

YT+ updates itself. There are two paths:

- **Automatic (recommended):** your userscript manager polls the meta file (`yt+.meta.js`) at the URL in the script header. When a new version appears, the manager shows an update banner. One click and you're on the latest.
- **Manual:** in the dashboard, click **Check for updates** in the menu (also in the top-right of the dashboard). YT+ hits the GitHub Releases API, compares the latest tag to the running version, and shows a toast. Click the link in the toast to install.

The script also re-checks for updates every 6 hours while it's running.

> **Note:** the in-script update check parses both the installed version and the latest tag into integer arrays (`[3,0,16]` vs `"3.0.16"`) before comparison. The previous character-by-character compare falsely reported an update for any version with a two-digit last segment. Fixed in v3.0.13.

## Works on

- **YouTube** — `https://www.youtube.com/*`
- **YouTube Mobile** — `https://m.youtube.com/*`
- **YouTube Music** — `https://music.youtube.com/*`
- All modern browsers (Chrome, Firefox, Edge, Brave, Arc, Opera, Vivaldi, Safari)

## Privacy

YT+ runs entirely in your browser. It stores settings and watch history locally using IndexedDB. The only network calls it makes are:

- **YouTube itself** — to play videos (obviously)
- **SponsorBlock** (`sponsor.ajay.app` by default — the instance is user-selectable) — to fetch sponsorship segment data, and to submit segments when you contribute one
- **GitHub API** (`api.github.com`) — a single lightweight call when you trigger "Check for updates" (once every 6 hours at most)

No analytics, no tracking, no third-party scripts, no remote CSS, no fonts loaded from CDNs. Your data is yours.

**If you want more privacy than that**, enable **Data minimization** in the dashboard (see [What's new](#whats-new-in-v3016)). When ON, YT+ short-circuits the well-known YouTube telemetry endpoints at the network layer, so the data never leaves your browser in the first place — not just the ones YT+ uses, but any code running in the YouTube page.

---

## Features

YT+ has **120+ features** grouped into 16 categories. Every feature is off by default except where noted, and every one is gated behind its own toggle in the dashboard so you can pick exactly what you want.

### Privacy & Telemetry

- **Data Minimization** *(new in v3.0.16)* — kills YouTube's outbound telemetry, ad-event beacons, and DoubleClick / pagead tracking without breaking playback. One master toggle, four sub-toggles, live counter, `YTPlus.dataMin.shouldDrop(url)` API.
- **Private Mode** — disables all network calls (SponsorBlock, screenshots, etc) and clears the watch history.
- **Country & Language Override** — fake your locale for YouTube, including safe-search, restricted mode, language, region, and timezone. Patches `navigator`, `fetch`, `XMLHttpRequest`, and `sendBeacon`.
- **Safe Mode** — kill-switch for all SponsorBlock traffic in case of incident.

### Playback

- **SponsorBlock** *(overhauled in v3.0.14)* — auto-skip sponsored segments, intros, outros, self-promos, filler, and more. You pick which categories to skip and what to do with each (skip, mute, disable). 12 categories, 6 action types, per-segment and per-channel overrides, color overrides, "up next" preview chip, user-stats HUD, public instance picker.
- **Speed Controller** — playback speed slider, per-video memory (set 1.5× for podcasts, etc.), keyboard shortcuts.
- **Loop Video** — single-key loop.
- **A-B Repeat** — loop a custom segment (set start, set end, it loops forever until you stop).
- **Frame Step** — step through video one frame at a time with `,` and `.`.
- **Smart Quality** — auto-pick quality based on whether you're on Wi-Fi or cellular.
- **Always Use My Preferred Quality** — set it once, never think about it again.
- **Skip Intro** — skip the first N seconds of every video.
- **Always Turn On Captions** — force-enable captions, pick language, font, size, color, background, opacity, edge style, position, line height, letter spacing. 100+ fonts with live previews.
- **Volume Boost** — boost past YouTube's 100% cap (up to 4×).
- **Audio Normalize** — keep loud and quiet parts evened out.
- **Scroll-Wheel Volume** — hover the player and scroll to change volume.
- **Auto Skip Ad Button** — click the "Skip Ad" button the instant it appears.
- **Mute Ads** — automatically mute the player during ads.
- **Speed Through Ads** — set ads to 16× speed so they finish instantly.

### History & Sessions

- **Session History** — every video you watch is recorded with timestamps, watch count, watch time, completion status. Resume where you left off in any of them. Full oEmbed backfill for entries with empty title/channel.
- **Force Watched** — mark the current video as fully watched with `Shift+W`.
- **Force Channel as Watched** — batch-mark every video in a channel as watched, with concurrency control and aggressive-completion mode.
- **Session Summary** — a glass card on the dashboard with your most-watched channels, total watch time, and completion rate.
- **Watched Feed Videos** — dim or hide videos you've already finished in the home feed.
- **Watch Stats** — daily / weekly stats, watch goals, and streaks.

### Captions & Subtitles

- **Always Turn On Captions** — see above.
- **Subtitle Translation** — translate non-English captions into your target language.
- **In-Video Search** — search the current video's captions with **Ctrl+F**. Matches appear as red marks on a timeline strip and a scrollable list. Click any match to seek.

### Bookmarks & Clips

- **Timestamp Bookmarks** — press `B` to bookmark the current moment. Includes a label, color, and category. Browse them in the dashboard.
- **Copy Timestamp Button** — copy a `00:42` style link to your clipboard.
- **Copy Video Info Button** — copy a markdown block with the video title, channel, and URL.
- **Open Transcript Button** — open the video's transcript in a new tab.
- **Video Notes** — take timestamped notes while watching. Each note is auto-attached to the time you wrote it.
- **Channel Notes** — sticky notes per channel.

### UI & Theme

- **Theme Engine** — 126 themes (60+ dark, 60+ light). Catppuccin, Dracula, Nord, Gruvbox, Rose Pine, Tokyo Night, Solarized, and many more. Each is a full YouTube theme — masthead, sidebar, player chrome, comments, everything.
- **Glassmorphism Overhaul** — opt-in site-wide glass styling. Only touches the chrome (masthead, sidebar, chips, popups). Doesn't break the player or the home grid.
- **Theater Mode Default** — start every video in theater mode.
- **Theater Mode on Wide Screens** — auto-engage theater when the window is wide.
- **Cinema Mode** — fullscreen + dim + reduce UI.
- **Ambient Glow** — the video's dominant color bleeds onto the page background.
- **Custom Styles** — paste your own CSS. Saved locally, applied instantly.
- **Video Filters** — brightness, contrast, saturation, hue, grayscale, invert, zoom. Per-video or global.
- **Compact UI** — denser layout in lists and shelves.
- **Dense Video Grid** — more videos per row in the home grid.
- **Top Playback Progress Bar** — a thin progress bar at the very top of the page.
- **Remaining Time Badge** — see "12:34 left" right in the player.
- **Local Clock Badge** — your local time on the player.
- **End Soon Warning** — overlay notification 20s before the video ends.
- **Idle Dim** — when you stop interacting for 60s, the player dims to 40% so a paused video doesn't burn into the screen.

### Layout & Cleanup

- **Hide Shorts** — remove Shorts from the home feed, search, channel pages, recommendations.
- **Hide Recommendations** — strip the "Recommended for you" shelves from the watch page.
- **Hide Comments** — hide the comments section.
- **Hide Live Chat** — clean the live-chat overlay.
- **Hide Watermark** — drop the channel watermark from the player.
- **Hide Cards** — remove the info cards that pop up mid-video.
- **Hide Live Content** — never show live videos in the feed.
- **Hide Premieres** — hide upcoming premiere listings.
- **Channel Blocker** — block specific channels entirely (with regex support).
- **Keyword Filter** — hide any video whose title contains a banned word.
- **Hide Page Elements** — point-and-click to hide any DOM element on any YouTube page. 8 quick presets, individual item list, live preview on hover.
- **Remote Selectors** — sync your element-hiding rules across devices via a GitHub gist or private URL, SHA-256 verified.
- **Block YouTube AI** — hide all the new AI features (AI summaries, "Ask" button, etc).
- **Watch Later Shortcut** — fast-add to Watch Later with a custom key.
- **Subscribe Shortcut** — fast-subscribe with a custom key.

### Player Extras

- **Floating Pop-out Window** — PiP with keyboard controls.
- **Screenshot** — grab the current frame as PNG or JPEG. `X` for full, `Shift+X` for region.
- **Screenshot Strip** — auto-capture 6 frames over 2 seconds, pick the best.
- **Quick Screenshot Region** — drag a rectangle on the video to capture only that area.
- **Stop Button** — a big "Stop" button that pauses AND resets to 0, distinct from pause.
- **Player Buttons** — extra buttons next to the player's existing controls (stop, watch-later quick-add, etc).
- **Subtitle Translate Target** — pick your default translation target.
- **Read Aloud** — TTS reads the captions out loud.
- **Reaction Picker** — quick-access emoji reactions.
- **Sub Auto Like** — auto-like videos you watched to the end of.
- **Watch Later Smart Sort** — sort your Watch Later by length, channel, etc.

### Player Behavior

- **Always Show Progress Bar** — keeps the player's progress bar visible all the time.
- **Auto Expand Description** — clicks "Show more" on every video automatically.
- **Disable Autoplay** — stops the autoplay queue from starting.
- **Auto Pause** — pause when the tab is hidden, when the window loses focus, or both.
- **Auto Resume** — resume from auto-pause when the tab comes back.
- **Confirm Leave While Playing** — confirmation dialog when closing the tab while a video is playing.
- **Disable Video Previews** — stops preview-on-hover in the home feed.
- **Shorts Auto Mute** — Shorts always start muted.
- **Shorts Hide Comments** — hide the comments section in Shorts.

### Chapters

- **Chapter Hotkeys** — jump to the next / previous chapter.
- **Chapter Buttons** — chapter list overlay for quick navigation.
- **Chapter List Panel** — floating panel with the full chapter list and durations.
- **Most-Replayed Heatmap** — overlay YouTube's most-replayed heatmap on the seek bar.
- **Unified Heatmap** — overlay that combines SponsorBlock segments, chapters, and your personal replay history into one timeline.

### Developer / Power User

- **Playback Performance Overlay** — live FPS, decode time, buffer health, dropped frames.
- **Activity Monitor** — log of every script action, with error capture and a "re-enable quarantined features" button.
- **Feature Performance Tracker** — per-feature apply time, interval count, and max time.
- **Data Usage Tracker** — per-host request log, request count, byte count, budget alerts. Built-in charts and a daily quota.
- **Adaptive Throttle** — automatically slows down the script when the device is under load (document.hidden, low memory, save-data mode, etc).
- **API Explorer** — explore the YouTube IFrame API and call any method.
- **SponsorBlock Submit** — submit sponsorship segments you've marked (with a live preview ribbon before submit).
- **Audio Waveform** — see the audio waveform over the player.

### Time Tools

- **Sleep Timer** — auto-pause after N minutes.
- **Watch Goal** — daily/weekly minute goals with progress on the dashboard.

### Comments

- **Comment Search** — search the comments of any video.
- **Collapse Long Comments** — auto-collapse comments over N characters with a "Read more" button.
- **Highlight Creator Comments** — pin / accent comments from the video's creator.
- **Highlight Timestamp Links** — make timestamp links in comments visually distinct.

### Shorts

- **Hide Shorts** — see above.
- **Redirect Shorts to Normal** — open regular YouTube videos instead of Shorts URLs.
- **Shorts Auto Mute / Hide Comments** — see above.

### Keyboard

- **Custom Keyboard Shortcuts** — every built-in action is rebindable. Click a key in the dashboard, press a new combo, it's saved. Conflicts are detected.
- **Keyboard Cheat Sheet** — press `?` to see every shortcut.

### Dashboard

- **Glass dashboard** — translucent dark, blurred background, gradient borders, accent glow. GPU-accelerated with `will-change` and `contain` for 144Hz+ monitor support (perf fix in v3.0.12).
- **Search** — quick-jump to any feature by name.
- **Draggable & resizable** — drag the header to move, drag the bottom-right corner to resize.
- **Settings preserved per-feature** — every feature has its own collapsible settings block.
- **Export / Import** — back up your entire config + history + bookmarks to a JSON file. Re-import on a new device.

---

## Default menu

When you install YT+, the userscript manager's menu gains sixteen commands:

1. **Open YT+ dashboard** (`Alt+Y`)
2. **Mark this video as watched** (`Shift+W`)
3. **Toggle SponsorBlock on/off**
4. **SponsorBlock: reload segments** (current video)
5. **SponsorBlock: hide on this video**
6. **SponsorBlock: show my stats**
7. **Bookmark this moment**
8. **Check for updates**
9. **Export settings to file**
10. **Import settings from file**
11. **Re-enable features that crashed earlier**
12. **Data minimization: ON / OFF** *(click to toggle)*
13. **Data minimization: show count**
14. **Open command palette** (`Ctrl+Shift+K`)
15. **Show hotkey cheat sheet** (`?`)
16. **Focus dashboard search** (`Ctrl+F`)

Every one of those except the dashboard toggle is also available as a hotkey once enabled. See the **Hotkeys** section for the full list of 30+ actions registered in v3.0.18.

---

## Hotkeys

v3.0.18 adds a unified hotkey system that covers every module. The full list of 30+ actions (defaults; every binding is rebindable from the dashboard's "Custom Keyboard Shortcuts" panel or programmatically via `YTPlus.actions.setBinding`):

### Global

| Key | Action |
|---|---|
| `Ctrl+Shift+K` | Open command palette |
| `?` | Show hotkey cheat sheet |
| `Alt+Y` | Open / close dashboard |
| `Ctrl+F` | Focus dashboard search |
| `Ctrl+S` | Check for updates (via menu) |
| `Ctrl+E` | Export settings to file (via menu) |
| `Ctrl+I` | Import settings from file (via menu) |

### Playback

| Key | Action |
|---|---|
| `K` | Play / pause |
| `M` | Mute / unmute |
| `J` | Seek -10s |
| `L` | Seek +10s |
| `←` | Seek -5s |
| `→` | Seek +5s |
| `,` (Comma) | Speed down (-0.25x) |
| `.` (Period) | Speed up (+0.25x) |
| `0` | Reset speed to 1x |
| `R` | Toggle loop |
| `T` | Toggle theater mode |
| `F` | Toggle fullscreen |
| `C` | Toggle captions |
| `Shift+C` | Toggle cinema mode |
| `Shift+A` | Toggle ambient mode |
| `Shift+T` | Toggle wide theater |
| `Shift+S` | Stop playback (reset + pause) |
| `X` | Screenshot frame |
| `P` | Toggle Picture-in-Picture |

### Modules

| Key | Action |
|---|---|
| `B` | Bookmark current time |
| `Shift+W` | Mark this video as watched |
| `Alt+W` | Toggle Watch Later |
| `Alt+U` | Toggle Subscribe |
| `Shift+D` | Toggle data minimization |
| `Shift+B` | Toggle SponsorBlock |

### SponsorBlock

| Key | Action |
|---|---|
| *(menu)* | SponsorBlock: reload segments |
| *(menu)* | SponsorBlock: hide on this video |
| *(menu)* | SponsorBlock: vote up current segment |
| *(menu)* | SponsorBlock: vote down current segment |

### Command palette (Ctrl+Shift+K)

Fuzzy-matches every action above and every feature toggle in the dashboard. Special syntax:

- `set speedDefault 1.5` — write a config value (number, boolean, or string)
- `toggle dataMinimizationOn` — flip a boolean
- `play.togglePlay` — run an action by id
- `SponsorBlock` — fuzzy-match a feature by name (e.g. typing "sponsor" shows all SB actions and the feature itself; `Enter` on the feature row toggles its master)

### Programmatic API

```js
// List every action with its current binding
YTPlus.actions.list();
// => [{id: "palette.open", label: "Open command palette", cat: "global", def: "Ctrl+Shift+KeyK", binding: "Ctrl+Shift+KeyK"}, ...]

// Re-bind an action
YTPlus.actions.setBinding("play.togglePlay", "Space");
// Reset to default
YTPlus.actions.resetBinding("play.togglePlay");
// Run an action by id
YTPlus.actions.run("dm.toggle");
// Detect conflicts
YTPlus.actions.conflicts();
// => {KeyQ: ["dm.showCount", "update.check"]}  // or {} if clean

// Palette + cheat
YTPlus.palette.open("sponsor");  // pre-fill the search
YTPlus.palette.close();
YTPlus.cheat.open();
```

## Architecture

YT+ is a single ~835 KB userscript (~23,000 lines). Its structure:

- **IIFE wrapper** with `"use strict"` so nothing leaks to the page.
- **A `S` config object** with 250+ keys, validated and sanitized on every load.
- **A `xa` (feature registry)** that lets each feature register a name, summary, master key, list of keys to re-apply on, an `apply(ctx)` function, and a `settings(div)` function.
- **A `ctx` (feature scope)** with helpers like `addStyle()`, `addListener()`, `addInterval()`, `addTimeout()`, `addObserver()`, `onNav()`, and `addRAF()` — all auto-cleaned up when the feature is disabled or the tab unloads.
- **An IDB layer** (`ytplus_v2` v3) for settings, history, bookmarks, replay history, thumbnails, network buckets, notes, and queue. Cross-tab sync via `BroadcastChannel`.
- **A mini library** for throttle, debounce, format bytes, format time, memoize, fetch with `@connect` enforcement, and a glass toast system.
- **A single CSS string** embedded as a JS string literal, registered on the first `apply()` and edited on every `cfg.changed` event.
- **Data minimization layer** *(v3.0.16)* — the outermost wrapper on `fetch`, `XMLHttpRequest`, and `navigator.sendBeacon`. Installed at IIFE start so it sits *above* the `geoOverride` and `netMonitor` wrappers (which still see content traffic). The pristine original functions are saved as `__pristineFetch__`, `__pristineXHROpen__`, `__pristineXHRSend__`, `__pristineBeacon__` for the inner wrappers to call through.
- **Memory protection system** *(v3.0.18.3)* — `_mp` resource manager with a Rust-inspired ownership model. `acquire(kind, owner, payload)` returns a handle whose `dispose()` is idempotent; a `FinalizationRegistry` + `WeakRef` recovers anything the script forgot to release; the maintenance tick evicts the oldest 25% of every registered LRU and trims the JSHeap when usage exceeds 80%; a leak-score heuristic (0-100) is exposed via `YTPlus.memory.snapshot()` along with `audit()`, `gc()`, `runMaintenance()`, `softCleanup()`, `releaseKind()`, and the safe-resource wrappers (`safeSetTimeout` / `safeSetInterval` / `safeObserver` / `safeListener` / `safeBlobURL` / `safeElement` / `safeWrap`). Pagehide disposes everything in one shot.
- **Public API surface on `window.YTPlus`** — `YTPlus.cfg` (proxy), `YTPlus.setCfg(key, val)`, `YTPlus.features`, `YTPlus.bus`, `YTPlus.sb.*` (SponsorBlock controls), `YTPlus.net.*` (network monitor), `YTPlus.dataMin.*` (data minimization: `on`, `off`, `toggle`, `stats`, `shouldDrop`, `endpoints`, `config`, `setBlock`), `YTPlus.history.*` (history ops), `YTPlus.diagnostics.snapshot()`, `YTPlus.memory.*` (the v3.0.18.3 resource manager).

## Performance

YT+ is designed to add less than 30ms to your YouTube page load, use less than 25 MB of RAM at idle, and zero CPU when the tab is hidden. The Adaptive Throttle feature can stretch those numbers further on low-end devices. The dashboard itself was tuned in v3.0.12 to use GPU layers and `contain` so the panel moves 1:1 with the cursor on 144Hz+ monitors.

## Testing

Each release is verified against seven test suites:

- `test_sandbox.js` — JSDOM-based smoke test that mocks all `GM_*` APIs and counts registered features, registered menu items, and any thrown errors
- `test_dashboard.js` — dashboard perf benchmarks
- `test_update_check.js` — version comparator edge cases (the `"3.0.12"[2] === "2"` bug)
- `test_sb.js` — SponsorBlock filters, action resolution, cache key derivation
- `test_dm.js` — data minimization: master toggle, sub-toggles, XHR/fetch/beacon short-circuit, byHost tracking, `shouldDrop()` API, public surface, master re-arm
- `test_hotkeys.js` — v3.0.18 hotkey registry: action registration, binding storage, conflict detection, dispatch with modifiers, public `YTPlus.actions` / `.palette` / `.cheat` surface, global keydown integration
- `test_memory.js` — v3.0.18.3 memory protection: `safeSetTimeout` / `safeSetInterval` / `safeObserver` / `safeListener` / `safeBlobURL` / `safeElement` / `safeWrap`, `dispose()` idempotency, double-free tracking, `releaseKind`, `audit()`, `runMaintenance()`, leak score heuristic

Run them with `node test_*.js` (requires `npm install` for the `jsdom` dependency).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

If you find a bug, please open an issue with:
- The YT+ version
- The browser and userscript manager
- Steps to reproduce
- What you expected vs what happened

---

## Release history

### v3.0.18.6 *(current)*
- Audit fixes: "Import settings" menu command now wires to `Xo()` (the real import); SB mute path now counts and accumulates time; `ccTextColor` and `idleDimBlur` are sanitized before CSS interpolation; update banner rebuilt with `textContent`. Five bugs in total, all from a line-by-line review. All 7 test suites pass.
- Known feature gap: `sbChapterRules` (chapter skip rules per channel) is collected but never applied — out of scope for this release.

### v3.0.18.5
- SponsorBlock privacy-mode fix: since v3.0.14 the SB post-fetch lookup searched the response for `p.hash === hash`, but the SB API actually returns `{videoID, segments}` entries — the `hash` field never existed on response entries. With `sbPrivacy: true` (the default) every fetch returned zero segments even when the server had data, because the lookup never matched. Latent since v3.0.14, surfaced only after v3.0.18.4 fixed the script load issue. Fix: look up by `p.videoID === e` (the videoId passed into the fetcher). One-line change. Non-privacy mode was unaffected. v3.0.18.4's `_dm` ReferenceError fix is still required; v3.0.18.5 stacks on top of it.

### v3.0.18.4
- CRITICAL freeze fix: the data-minimization IIFE's outer `_dm = { ... }` was a bare assignment under the outer IIFE's strict mode, throwing `ReferenceError: assignment to undeclared variable _dm` on every page load. Same class of bug as the v3.0.18.2 `_dm_active` fix but one level out (the outer IIFE, not the inner `_dm_refresh` function). The throw fired during the synchronous IIFE evaluation, before the async boot catch at the bottom of the file was registered, so the script never finished loading and the tab could freeze with "out of memory" spam. Fix: hoist `_dm` to the outer IIFE scope as `let _dm = null;` and assign the public surface inside the data-min block. The v3.0.18.3 memory protection system is still in place — this release makes the script actually load.

### v3.0.18.3
- New `YTPlus.memory.*` surface + internal `_mp` resource manager
- Centralized tracking of every timer, observer, event listener, blob URL, and DOM node
- `dispose()` is idempotent (double-free safe) and counted
- `FinalizationRegistry` + `WeakRef` safety net for forgotten releases
- Maintenance tick evicts oldest 25% of every bounded LRU and trims the JSHeap on Chromium when usage > 80%
- Public API: `snapshot()`, `audit()`, `gc()` / `runMaintenance()`, `softCleanup()`, `releaseKind()`, safe-resource wrappers (`safeSetTimeout` / `safeSetInterval` / `safeObserver` / `safeListener` / `safeBlobURL` / `safeElement` / `safeWrap`), leak score 0-100
- New `test_memory.js` (59 assertions) covers the whole surface

### v3.0.18.2
- CRITICAL freeze fix: `active` → `_dm_active` typo in `_dm_refresh()` was throwing a ReferenceError on every page load, causing "out of memory" spam in Firefox + Violentmonkey

### v3.0.18.1
- Hotkey freeze fix: global keydown handler moved from capture to bubble phase so YouTube's own handlers run first; dashboard `?` / `/` shortcuts gated on the existing `hotkeyOptIn` master toggle

### v3.0.18
- Hotkey system extended to every module: 30+ new actions (playback, data min, SponsorBlock, bookmarks, force-watched, sleep timer, theme, dashboard, global)
- Command palette (Ctrl+Shift+K) with fuzzy search over actions + features
- Cheat sheet (?) with filterable hotkey reference
- Dashboard keyboard-friendly (?, /, future j/k/Enter)
- New `test_hotkeys.js` (49 assertions) for the action registry
- `release.sh` now runs all 6 test suites
- Public `YTPlus.actions` / `.palette` / `.cheat` API

### v3.0.17
- Update banner / toast now opens `yt+.user.js` (not `yt+.meta.js`) on click, so the "YT+ vX.Y.Z available" toast is a single-click install. The `@updateURL` header still points at the cheap `meta.js` for background polls.
- New `LICENSE` file in the repo (GPL-3.0-or-later) — `@license` header was already there but the actual file was missing. Now downloadable alongside the userscript.

### v3.0.16
- **Data minimization** — master toggle + 4 sub-toggles; outer wrapper on fetch / XHR / sendBeacon; live counter; `YTPlus.dataMin` API; 33-test suite
- SponsorBlock chapter rules and color override exposed (logic finalized)
- Documentation pass for the dashboard

### v3.0.15
- Hotfix — removed a duplicate `function Tt()` declaration that was inadvertently inserted at the end of the v3.0.14 SponsorBlock rewrite block. The duplicate caused browsers to throw "SyntaxError: Identifier 'Tt' has already been declared" at script load, so the entire script failed to execute.

### v3.0.14
- Major SponsorBlock expansion — 2 new categories (chapter, hook), 4 action types, all 9 `/api/skipSegments` filters, public instance picker, per-segment and per-channel override editors, color override per category, up-next preview chip, user-stats HUD, vote / edit / ignore / hide / lock / viewed endpoints, binary-search segment lookup, debounced seekbar repaint, exponential backoff, and 1-hour cache TTL.

### v3.0.13
- Fixed false "update available" notification for users on the latest version (the installed-version string was being compared as a character array, so `"3.0.12"[2] === "2"` caused 12 != 2 to fire). Both sides are now parsed into integer arrays before comparison.

### v3.0.12
- Dashboard performance fix — removed heavy backdrop-filter, noise overlay, and transform transition so the panel moves 1:1 with the cursor on 144Hz+ monitors.

### v3.0.11
- Dashboard GUI opaque and crisp — opacity 55%→82%, blur 22px→32px, SVG noise overlay, GPU layers via `will-change` / `contain` / `backface-visibility: hidden`, text bumped to `#f5f7fb` with `text-shadow`.

### v3.0.4
- Font dropdown CSS fixed (130 fonts now searchable and scrollable)
- Theme overhaul is sane (chrome-only, no longer breaks the home grid)
- In-Video Search: search captions with Ctrl+F
- All remaining solid `#212121` backgrounds converted to glass
- Alt+Y hotkey fix
- 107 features, 0 sandbox errors, 8 menu items

### v3.0.3
- Color picker for `ccTextColor` and `ccBgColor`
- Video-element playback gate (hard guarantee that resume prompt must be confirmed)
- Caption enforcement verify interval throttled to 4s
- Theme engine: `themeGlassOverhaulOn` opt-in
- Session history: `sessionResumeDesign` (default/compact/detailed/cinema)
- Default volume survives player-updated and loadstart events

### v3.0.2
- Glassmorphism redesign for all 13 popups / toasts / UI elements (toast, resume card, resume overlay, extra notes, clock, end-warn, sponsor-block HUD, stats, diag, chapter panel, network badge, focus-comment overlay, comment search)

### v3.0.1
- Restored ~140 lost CSS rules
- Toast class mismatch fix (added `ytp-t-*` aliases)
- Dashboard text rendering fix (defensive `font-style:normal`)

### v3.0.0
- Glassmorphism dashboard, simplified 8-item menu, brand-new icon, 30 new features

### v2.1.0
- Last release before the v3 rewrite

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for the full text.
