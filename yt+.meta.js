// ==UserScript==
// @name         YT+
// @namespace    https://github.com/mheci/ytplus
// @version      3.0.18.7
// @description  YT+ makes your YouTube experience smoother, cleaner, and more enjoyable. v3.0.18.7: Second-pass audit fixes — Custom-keyboard-shortcuts capture now removes the previous capture's keydown listener (avoids double-rebind on a click→click→key sequence); dashboard search now hides stale `data-feat` cards silently instead of dereferencing `undefined.name`. All 7 test suites pass. v3.0.18.6: Audit fixes — Import settings menu command now wires to the real import; SB mute path now counts and accumulates time; ccTextColor and idleDimBlur are sanitized before CSS interpolation; update banner rebuilt with textContent. v3.0.18.5: SB privacy-mode fix. v3.0.18.4: _dm ReferenceError freeze fix. v3.0.18.3: Memory protection system. v3.0.18.2: _dm_active freeze fix. v3.0.18.1: Hotkey freeze fix. v3.0.18: Hotkeys everywhere + keyboard-friendly dashboard. v3.0.17: Update banner now opens the user.js file. v3.0.16: Data Minimization. v3.0.15: Hotfix. v3.0.14: Major SB expansion. v3.0.13: Update notif fix. v3.0.12: Dashboard perf fix.
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
