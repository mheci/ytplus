// ==UserScript==
// @name         YT+
// @namespace    https://github.com/mheci/ytplus
// @version      3.0.18.9
// @description  YT+ makes your YouTube experience smoother, cleaner, and more enjoyable. v3.0.18.9: "Check for updates" entry improvements. The "up to date" toast is now clickable to open the GitHub releases page so users can read per-version changelogs; the "check failed" toast is now clickable to retry; the cache timestamp is now written only on successful response (so a single network blip no longer suppresses the next 10 minutes of auto-checks); the GitHub URLs are defined once as module-scope constants; the `Fu` parameter is now named `force` instead of shadowing the outer `e` (unsafeWindow). All 7 test suites pass (218 checks). v3.0.18.8: Audit fixes from a third, integrated pass - bookmark duplicate-id (now includes Date.now()), hotkey re-capture lifecycle refactored into _nClear() helper, resume overlay thumbnails use full URL encoding, dashboard title uses createElement. Behavioral tests for v3.0.18.7 fixes; action registry integrity check. v3.0.18.7: Hotkey re-capture leak + dashboard search null-deref. v3.0.18.6: Import menu, SB mute count, cc/idle CSS sanitization, update banner. v3.0.18.5: SB privacy-mode fix. v3.0.18.4: _dm ReferenceError freeze fix. v3.0.18.3: Memory protection system. v3.0.18.2: _dm_active freeze fix. v3.0.18.1: Hotkey freeze fix. v3.0.18: Hotkeys everywhere + keyboard-friendly dashboard. v3.0.17: Update banner now opens the user.js file. v3.0.16: Data Minimization. v3.0.15: Hotfix. v3.0.14: Major SB expansion. v3.0.13: Update notif fix. v3.0.12: Dashboard perf fix.
// @author       YT+ Team
// @license      GPL-3.0-or-later
// @homepageURL  https://github.com/mheci/ytplus
// @supportURL   https://github.com/mheci/ytplus/issues
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_info
// @grant        unsafeWindow
// @connect      sponsor.ajay.app
// @connect      sponsor.lunatic.no
// @connect      sb.minastyr.com
// @connect      sponsorblock.mchang.xyz
// @connect      sponsor.tatudoes.tech
// @connect      www.youtube.com
// @connect      self
// @connect      googlevideo.com
// @connect      ytimg.com
// @connect      ggpht.com
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @connect      objects.githubusercontent.com
// @icon         https://raw.githubusercontent.com/mheci/ytplus/main/icon.png
// @noframes
// @updateURL    https://github.com/mheci/ytplus/releases/latest/download/yt%2B.meta.js
// @downloadURL  https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js
// ==/UserScript==
