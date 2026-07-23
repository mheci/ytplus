# YT+ Production Audit Ledger

Comprehensive multi-pass audit of `yt+.user.js` (25,326 lines @ v3.0.19.0 baseline).
Methodology: 10 themed passes over the entire codebase, every pass logs findings
with severity and status; each fix ships with a regression test; the full matrix
(syntax + 7 suites) must stay green before every commit.

Baseline recovered: 6 jsdom test suites (241→checks) were rescued from git history
(they were deleted in the "strip repo" commit ccc6825). All 6 pass on the pristine
v3.0.19.0 checkout. A 7th suite (`test_scope_guard.js`) was added during Pass 1.

Severity legend: **CRIT** = user-visible breakage/data corruption · **MAJOR** =
feature degraded / wrong behavior · **MINOR** = polish/perf/hygiene.

---

## Pass 1 — Scope & identifier integrity (ESLint scope scan + declaration census)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1.1 | **CRIT** | `function Da` declared twice at IIFE top level (lines 6343 force-CC state reader vs 7816 channel-handle normalizer). Hoisting → 7816 wins everywhere. Force-CC state reader returned `""`; every `t.enabled`/`t.displayed` consumer silently dead. | **FIXED** (renamed `Cc_state` / `Cb_norm`) |
| 1.2 | **CRIT** | `function Va` declared twice (6376 force-CC apply vs 7852 anchor-info extractor). Force-CC apply became a no-op returning `{handle:"",name:"",href:""}` — the entire force-CC feature never ran. | **FIXED** (`Cc_apply` / `Cb_anchorInfo`) |
| 1.3 | **CRIT** | `function qa` declared twice (7837 channel-block list builder vs 22551 font-family list). (a) Passive blocking compared channel handles against ~30 font names → never matched. (b) The "Block" button's click handler pushed the new handle into `qa()` — the FONT list — and persisted `font list + channel` into `channelBlockerList`: **config data corruption on every press**. | **FIXED** (`Cb_parseList` / `Yt_fontFamilies`) |
| 1.4 | **CRIT** | `function Fo` declared twice (22472 dashboard font-preview row builder vs 22883 drag/resize clamp-rect). Settings render called `Fo("Font family…","ccFontFamily")` → clamp version → `appendChild({x:NaN,y:NaN,w:NaN,h:NaN})` → TypeError, killing the captions settings card render path. | **FIXED** (`Yp_fontRow` / `Yp_clampRect`) |
| 1.5 | MINOR | `(r = r)` self-assignment in buffer-health rebuffer toast handler — the toast-suppression counter never incremented, so "Rebuffer #N" toasts were never capped at 4. | **FIXED** (`r += 1`) |
| 1.6 | INFO | `no-unmodified-loop-condition` on FCW enumeration loop — false positive (loop advances continuation cursor `c` and counter `s`). | WONTFIX (benign) |
| 1.7 | INFO | `_kp` referenced via `typeof _kp !== "undefined" && _kp` — intentional soft-dependency on the hotkey IIFE; no TDZ hazard. | OK by design |

Introduced: the 4 collisions existed **before** v3.0.19.0's refactor (verified via
`git log -S`: `Fo` pair since v3.0.3, `qa` pair since v1.0.0) — long-standing
latent damage that no previous pass caught, because on the *last-declaration*
call sites everything works "by accident" and only the *shadowed* consumers die.

Regression guard: `tests/test_scope_guard.js` (24 checks) asserts uniqueness of
every top-level declaration, the presence + once-only declaration of the 8
renamed helpers, the call-site wiring, and the absence of the old names.

## Pass 2 — Boot, lifecycle & memory

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 2.1 | **MAJOR** | `pagehide` called `_mp.disposeAll()`. On BFCache restores (YouTube SPA back/forward nav) the whole resource registry came back dead: `_running=false` forever, cache list wiped, every safe-wrapped listener/timer/observer released. On a real tab close teardown buys nothing (the JS context dies anyway). | **FIXED** — pagehide is now a soft maintenance checkpoint; registry survives the freeze. |
| 2.2 | MINOR | `_mpMaintHandle.untilHidden` "pause while hidden" mechanism was set by a visibilitychange listener but **never read by anything**, and once set (first hide) never cleared — wrong in both directions. | **FIXED** — the maintenance tick now checks `document.visibilityState` itself; dead mechanism removed. |
| 2.3 | MINOR | GM_info-less version fallback was stale `"2.1.0"`. | **FIXED** → bundled-version literal (kept in lockstep by `test_meta.js`). |
| 2.4 | INFO | Boot, kill-switch, TrustedTypes passthrough (guarded `!defaultPolicy`), nav listener with `J` guard, `requestIdleCallback` deferral, 6h idle update interval + 30s style watchdog — all verified sound. | OK |

