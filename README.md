# YT+

Make YouTube yours. One small add-on that fixes what bothers you — ads, loud sponsors, ugly themes, and clutter everywhere.

**[Add to your browser](https://github.com/mheci/ytplus/raw/main/yt+.user.js)**

## What's new in v3.0.0

- **Glassmorphism dashboard** — a full redesign with blurred translucent panels, gradient borders, accent glow, and a brand-new icon (play + plus, red-to-magenta gradient on charcoal).
- **Slimmer menu** — eight focused commands instead of a dozen. Open dashboard, mark watched, toggle SponsorBlock, bookmark, check for updates, export, import, re-enable crashed features.
- **Sharper persistence** — IndexedDB-backed storage with cross-tab BroadcastChannel sync, debounced writes, lazy thumbnails, and smarter IDB migrations.
- **Resource-aware features** — every feature has a `teardown()` so off tabs free memory, observers are throttled, and network hooks use a per-host budget.
- **Auto-update via GitHub Releases** — pushes a banner to the dashboard when a newer release is detected.
- **30 new features** — read-aloud, watch goals, chapter loops, keyboard cheat-sheet, queue manager, smart resume queue, screenshot regions, video metadata inspector, audio-duck notifications, sleep schedule, tab volume mixer, channel notes sync, video notes, subtitle translation, bulk channel actions, screenshot strip, subscribe shortcut, subscribe confirm, always-show progress bar, redirect Shorts, copy-timestamp / copy-info / open-transcript buttons, watch history heatmap, watch stats, unified heatmap, hotkey customization, and more.

## What it does

**Skip the boring parts** — sponsored segments, intros, outros, and self-promos get skipped automatically. You pick exactly which types to skip.

**Remember where you left off** — come back to any video and pick up right where you stopped. See everything you've watched in one place, with a 53x7 heatmap of when you watch.

**Get rid of ads** — skip them, mute them, or speed through them so fast they barely exist.

**Make it look good** — choose from 30+ beautiful colour themes like Dracula, Nord, or Catppuccin. Or write your own styles.

**Clean up the mess** — hide Shorts, recommendations, comments, watermarks, and anything else that gets in the way. One-click presets do the hard work for you.

**Better sound** — boost the volume way past YouTube's limit. Even out loud and quiet parts. Per-tab volume mixer, audio-duck when a notification arrives.

**Take control** — slow down, speed up, loop sections, zoom in, adjust colours, take screenshots (full or region or strip), read-aloud, watch goals, sleep schedule. Everything works the way you want.

**Keyboard shortcuts** — bookmark moments, take screenshots, jump chapters, copy timestamp, copy video info, open transcript. All remappable, with a cheat-sheet inside the dashboard.

## How to install

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click the **"Add to your browser"** link above
3. Confirm the install — done!

## How to update

It updates itself. YT+ polls `https://api.github.com/repos/mheci/ytplus/releases/latest` and compares the version to the running one. When a new version is ready, the dashboard shows a banner with a one-click install. Your userscript manager will also grab updates from `yt+.meta.js` automatically.

## Works on

- YouTube, YouTube Mobile, YouTube Music
- Chrome, Firefox, Edge, Brave, and more

## Privacy

YT+ stores your settings and watch history locally in your browser using IndexedDB. It only talks to the network for:
- SponsorBlock (sponsor.ajay.app) to fetch and submit segment data
- YouTube itself (to play videos)
- A single GitHub API call to check for new releases

No tracking, no analytics, no third-party scripts.

## Questions or problems?

Open an issue [here](https://github.com/mheci/ytplus/issues).

## License

Free and open source under the GPL-3.0 license.
