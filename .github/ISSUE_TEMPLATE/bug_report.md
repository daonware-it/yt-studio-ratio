---
name: Bug report
about: Create a report to help us improve
title: "[BUG]"
labels: bug
assignees: daonware-it

---

---
name: ⚠️ YouTube Endpoint Changed
about: Badges are not showing after a YouTube Studio update
title: 'fix: badges not showing after YouTube update'
labels: youtube-update, bug
assignees: ''
---

## ⚠️ Badges Stopped Showing After a YouTube Update

<!-- This is the most common issue with this extension. 
     YouTube changes their internal endpoints without notice.
     Please follow the steps below carefully. -->

---

## 🔍 Debug Output

**Follow these steps first:**

1. Click the extension icon → toggle **Debug** on
2. Go to `https://studio.youtube.com` → open the **Content** tab
3. Open browser console (`F12`) and filter by `[YTSR]`
4. Paste **all** `[YTSR]` output below:

<details>
<summary>[YTSR] console output</summary>

```
paste here
```

</details>

---

## 🖥️ Environment

| | |
|---|---|
| **Chrome Version** | e.g. Chrome 126.0.6478.56 |
| **Extension Version** | e.g. v1.0.0 |
| **Date noticed** | e.g. 2026-06-24 |

---

## 📝 Additional Notes
<!-- Did anything else change? Did YouTube Studio look different? -->


---

> 💡 **For maintainers:** Check `LIKE_KEYS`, `DISLIKE_KEYS`, and `VIDEO_ID_KEYS`
> in `src/inject.js` against the raw payload shown in the debug output.
