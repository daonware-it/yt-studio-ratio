# YT Studio Like/Dislike Ratio

[Deutsch](README.md) · **English**

A small browser extension that brings back the **like/dislike ratio in the
YouTube Studio content tab**. Each video gets a badge like `👍 92.4 %` (with the
exact numbers in the tooltip).

![Like/dislike badges in the YouTube Studio content tab](IMAGE/content-badges.png)

<p align="center">
  <img src="IMAGE/popup-en.png" alt="Settings popup (English)" width="280">
  &nbsp;&nbsp;
  <img src="IMAGE/popup-de.png" alt="Settings popup (German)" width="280">
</p>

## How it works (and why it's harmless)

- The extension only runs on `studio.youtube.com`.
- It **reads along** with what the Studio page loads anyway (internal
  `youtubei` endpoints) and re-displays the ratio.
- It makes **no requests of its own**, does not forge auth headers, and sends
  **nothing to third parties**. Everything happens locally in the browser.
- Everyone only ever sees the data of **their own signed-in channel** — because
  the extension simply uses the existing session.

## Install locally (for testing)

**Chrome / Edge / Brave**
1. Open `chrome://extensions`
2. Enable "Developer mode" in the top right
3. "Load unpacked" → select this folder
4. Open `studio.youtube.com` → Content, reload the page if needed

**Firefox**
1. `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → select `manifest.json`
   (For permanent use the add-on must be signed on AMO.)

## When no badge appears (debug)

YouTube changes its internal endpoints without warning. If nothing shows up:

1. Click the extension icon → turn on **Debug mode**
2. Reload the Content tab, open the developer console (F12)
3. Filter for `[YTSR]`. The raw payloads are printed there.
4. In `src/inject.js`, extend the lists `LIKE_KEYS`, `DISLIKE_KEYS` and
   `VIDEO_ID_KEYS` with the field names you actually find.

Send me the console output and I'll fine-tune the field mapping exactly.

## Publishing so everyone can use it

- **Chrome Web Store:** create a developer account (one-time $5 fee), upload the
  folder as a ZIP, fill in the store listing + privacy notice, wait for review.
- **Firefox (AMO):** upload the ZIP at `addons.mozilla.org` and get it signed.

You can keep the privacy text short: "Reads only the like/dislike data of the
signed-in channel in YouTube Studio, locally. No data is stored or transmitted."

## Limits / honesty

- Relies on undocumented Studio interfaces → may break after a YouTube update and
  then needs an adjustment.
- If YouTube stops including the like/dislike numbers in the content responses at
  all, it would have to switch to the official YouTube Analytics API — that is
  stable, but requires OAuth per user and is not ideal for "everyone, no setup".
- This code is a tested-and-structured foundation, but not verified against the
  live page. Plan for initial fine-tuning via debug mode.

## Current state (v0.7.0)

- Shows a **like badge** (👍 number) per video in the content tab. The fields are
  hard-wired: `videos[].videoId` + `videos[].publicMetrics.likeCount`.
- **Dislikes/ratio are not included yet**: YouTube does not deliver the dislike
  number in the content endpoint. That will come later via the YouTube Analytics
  API (then the like badge becomes a real ratio).
- If no badge appears: turn on **Debug** in the popup, reload the content tab,
  filter the console for `[YTSR]`. `[YTSR] N video(s) with likes detected.` means
  the data is there.

## Files

```
manifest.json        – configuration (Manifest V3)
src/inject.js        – reads the page's network responses
src/content.js       – builds the badges into the video rows
src/styles.css       – appearance of the badges
popup/               – small settings popup (on/off, debug)
icons/               – icons
```
