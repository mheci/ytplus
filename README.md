<div align="center">

# YT+

**Make YouTube yours.** A single userscript that fixes the ads, kills the clutter, themes the site, captures screenshots, skips sponsors, remembers where you stopped, and gives you back the keyboard.

[![Version](https://img.shields.io/badge/version-3.0.10-ff3d7f)](#whats-new)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Greasy Fork compatible](https://img.shields.io/badge/greasyfork-compatible-success)](https://greasyfork.org)
[![Userscript](https://img.shields.io/badge/install-userscript-orange)](yt+.user.js)

**[Add to your browser →](https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js)**

</div>

---

## What's new in v3.0.10

- **Update mechanism rewritten for near-real-time updates** — both `@updateURL` and `@downloadURL` now point at the stable `releases/latest/download/...` URL, which GitHub serves with `cache-control: no-cache` and which always resolves to the current release. The script manager's periodic check now always finds the latest version, and re-opening the install link shows a proper "Update" dialog (not "Reinstall") when a new version is out. The in-script `Check for updates` flow now opens a sticky clickable banner instead of a disappearing toast, and YT+ auto-checks for updates every 6 hours per session even if your userscript manager has auto-updates disabled or set to a long interval.

For everything that came before this, see the [release history](#release-history).

---

## Install

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari, Opera)
   - [Violentmonkey](https://violentmonkey.github.io/) (Firefox, Chrome, Edge)
   - [Greasemonkey 4](https://www.greasespot.net/) (Firefox only)
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

## Works on

- **YouTube** — `https://www.youtube.com/*`
- **YouTube Mobile** — `https://m.youtube.com/*`
- **YouTube Music** — `https://music.youtube.com/*`
- All modern browsers (Chrome, Firefox, Edge, Brave, Arc, Opera, Vivaldi, Safari)

## Privacy

YT+ runs entirely in your browser. It stores settings and watch history locally using IndexedDB. The only network calls it makes are:

- **YouTube itself** — to play videos (obviously)
- **SponsorBlock** (`sponsor.ajay.app`) — to fetch sponsorship segment data, and to submit segments when you contribute one
- **GitHub API** (`api.github.com`) — a single lightweight call when you trigger "Check for updates" (once every 6 hours at most)

No analytics, no tracking, no third-party scripts, no remote CSS, no fonts loaded from CDNs. Your data is yours.

---

## Features

YT+ has **107 features** grouped into 14 categories. Every feature is off by default except where noted, and every one is gated behind its own toggle in the dashboard so you can pick exactly what you want.

### Playback

- **SponsorBlock** — auto-skip sponsored segments, intros, outros, self-promos, filler, and more. You pick which categories to skip and what to do with each (skip, mute, disable).
- **Speed Controller** — playback speed slider, per-video memory (set 1.5× for podcasts, etc.), keyboard shortcuts.
- **Loop Video** — single-key loop.
- **A-B Repeat** — loop a custom segment (set start, set end, it loops forever until you stop).
- **Frame Step** — step through video one frame at a time with `,` and `.`.
- **Smart Quality** — auto-pick quality based on whether you're on Wi-Fi or cellular.
- **Always Use My Preferred Quality** — set it once, never think about it again.
- **Skip Intro** — skip the first N seconds of every video.
- **Always Turn On Captions** — force-enable captions, pick language, font, size, color, background, opacity, edge style, position, line height, letter spacing. 100+ fonts with live previews.
- **Default Volume** — set a default volume for every video (e.g. 80%) so you don't get blasted by 100%.
- **Volume Boost** — boost past YouTube's 100% cap (up to 4×).
- **Audio Normalize** — keep loud and quiet parts evened out.
- **Scroll-Wheel Volume** — hover the player and scroll to change volume.
- **Auto Skip Ad Button** — click the "Skip Ad" button the instant it appears.
- **Mute Ads** — automatically mute the player during ads.
- **Speed Through Ads** — set ads to 16× speed so they finish instantly.

### Ads

- All three ad features above work together. They quarantine themselves automatically if YouTube changes the ad DOM.

### History & Sessions

- **Session History** — every video you watch is recorded with timestamps, watch count, watch time, completion status. Resume where you left off in any of them.
- **Force Watched** — mark the current video as fully watched with `Shift+W`.
- **Force Channel as Watched** — batch-mark every video in a channel as watched.
- **Session Summary** — a glass card on the dashboard with your most-watched channels, total watch time, and completion rate.
- **Watched Feed Videos** — dim or hide videos you've already finished in the home feed.
- **Watch Stats** — daily / weekly stats, watch goals, and streaks.

### Captions & Subtitles

- **Always Turn On Captions** — see above.
- **Subtitle Translation** — translate non-English captions into your target language.
- **In-Video Search** *(new in v3.0.4)* — search the current video's captions with **Ctrl+F**. Matches appear as red marks on a timeline strip and a scrollable list. Click any match to seek.

### Bookmarks & Clips

- **Timestamp Bookmarks** — press `B` to bookmark the current moment. Includes a label, color, and category. Browse them in the dashboard.
- **Copy Timestamp Button** — copy a `00:42` style link to your clipboard.
- **Copy Video Info Button** — copy a markdown block with the video title, channel, and URL.
- **Open Transcript Button** — open the video's transcript in a new tab.
- **Video Notes** — take timestamped notes while watching. Each note is auto-attached to the time you wrote it.
- **Channel Notes** — sticky notes per channel.

### UI & Theme

- **Theme Engine** — 126 themes (60+ dark, 60+ light). Catppuccin, Dracula, Nord, Gruvbox, Rose Pine, Tokyo Night, Solarized, and many more. Each is a full YouTube theme — masthead, sidebar, player chrome, comments, everything.
- **Glassmorphism Overhaul** *(new in v3.0.4)* — opt-in site-wide glass styling. Only touches the chrome (masthead, sidebar, chips, popups). Doesn't break the player or the home grid like the previous attempt did.
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
- **Hide Page Elements** — point-and-click to hide any DOM element on any YouTube page.
- **Remote Selectors** — sync your element-hiding rules across devices via a GitHub gist or private URL.
- **Block YouTube AI** — hide all the new AI features (AI summaries, "Ask" button, etc).
- **Feed Card Filters** — auto-hide Shorts, livestreams, upcoming, mixes, etc, in one click.
- **Watch Later Shortcut** — fast-add to Watch Later with a custom key.
- **Subscribe Shortcut** — fast-subscribe with a custom key.
- **Subscribe Confirm** — ask before subscribing (so you don't accidentally subscribe to spam).

### Player Extras

- **Floating Pop-out Window** — PiP with keyboard controls.
- **Screenshot** — grab the current frame as PNG or JPEG. `X` for full, `Shift+X` for region.
- **Screenshot Strip** — auto-capture 6 frames over 2 seconds, pick the best.
- **Quick Screenshot Region** — drag a rectangle on the video to capture only that area.
- **Stop Button** — a big "Stop" button that pauses AND resets to 0, distinct from pause.
- **Theater Glow** — subtle red glow around the player in theater mode.
- **Player Mini Map** — see a tiny progress preview in the corner.
- **Player Buttons** — extra buttons next to the player's existing controls (stop, watch-later quick-add, etc).
- **Scrubber Preview Fix** — fixes the broken hover-preview on the progress bar.
- **Subtitle Translate Target** — pick your default translation target.
- **Read Aloud** — TTS reads the captions out loud.
- **Reaction Picker** — quick-access emoji reactions.
- **Sub Auto Like** — auto-like videos you watched to the end of.
- **Watch Later Smart Sort** — sort your Watch Later by length, channel, etc.

### Captions & Annotations

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
- **Chapter Loop** — loop the current chapter.
- **Chapter List Panel** — floating panel with the full chapter list and durations.
- **Most-Replayed Heatmap** — overlay YouTube's most-replayed heatmap on the seek bar.
- **Unified Heatmap** — overlay that combines SponsorBlock segments, chapters, and your personal replay history into one timeline.

### Developer / Power User

- **Playback Performance Overlay** — live FPS, decode time, buffer health, dropped frames.
- **Activity Monitor** — log of every script action, with error capture and a "re-enable quarantined features" button.
- **Feature Performance Tracker** — per-feature apply time, interval count, and max time.
- **Click & Navigation Recorder** — record every click and `yt-navigate-*` event for debugging.
- **Developer Player Control** — click any player method in a tree, see its return value.
- **Data Usage Tracker** — per-host request log, request count, byte count, budget alerts.
- **Adaptive Throttle** — automatically slows down the script when the device is under load (document.hidden, low memory, save-data mode, etc).
- **Private Mode** — disables all network calls (SponsorBlock, screenshots, etc) and clears the watch history.
- **API Explorer** — explore the YouTube IFrame API and call any method.
- **Remote Selectors** — pull your hide-element rules from a remote URL.
- **SponsorBlock Submit** — submit sponsorship segments you've marked (with a live preview ribbon before submit).
- **Audio Waveform** — see the audio waveform over the player.

### Time Tools

- **Sleep Timer** — auto-pause after N minutes.
- **Sleep Schedule** — auto-pause during a daily time window (e.g. "stop playing after 11pm").
- **Watch Goal** — daily/weekly minute goals with progress on the dashboard.
- **Watch History Heatmap** — 53×7 heatmap of when you watch what.

### Comments

- **Comment Search** — search the comments of any video.
- **Collapse Long Comments** — auto-collapse comments over N characters with a "Read more" button.
- **Highlight Creator Comments** — pin / accent comments from the video's creator.
- **Highlight Timestamp Links** — make timestamp links in comments visually distinct.
- **Auto-Expand Description** — see above.

### Shorts

- **Hide Shorts** — see above.
- **Redirect Shorts to Normal** — open regular YouTube videos instead of Shorts URLs.
- **Shorts Auto Mute / Hide Comments** — see above.

### Geo / Locale

- **Country & Language Override** — fake your locale for YouTube, including safe-search, restricted mode, language, region, and timezone. Patches `navigator`, `fetch`, `XMLHttpRequest`, and `sendBeacon`.

### Keyboard

- **Custom Keyboard Shortcuts** — every built-in action is rebindable. Click a key in the dashboard, press a new combo, it's saved. Conflicts are detected.
- **Keyboard Cheat Sheet** — press `?` to see every shortcut.
- **Tab Title Progress** — show watch progress in the tab title (e.g. `▶ 45% — Video Title`).

### Dashboard

- **Glass dashboard** — translucent dark, blurred background, gradient borders, accent glow.
- **Search** — quick-jump to any feature by name.
- **Draggable & resizable** — drag the header to move, drag the bottom-right corner to resize.
- **Settings preserved per-feature** — every feature has its own collapsible settings block.
- **Export / Import** — back up your entire config to a JSON file. Re-import on a new device.

---

## Default menu

When you install YT+, the userscript manager's menu gains eight commands:

1. **Open YT+ dashboard** (`Alt+Y`)
2. **Mark this video as watched** (`Shift+W`)
3. **Toggle SponsorBlock on/off**
4. **Bookmark this moment**
5. **Check for updates**
6. **Export settings to file**
7. **Import settings from file**
8. **Re-enable features that crashed earlier**

Every one of those except the dashboard toggle is also available as a hotkey once enabled.

---

## Architecture

YT+ is a single ~750 KB userscript. Its structure:

- **IIFE wrapper** with `"use strict"` so nothing leaks to the page.
- **A `S` config object** with 250+ keys, validated and sanitized on every load.
- **A `xa` (feature registry)** that lets each feature register a name, summary, master key, list of keys to re-apply on, an `apply(ctx)` function, and a `settings(div)` function.
- **A `ctx` (feature scope)** with helpers like `addStyle()`, `addListener()`, `addInterval()`, `addTimeout()`, `addObserver()`, `onNav()`, and `addRAF()` — all auto-cleaned up when the feature is disabled or the tab unloads.
- **An IDB layer** (`ytplus_v2` v3) for settings, history, bookmarks, replay history, thumbnails, network buckets, notes, and queue. Cross-tab sync via `BroadcastChannel`.
- **A `fu`/`pe`/etc. mini library** for throttle, debounce, format bytes, format time, memoize, fetch with `@connect` enforcement, and a glass toast system.
- **A single CSS string** embedded as a JS string literal, registered on the first `apply()` and edited on every `cfg.changed` event.

## Performance

YT+ is designed to add less than 30ms to your YouTube page load, use less than 25 MB of RAM at idle, and zero CPU when the tab is hidden. The Adaptive Throttle feature can stretch those numbers further on low-end devices.

## Testing

Each release is verified against:

- `node --check` on the userscript
- A JSDOM-based sandbox that mocks all `GM_*` APIs and counts registered features, registered menu items, and any thrown errors
- A functional test of every added feature's core logic (caption parser, semver comparator, HTML entity decoder, etc)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

If you find a bug, please open an issue with:
- The YT+ version
- The browser and userscript manager
- Steps to reproduce
- What you expected vs what happened

---

## Release history

### v3.0.4 *(current)*
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
