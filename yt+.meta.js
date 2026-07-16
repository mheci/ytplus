// ==UserScript==
// @name         YT+
// @namespace    https://github.com/mheci/ytplus
// @version      3.0.18.5
// @description  YT+ makes your YouTube experience smoother, cleaner, and more enjoyable. Customize your visual themes, hide sections you don't want to see, keep track of finished videos, create your own keyboard shortcuts, and automatically skip sponsorship segments. v3.0.18.5: SponsorBlock privacy-mode fix. Since v3.0.14 the SB post-fetch lookup searched the response for `p.hash === hash`, but the SB server actually returns `{videoID, segments}` entries — the `hash` field never existed. Privacy mode (default ON) silently returned zero segments for every video because the lookup never matched. v3.0.18.4: CRITICAL freeze fix. v3.0.18.3: Memory protection system. v3.0.18.2: CRITICAL freeze fix. v3.0.18.1: Hotkey freeze fix. v3.0.18: Hotkeys everywhere + keyboard-friendly dashboard. v3.0.17: Update banner now opens the user.js file. v3.0.16: New "Data Minimization" feature. v3.0.15: Hotfix. v3.0.14: Major SponsorBlock expansion. v3.0.13: Fixed false "update available" notification. v3.0.12: Dashboard performance fix.
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
