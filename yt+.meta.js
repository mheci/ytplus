// ==UserScript==
// @name         YT+
// @namespace    https://github.com/mheci/ytplus
// @version      3.0.21.1
// @description  YT+ makes YouTube yours: kill ads, clutter, and telemetry; add SponsorBlock, themes, screenshots, keyboard control, session history, and 120+ opt-in features. 100% local. v3.0.21.1: bugfix — channel handle parsing for per-channel speed/SB/notes (was 'channel' for /channel/ URLs), screenshot clipboard null-blob handling with download fallback, and cross-platform CI hardening.
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
// @icon         https://github.com/mheci/ytplus/releases/latest/download/icon.png
// @noframes
// @updateURL    https://github.com/mheci/ytplus/releases/latest/download/yt%2B.meta.js
// @downloadURL  https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js
// ==/UserScript==
