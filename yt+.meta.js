// ==UserScript==
// @name         YT+
// @namespace    https://github.com/mheci/ytplus
// @version      3.0.17
// @description  YT+ makes your YouTube experience smoother, cleaner, and more enjoyable. Customize your visual themes, hide sections you don't want to see, keep track of finished videos, create your own keyboard shortcuts, and automatically skip sponsorship segments. v3.0.14: Major SponsorBlock expansion — added 2 categories (chapter, hook), 4 action types (skip/mute/poi/chapter/full), all 9 /api/skipSegments filters (minVotes, minViews, maxViews, locked, hidden, ignored, trimUUIDs, actionTypes, requiredSegments), public instance picker, per-segment and per-channel override editors, color override per category, up-next preview chip, user-stats HUD, vote/edit/ignore/hide/lock/viewed endpoints, binary-search segment lookup, debounced seekbar repaint, exponential backoff, and 1-hour cache TTL. v3.0.13: Fixed false "update available" notification for users on the latest version (the installed-version string was being compared as a character array, so "3.0.12"[2] === "2" caused 12 != 2 to fire). Both sides are now parsed into integer arrays before comparison. v3.0.12: Dashboard performance fix — removed heavy backdrop-filter, noise overlay, and transform transition so the panel moves 1:1 with the cursor on 144Hz+ monitors.
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
