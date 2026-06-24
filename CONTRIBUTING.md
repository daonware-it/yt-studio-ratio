# Contributing to YT Studio Ratio

Thank you for taking the time to contribute! 🎉
Any help is welcome — whether it's a bug fix, a new idea, or improving documentation.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting a Bug](#-reporting-a-bug)
  - [Suggesting a Feature](#-suggesting-a-feature)
  - [Contributing Code](#-contributing-code)
- [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you agree to uphold it.

---

## How Can I Contribute?

### 🐛 Reporting a Bug

Before opening a new issue, please:

1. **Search** existing issues to avoid duplicates → [Issues](../../issues)
2. **Verify** you are using the latest version of the extension
3. **Enable Debug Mode** in the extension popup and check the browser console for `[YTSR]` entries

If the problem is new, open a [Bug Report](../../issues/new?template=bug_report.md) and fill out the template completely.

---

### 💡 Suggesting a Feature

Great ideas are always welcome! Open a [Feature Request](../../issues/new?template=feature_request.md) and describe:

- **What** you would like to see
- **Why** it would be useful
- **How** you imagine it working (optional)

---

### 🔧 Contributing Code

Want to contribute code directly? Here is the workflow:

1. **Fork** the repository
2. **Create a branch** for your change:
   ```bash
   git checkout -b fix/badge-not-showing-shorts
   # or
   git checkout -b feat/hover-tooltip
   ```
3. **Make your changes** (see Code Style below)
4. **Test locally** before pushing
5. **Open a Pull Request** against `main`

> ⚠️ Please **open an issue first** before implementing larger features.
> This avoids duplicated effort and ensures the idea fits the project direction.

---

## Setting Up Your Development Environment

### Requirements
- Google Chrome, Edge, or Brave (latest version)
- Any text editor (VS Code recommended)
- Git

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/daonware-it/yt-studio-ratio.git
cd yt-studio-ratio

# 2. Load the extension in Chrome
# → Open chrome://extensions
# → Enable "Developer mode" (top right)
# → Click "Load unpacked" → select this folder

# 3. Open YouTube Studio
# → https://studio.youtube.com
# → Navigate to the "Content" tab
# → Badges should appear next to each video
```

### Enabling Debug Mode

1. Click the extension icon in the toolbar
2. Toggle **Debug** on
3. Reload the YouTube Studio Content tab
4. Open the browser console (`F12`)
5. Filter by `[YTSR]`

```
[YTSR] 8 video(s) with likes detected.   ← Everything working
[YTSR] 0 videos detected.                ← Endpoint may have changed
```

If the endpoint has changed, update the `LIKE_KEYS`, `DISLIKE_KEYS`, and
`VIDEO_ID_KEYS` arrays in `src/inject.js` to match the new field names shown
in the raw console output.

---

## Code Style

This project uses no build tools or bundlers — plain Vanilla JS only.
Please follow these conventions:

### JavaScript

```javascript
// ✅ Good — descriptive names, prefer const
const LIKE_COLOR = '#4CAF50';
const DISLIKE_COLOR = '#F44336';

const formatNumber = (n) => new Intl.NumberFormat('de-DE').format(n);

// ❌ Bad — cryptic names, var
var lc = '#4CAF50';
var x = function(n) { return n.toLocaleString(); }
```

```javascript
// ✅ Good — no eval(), no innerHTML with untrusted data
const badge = document.createElement('div');
badge.textContent = `👍 ${likes}`;

// ❌ Bad — XSS risk
element.innerHTML = `👍 ${userInput}`;
```

### General Rules

| Rule | Details |
|---|---|
| Indentation | 2 spaces |
| Strings | Single quotes `'text'` |
| Semicolons | Always |
| Comments | English preferred |
| No external libraries | No jQuery, no Lodash, no CDN scripts |

---

## Pull Request Process

1. **Title** should be clear and descriptive:
   ```
   ✅  fix: badge not appearing after YouTube update
   ✅  feat: hover tooltip with absolute like/dislike counts
   ❌  update inject.js
   ```

2. **Description** should include:
   - What was changed and why
   - How it was tested
   - Screenshots if the UI changed

3. **Checklist** before submitting:
   - [ ] Tested locally on the Videos tab
   - [ ] Tested locally on the Shorts tab
   - [ ] No leftover `console.log` statements
   - [ ] `manifest.json` version bumped if needed

4. A maintainer will review your PR within **7 days**.

---

## Project Structure

```
yt-studio-ratio/
│
├── manifest.json          ← MV3 configuration and permissions
│
├── src/
│   ├── inject.js          ← Runs in MAIN world, intercepts fetch() responses
│   ├── content.js         ← Injects badges into the YouTube Studio DOM
│   └── styles.css         ← Badge styling
│
├── popup/
│   ├── popup.html         ← Extension popup UI
│   └── popup.js           ← On/off toggle and debug mode
│
├── _locales/
│   ├── de/messages.json   ← German translations
│   └── en/messages.json   ← English translations
│
├── icons/                 ← Extension icons (16, 48, 128px)
├── IMAGE/                 ← Screenshots used in README
│
├── README.md              ← Documentation (German)
├── README.en.md           ← Documentation (English)
├── SECURITY.md            ← Security policy
├── CONTRIBUTING.md        ← This file
└── LICENSE                ← MIT License
```

### Understanding inject.js vs content.js

These two scripts serve very different purposes:

```
inject.js   → world: MAIN     → Runs in YouTube's own page context
               Purpose: Intercept fetch() responses before YouTube processes them
               Communicates outward via window.postMessage()

content.js  → Isolated World  → Runs in the extension context
               Purpose: Receives data from inject.js, builds and inserts badge elements
               Has access to chrome.storage and chrome.* APIs
```

This two-script architecture is required because Chrome extensions cannot
directly access a page's network responses from an isolated content script.

---

## Questions?

Open an [Issue](../../issues) with the label `question` —
no question is too small or too basic. 😊
