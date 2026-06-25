# Build instructions (for AMO reviewers)

This document explains how to reproduce an **exact copy** of the add-on package
from this source code.

## What this build does

The source `.js`, `.css`, `.html` and `.json` files are the **unmodified
original source** — nothing is transpiled, bundled, minified or otherwise
machine-generated.

The only generated file is `manifest.json`: the build script copies all source
files verbatim into an output folder and writes a browser-specific
`manifest.json`. For Firefox it adds the `browser_specific_settings.gecko` block
(add-on ID, `strict_min_version`, `data_collection_permissions`). Everything else
is copied byte-for-byte.

## Build environment

- **Operating system:** any (Windows, macOS or Linux). The build is
  platform-independent.
- **Required software:** [Node.js](https://nodejs.org/) **version 18 or newer**
  (tested with Node.js 20 LTS). No other tools are required.
- **External dependencies:** none. There is **no `npm install` step** — the
  project has zero third-party packages.

### Installing Node.js

Download and install the LTS version from <https://nodejs.org/> (or via your
system package manager). Verify the installation:

```
node --version      # must print v18.x or newer
```

## Step-by-step build

1. Unpack this source archive (or clone the repository) and open a terminal in
   the project root (the folder containing `package.json`).
2. Run the Firefox build:

   ```
   node scripts/build.mjs firefox
   ```

   (To build both browsers at once: `node scripts/build.mjs`)
3. The complete, ready-to-load add-on is written to:

   ```
   dist/firefox/
   ```

   This folder matches the submitted add-on package exactly. To create the same
   `.zip` that was uploaded, compress the **contents** of `dist/firefox/` so that
   `manifest.json` sits at the root of the archive.

## Notes

- `node scripts/build.mjs chrome` produces the Chrome package under
  `dist/chrome/` (identical files, the only difference is that the Chrome
  `manifest.json` has no `browser_specific_settings.gecko` block).
- Source repository: <https://github.com/daonware-it/yt-studio-ratio>
