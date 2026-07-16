# YT+ Changelog

All notable changes to YT+ are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For the user-facing release notes and the README, see [README.md](README.md).

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
