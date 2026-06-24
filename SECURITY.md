# Security Policy

## Supported Versions

Only the latest release receives security updates.

| Version | Supported |
|---------|-----------|
| 1.x (latest) | ✅ Yes |
| < 1.0 | ❌ No |

---

## Scope

This extension runs **entirely locally** in your browser. It:

- ✅ Reads network responses that YouTube Studio already loads in your browser session
- ✅ Stores settings locally via `chrome.storage`
- ❌ Does **not** send any data to external servers
- ❌ Does **not** collect analytics or telemetry
- ❌ Does **not** use any third-party APIs
- ❌ Does **not** store or transmit credentials

Because of this, the attack surface is intentionally minimal.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub Issue.**

Instead, report it privately via one of these channels:

### Option A — GitHub Private Advisory (Preferred)
1. Go to the [Security tab](../../security) of this repository
2. Click **"Report a vulnerability"**
3. Fill out the form with as much detail as possible

### Option B — Email
Send a description to: **security@daonware.de**

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional but appreciated)

---

## What Happens After You Report

| Timeline | Action |
|---|---|
| **Within 48 hours** | Acknowledgement of your report |
| **Within 7 days** | Assessment and severity rating |
| **Within 30 days** | Fix released (for confirmed issues) |
| **After fix** | Public disclosure + credit to reporter |

---

## Threat Model

Given the local-only architecture, the most realistic risks are:

### 1. YouTube Internal API Changes
YouTube may change the internal `youtubei` endpoints this extension intercepts.
**Impact:** Extension stops working — not a security issue, but a functionality one.
**Mitigation:** Debug mode built in. Fixed via updates to `LIKE_KEYS` / `DISLIKE_KEYS` in `src/inject.js`.

### 2. Malicious Page Content Injection
Because `inject.js` runs in the `MAIN` world, a compromised YouTube Studio page
could theoretically expose data to the extension's parsing logic.
**Mitigation:** The extension only reads `likeCount` / `dislikeCount` fields and
ignores all other page content. No `eval()` or dynamic code execution is used.

### 3. Supply Chain / Dependency Attacks
This extension has **zero runtime dependencies** — no npm packages, no CDNs,
no external scripts are loaded. The attack surface is limited to this repository alone.

---

## Security Best Practices Used in This Project

- **Manifest V3** — Stricter permissions model enforced by Chrome
- **Minimal permissions** — Only `storage` and `host_permissions` for `studio.youtube.com`
- **No remote code** — No external scripts, no CDNs, no `eval()`
- **No data exfiltration** — All processing is local, nothing leaves your browser
- **Content Security Policy** — Enforced by MV3 by default

---

## Hall of Fame

We appreciate responsible disclosure. Confirmed reporters will be credited here.

| Reporter | Issue | Date |
|---|---|---|
| *(none yet)* | — | — |

---

## Legal

This project is licensed under the [MIT License](LICENSE).
Reporting a vulnerability does not grant any rights over the codebase.
We reserve the right to decide whether an issue qualifies as a security vulnerability.
