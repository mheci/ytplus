# YT+ Changelog

All notable changes to YT+ are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For the user-facing release notes and the README, see [README.md](README.md).

---

## [3.0.18.10] - 2026-07-16

### Fixed

- **"Force video as watched" hotkey now reliably registers in YouTube Account History.** The single-video `Ut()` path (Shift+W) used to fire only the hardcoded legacy `/api/stats/*` and InnerTube endpoints. These rely on locally-constructed params (`cpn`, `cbrver`, `cver`, etc.) that can drift from the current YouTube session, causing the press to silently fail to register in the user's Account History page. v3.0.18.10 adds the per-video `playbackTracking` URL path that the channel-wide `nn()` already uses — the script fetches `/youtubei/v1/player` to obtain the per-video `videostatsPlaybackUrl` / `videostatsWatchtimeUrl` / `atrUrl` / `qoeUrl` / `ptrackingUrl` / `videostatsDelayplayUrl`, then fires each one via `sendBeacon`. The legacy endpoints are kept as a belt-and-suspenders fallback (some YT endpoints are more forgiving than others about missing session tokens). Both paths run on every press by default; the new `forceWatchedAccountHistory` toggle can disable the new path if the user wants only the local IDB update.

### Added

- **`forceWatchedAccountHistory` config flag** (default `true`) — mirrors `forceChannelWatchedAccountHistory`. When `false`, the player fetch and per-URL beacon sends are skipped; only the local IDB write + legacy hardcoded endpoints run.
- **`forceWatchedLocalHistory` config flag** (default `true`) — mirrors `forceChannelWatchedLocalHistory`. When `false`, the local IDB row is left untouched; only the YouTube API endpoints fire.
- **Toast feedback.** The single-video hotkey used to do the work silently; users couldn't tell whether the press actually fired. Now shows a 1.5s "Marked as watched." toast at the start of `Kt()`.
- **Settings UI** for both new flags in the existing "Force Watched" feature card.

### Tests

- 241 total checks across 8 suites, all passing (up from 218 in v3.0.18.9). The new `test_force_watched.js` (23 checks) drives `Ut()` in jsdom with a mocked `ytcfg` + `fetch` + `navigator.sendBeacon`, then asserts:
  - The two new config flags exist with the expected defaults.
  - With both flags ON, a `POST /youtubei/v1/player` fetch goes out and the five `playbackTracking` URLs (playback / watchtime / atr / qoe / ptracking) are fired via `sendBeacon`.
  - The watchtime fires for both `state=playing` and `state=ended`.
  - With `forceWatchedAccountHistory=false`, no player fetch goes out and no `playbackTracking` beacons are sent.
  - The toast element contains the expected text after the press.
  - Source-grep regression guards confirm the new path uses `Ot('player', ...)` and `Qa()`, and the legacy `/api/stats/*` paths are still wired (belt-and-suspenders).

---

## [3.0.18.9] - 2026-07-16

### Fixed / Improved