## Pass 3 — Network wrappers & update flow

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 3.1 | **CRIT** | Geo override unpatchers (`En/Bn/Pn`) restored `e.fetch` / `XMLHttpRequest.prototype` / `navigator.sendBeacon` to the **pristine** references. In the layered-wrapper world (`_dm` installs at IIFE start, netMonitor wraps later), toggling geo (or its patch sub-toggles) off **silently knocked data-minimization out of the chain for the rest of the session** — and any future geo re-install then captured pristine, permanently bypassing `_dm`. | **FIXED** — unpatchers are no-ops; every geo wrapper persists and self-neutralizes on `xn()` AND its own sub-toggle (fetch/XHR/beacon gates extended). |
| 3.2 | **CRIT** | Same bug class, second site: netMonitor teardown `mr()` also restored the pristine globals (fetch/XHR/beacon) on every apply-with-net-off — same `_dm` knockout. | **FIXED** — `mr()` keeps local cleanup only; net wrappers persist and self-neutralize on `master && !privacyShield && subFlag`. |
| 3.3 | MINOR | netMonitor's `he()`-style GM fetch (`he`) is host-allowlisted (SB servers + www.youtube.com + user-configured hosts); GitHub API is reached directly by the update checker, not through the allowlist. Verified no allowlist leaks. | OK |
| 3.4 | INFO | Update checker (`Fu`) verified: correct version tuple compare, success-only cache write, clickable toasts, 10-min throttle on auto path, banner → direct user.js download URL. | OK |
| 3.5 | INFO | `_dm` filter review: tracker host list + path rules are precise; `googlevideo.com` intentionally never blocked (media lives there); 204/200 synthetic responses correctly satisfy YouTube's success checks (XHR synthesizes `load`+`loadend` so `onload` handlers fire). | OK |

## Pass 4 — SponsorBlock core

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 4.1 | **MAJOR** | Segment cache key omitted the **server identity** (`sbServerPreset`, `sbServer`) and **privacy mode** — switching either in the dashboard served stale segments from the old server/mode for up to the full TTL (1h × backoff). Privacy-mode bucket payloads could be replayed as direct-lookup payloads. | **FIXED** — filter key now includes preset, custom server URL, and privacy flag. |
| 4.2 | MINOR | `St_fetchInFlight` counter was only ever decremented, never incremented — dead state. | **FIXED** — removed. |
| 4.3 | MINOR | Comment promised "all 9 /api/skipSegments filters" but `actionTypes`/`requiredSegments` are never sent (action resolution is client-side by design). Doc-only gap. | DOCUMENTED |
| 4.4 | INFO | Skip/mute tick (`xt`) verified: per-UUID skip/mute guard, binary-search index cache, mute/restore pairing (`bt/kt/vt`), stats persistence, viewed-endpoint fire-and-forget. Privacy-mode bucket lookup matches `p.videoID` (regression-guarded by test_sb.js). | OK |

## Pass 5 — Config, storage & cross-tab sync

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 5.1 | MINOR | Settings import wrote history/bookmark rows **unvalidated** into IDB: one malformed record rejected the whole `Promise.all` mid-write, leaving a silent partial import with no error toast. | **FIXED** — rows are filtered to well-formed shapes (valid `videoId`/`id`) before any write. |
| 5.2 | INFO | Three-store merge (GM/LS/IDB) with `ver`+`ts` ordering, type-coercing sanitizer `D()`, derived-mode migration (`feedWatchedMode` etc.), cross-tab BroadcastChannel + storage-event sync with echo-suppression flags (`H`/`N`) — all verified. | OK |

## Pass 6 — DOM/CSS injection safety

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 6.1 | INFO | Every `innerHTML` sink audited: the `a()` helper (TT-policy mediated), in-video-search clears (`=""`), 2 static flex rows, palette/cheat footers (static). All `wr()` SVG sites pass static literals. No dynamic-data `innerHTML` anywhere. | OK |
| 6.2 | INFO | CSS interpolation: config colors parsed via hex regex, numbers clamped, font family strips `;{}<>`, thumbnail URLs `encodeURI`-escaped before `url(...)`. | OK |

