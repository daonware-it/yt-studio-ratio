# YT Studio Like/Dislike Ratio

[Deutsch](README.md) · **English**

A small browser extension that brings back the **like/dislike ratio in the
YouTube Studio content tab** — in its own **"Likes (vs. Dislikes)" column** on
the far right, with 👍/👎 numbers, a ratio bar and percentage (exact numbers also
in the tooltip).

![Like/dislike column in the YouTube Studio content tab](IMAGE/content-badges.png)

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

## When nothing appears (debug)

YouTube changes its internal endpoints without warning. If the column stays
empty:

1. Click the extension icon → turn on **Debug mode**
2. Reload the Content tab, open the developer console (F12)
3. Filter for `[YTSR]`. The detected fields and raw payloads are printed there
   (incl. `[YTSR][recon]` and `[YTSR][dislike-DATA]`).

Send me the console output and I'll fine-tune the field mapping exactly.

## Current state (v1.0.0)

- Adds its own **"Likes (vs. Dislikes)" column** on the far right of the content
  tab, after "Comments" — title in the header, one cell per video with 👍/👎
  numbers, a **ratio bar** and percentage.
- **Likes** come from `videos[].publicMetrics.likeCount`; **dislikes** are
  actively fetched via Studio's own endpoint (`get_creator_videos`,
  `metrics.dislikeCount`) — all within your running session, no extra permissions.
- Until the dislikes arrive, the cell shows the like value in a subtle loading
  state; the real ratio appears afterwards.

## Files

```
manifest.json        – configuration (Manifest V3)
src/inject.js        – reads the page's network responses (likes/dislikes)
src/content.js       – builds the column into the header and video rows
src/styles.css       – appearance of the column (bar, spacing)
popup/               – small settings popup (on/off, debug)
icons/               – icons
```