- **"Up to date" toast is now clickable.** Previously, when you were on the latest version the script showed a toast that disappeared after 4 seconds. The new toast is a button: clicking it opens the [GitHub releases page](https://github.com/mheci/ytplus/releases) where you can read the per-version changelogs. The auto-update check only compares version strings; it doesn't surface release notes, so this was the only way to get there.
- **"Check failed" toast is now clickable to retry.** Previously, when a check failed (network blip, GitHub rate-limit, etc.) the toast just sat there for 4 seconds and disappeared. You had to wait, then click "Check for updates" again. The new toast is a button: clicking it immediately re-runs the check.
- **Cache is now written only on successful response.** The previous code wrote the cache timestamp BEFORE firing the request, so a single network blip would suppress the next 10 minutes of auto-checks. Now the cache is written inside the success branch of `onDone()`. Manual checks (`force=true`) still update the cache so two manual clicks within 10 minutes are throttled. **This is a real bug fix** — a single failed check used to lock out the auto-check for 10 minutes; now it correctly only throttles on success.

### Refactored

- GitHub URLs centralized as module-scope constants (`_GITHUB_API_LATEST`, `_GITHUB_LATEST_USERJS`, `_GITHUB_RELEASES`, `_CHECK_CACHE_KEY`). One place to audit outbound links.
- `Fu`'s parameter renamed from `e` to `force`. The old name shadowed the outer `e` (= `unsafeWindow`) and made the rest of the function harder to read.
- Toast click handlers are idempotent (use a `_ytpXxxBound` flag on the singleton toast element) so repeated update checks don't stack duplicate listeners.

### Exposed

- `window.__ytplusLastSeenLatest` — the most recent version string the script saw on a successful check. External scripts can read this to detect when the user is on a known-stale version.

### Tests

- 218 total checks across 7 suites, all passing (up from 213 in v3.0.18.8). The new `test_update_check.js` checks are:
  - `Update check cache is written on success only` — verifies the cache key `_CHECK_CACHE_KEY` is written exactly once in the source, and that write is in the success path.
  - `"Up to date" toast is clickable` — verifies the source has a click handler on the toast that opens the GitHub releases page.
  - `"Check failed" toast is clickable to retry` — verifies the source has a click handler on the error toast that calls `Fu(true)`.
  - `Fu's parameter is named "force"` — guards the readability fix.
  - `GitHub URLs are defined as module-scope constants` — guards the DRY fix.

---

## [3.0.18.8] - 2026-07-16

### Fixed

- **Bookmark duplicate-id data loss.** Pressing `B` twice at the same video position silently overwrote the first bookmark instead of creating a new one. The id `videoId + "_" + Math.round(100 * position)` collided for any two bookmarks at the same second on the same video; the second `k("bookmarks", n)` call did a `PUT` and replaced the first. The id now includes `Date.now()`, so two presses always produce distinct ids and both bookmarks survive.
- **Hotkey re-capture lifecycle refactored.** The v3.0.18.7 fix that removed the previous capture's `keydown` listener was applied in two of the three places that ended a capture, leaving Escape as a potential leak path. The capture lifecycle is now centralized in a single `_nClear()` helper called from every termination path (the new click handler, the keypress handler on a real key, and the keypress handler on Escape), which makes the "leak the keydown listener" class of bug structurally impossible. The behavioral test in `test_hotkeys.js` actually drives two rebind buttons in jsdom and asserts that only the second capture's keypress fires — not just a source-grep check.
- **Resume overlay thumbnail CSS injection hardening.** Both the small resume card and the full overlay interpolated `e.thumbnail` into a CSS `url(...)` with only single-quote escaping, so a stray `)` or `\` in a YouTube CDN URL would have broken the rule. Now wrapped in `encodeURI()` (with the fallback to the original expression if `encodeURI` itself throws). Defense-in-depth; YouTube CDN URLs are well-formed in practice.
- **Dashboard title DOM construction.** The header `[=] YT+ v<version>` markup was built with the `a()` helper (which uses `innerHTML` under the hood). The `version` is hardcoded by the script metadata so this is defense-in-depth, but the title is now built with `createElement` + `textContent` for consistency with the v3.0.18.6 banner fix and the v3.0.18.7 search null-deref fix's "use textContent everywhere you can" pattern.

### Tests

- 213 total checks across 7 suites, all passing (up from 205 in v3.0.18.7). The new `test_hotkeys.js` checks are:
  - **Behavioral hotkey re-capture test** — opens the dashboard in jsdom, clicks two rebind buttons in sequence without a keypress in between, dispatches a single keydown event, asserts that exactly one action (not two) got rebound. This catches the bug class regardless of how the fix is written.
  - **Behavioral dashboard search null-deref test** — opens the dashboard, injects a ghost card with a `data-feat` that doesn't exist in the registry, types in the search box, and asserts that the ghost card is hidden and no exception is thrown. This replaces the v3.0.18.7 source-grep test with a real behavior check.
  - **Action registry integrity check** — walks `xa.list()` and asserts that every action has a unique id, a non-empty label, and that the registry has at least 30 actions. This is a regression guard against the next duplicate-id or accidentally-removed action.

---

## [3.0.18.7] - 2026-07-16

### Fixed

- **Hotkey re-capture listener leak.** The "Custom Keyboard Shortcuts" panel in the dashboard captured keypresses via `document.addEventListener("keydown", a, true)` (capture phase) and tracked the active capture in a module-scope `_n` variable. If the user clicked button A (start capture), then clicked button B (start a different capture) without pressing a key in between, the visual reset ran but A's keydown listener stayed attached. The next keypress fired BOTH `a` closures, and BOTH buttons got rebound to the same key. Now the previous capture's handler is explicitly `removeEventListener`-ed when a new capture starts. The `_n` object also stores the `handler` reference so the new removal call has a target.
- **Dashboard search null-dereference on stale `data-feat`.** The search filter mapped over every `.ytp-card` and called `va.get(t.dataset.feat)` to read the feature, then dereferenced `a.name` on the result. If a feature was removed between renders, `Map.get` returned `undefined` and the next line `a.name` threw `TypeError: Cannot read properties of undefined` on every keystroke. The search input was effectively bricked in that state. Now the card is hidden with `t.style.display = "none"` and the search continues with the remaining cards. No behavior change for fresh renders where every card has a valid feature.

### Tests

- 205 total checks across 7 suites, all passing (up from 203 in v3.0.18.6).

---

## [3.0.18.6] - 2026-07-16

### Fixed

- "Import settings from file" Tampermonkey menu command now wires to the real import.
- SponsorBlock mute path now counts and accumulates time.
- `ccTextColor` and `idleDimBlur` are sanitized before CSS interpolation.
- Update banner rebuilt with `textContent`.

### Known feature gaps

- `sbChapterRules` (chapter skip rules per channel) is collected but never applied.
- No UI to manage saved bookmarks (you can save with the B hotkey, but can't list, rename, or delete).

---

## Earlier versions

See [README.md](README.md) for the full release history through v3.0.12.