## Pass 7 — Dashboard & UI

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 7.1 | **CRIT** | (From 1.4) Caption settings card died on render: `Fo("Font family (with preview)","ccFontFamily")` resolved to the clamp-rect twin → `appendChild(plain object)` → TypeError. | **FIXED** in Pass 1 (`Yp_fontRow`/`Yp_clampRect`). |
| 7.2 | INFO | Drag/resize pointer-capture flow, `resize` listener pairing, staggered card build with abort-on-close, search null-deref guard, focus-restore on Esc — verified. | OK |

## Pass 8 — Hotkeys, palette & cheat sheet

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 8.1 | MINOR | Legacy `frameBack` action had no `Math.max(0, …)` clamp (newer twin had it). Media element self-clamps; cosmetic. | WONTFIX (no behavioral delta) |
| 8.2 | INFO | `_kp` registry: binding normalization shared with legacy `Jo()`, `conflicts()` dedupes both namespaces, text-target and repeat guards, bubble-phase dispatch, opt-in gating (`hotkeyOptIn`) — verified. Re-capture lifecycle already centralized (`_nClear`). | OK |

## Pass 9 — Playback & media features

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 9.1 | **CRIT** | (From 1.1/1.2) Force-CC: state reader shadowed → `""`; apply shadowed → no-op; "stuck-on" verify interval read `""` instead of `{enabled,displayed}`. Entire feature family dead. | **FIXED** in Pass 1 (`Cc_state`/`Cc_apply`). |
| 9.2 | MINOR | Screenshot path verified safe on YouTube's MSE playback (no canvas taint); rare progressive-MP4 path throws SecurityError which is caught with an error toast. | OK (+ new clipboard path) |
| 9.3 | INFO | No WebAudio usage anywhere (no per-video AudioContext leak class). PiP, sleep timer, speed, loop, frame-step reviewed. | OK |

## Pass 10 — Compat, precision & cleanup (YT Music / mobile / kill-switch)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 10.1 | INFO | `@match` covers www/m/music; `@noframes` keeps the script out of embeds. Kill-switch (`ytplus=off`, localStorage/sessionStorage) + re-enable menu command verified. | OK |
| 10.2 | INFO | `_a()` safe-mode deferral gates every feature apply quarantine-safe; watch-style watchdog re-applies only when style markers vanish. | OK |

---

## Release engineering changes (v3.0.20.0)

- **Creative features shipped**: clipboard screenshots (`screenshotClipboard`), configurable hotkey speed step (`speedStep`), per-channel speed memory (`speedPerChannelOn`, LRU-capped single IDB record), SponsorBlock jump-to-highlight palette action (`sb.jumpToHighlight`, unbound by default).
- **Artifacts**: `icon.png` restored + optimized (1.6 MB → 62 KB, 1024px → 256px) fixing the 404 `@icon`; `yt+.meta.js` restored to repo and is regenerated verbatim from the user.js header (2,005 bytes; `@description` slimmed 4.5 KB → ~0.55 KB so every background update check fetches less).
- **QA**: test suites recovered from git history into `tests/` (+3 new: `test_scope_guard.js` 24 checks, `test_features.js` 38 checks, `test_meta.js` 23 checks) — **9 suites, 324+ checks**, wired into `npm test` and CI.


## Artifact issues (outside the script)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| A.1 | MAJOR | `@icon` header → `https://raw.githubusercontent.com/mheci/ytplus/main/icon.png` returns **404** (icon.png was deleted in the "strip repo" commit; exists only as a release asset). Managers show a broken icon and re-fetch a 404 on every install. | **FIXED** (restored + optimized: 1024px/1.6 MB → 256px/62 KB; guarded by `test_meta.js`) |
| A.2 | MINOR | `@description` meta header is ~4,500 chars of accumulated release notes; managers truncate it and it bloats meta.js fetches on every update check. | **FIXED** (slimmed to ~0.55 KB; ≤900-char budget enforced by `test_meta.js`) |
| A.3 | MINOR | Repo carried no test infra after the strip (6 suites deleted); CI only ran `node --check`. | **FIXED** (tests/ restored + scope guard + package.json + CI wiring) |
| A.4 | MINOR | `yt+.meta.js` (required by @updateURL) absent from repo root — release assets made by hand. | **FIXED** (restored; regenerated verbatim from the header; version-sync enforced by `test_meta.js`) |
| A.5 | MINOR | CHANGELOG.md deleted in strip; restored from history. | **FIXED** |
