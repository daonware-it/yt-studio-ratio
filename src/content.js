/*
 * content.js (isolierte Welt) - Version 0.3.1
 * Robustes Einhaengen: nicht ueber Custom-Element-Namen, sondern ueber die
 * Video-Links (a[href*="/video/"]). Pro Video genau ein Badge.
 */
(function () {
  "use strict";

  const VERSION = chrome.runtime?.getManifest?.().version || "?";
  const store = new Map(); // videoId -> { likes, dislikes }
  const requestedDislikes = new Set(); // bereits aktiv angefragte IDs (Dedupe)
  let enabled = true;
  let debug = false;

  // inject.js wird jetzt direkt als MAIN-World-Content-Script geladen
  // (siehe manifest.json) - kein manuelles Einhaengen mehr noetig.

  // Einstellungen
  chrome.storage?.local.get(["enabled", "debug"], (cfg) => {
    enabled = cfg.enabled !== false;
    setDebug(!!cfg.debug);
    scheduleRefresh();
  });
  chrome.storage?.onChanged.addListener((c) => {
    if (c.enabled) { enabled = c.enabled.newValue !== false; enabled ? scheduleRefresh() : clearAll(); }
    if (c.debug) setDebug(!!c.debug.newValue);
  });
  function setDebug(on) {
    debug = !!on;
    window.dispatchEvent(new CustomEvent("ytsr:setDebug", { detail: { on } }));
  }

  // Daten entgegennehmen
  window.addEventListener("ytsr:data", (e) => {
    const records = (e.detail && e.detail.records) || [];
    let changed = false;
    for (const r of records) {
      if (!r.videoId) continue;
      const prev = store.get(r.videoId) || {};
      store.set(r.videoId, {
        likes: r.likes != null ? r.likes : prev.likes,
        dislikes: r.dislikes != null ? r.dislikes : prev.dislikes
      });
      changed = true;
    }
    if (changed && enabled) { requestMissingDislikes(); scheduleRefresh(); }
  });

  // Fuer alle bekannten Videos ohne Dislike-Zahl genau einmal einen aktiven
  // Abruf anstossen (inject.js buendelt das in Batches und nutzt die Sitzung).
  function requestMissingDislikes() {
    if (!enabled) return;
    const need = [];
    store.forEach((data, id) => {
      if (data.dislikes == null && !requestedDislikes.has(id)) { requestedDislikes.add(id); need.push(id); }
    });
    if (need.length) {
      window.dispatchEvent(new CustomEvent("ytsr:fetchDislikes", { detail: { videoIds: need } }));
    }
  }

  // ----- Badge ---------------------------------------------------------------
  function badgeText(data) {
    const likes = data.likes != null ? data.likes : 0;
    let s = "👍 " + likes.toLocaleString("de-DE");
    if (data.dislikes != null) {
      s += "  👎 " + data.dislikes.toLocaleString("de-DE");
      const total = likes + data.dislikes;
      if (total > 0) s += "  (" + Math.round((likes / total) * 100) + " %)";
    }
    return s;
  }
  function badgeTitle(data) {
    if (data.dislikes == null) return "Likes (öffentlich). Dislikes werden geladen …";
    const likes = data.likes != null ? data.likes : 0;
    const total = likes + data.dislikes;
    const pct = total > 0 ? Math.round((likes / total) * 100) : 0;
    return "👍 " + likes.toLocaleString("de-DE") + " / 👎 " + data.dislikes.toLocaleString("de-DE") +
      " — " + pct + " % positiv";
  }
  function makeBadge(id, data) {
    const span = document.createElement("span");
    span.className = "ytsr-badge";
    span.dataset.ytsrFor = id;
    span.textContent = badgeText(data);
    span.title = badgeTitle(data);
    span.style.setProperty("--ytsr-color", "#606060");
    return span;
  }

  // pro Video-ID den "besten" Link finden (laengster Text = meist der Titel)
  function bestAnchorsById() {
    const byId = new Map();
    document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/video\/([^/?#]+)/);
      if (!m) return;
      const id = m[1];
      const txt = (a.textContent || "").trim().length;
      const cur = byId.get(id);
      if (!cur || txt > cur.txt) byId.set(id, { a, txt });
    });
    return byId;
  }

  // Liefert die aktuelle Video-ID, zu der eine Zelle gerade gehoert (oder null).
  function cellVideoId(cell) {
    if (!cell) return null;
    const a = cell.querySelector('a[href*="/video/"]');
    const m = a && (a.getAttribute("href") || "").match(/\/video\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function refreshAll() {
    if (!enabled) return;

    // Cleanup: Studio recycelt beim Filtern/Sortieren die Zellen. Ein Badge, dessen
    // Zelle inzwischen ein anderes Video zeigt (oder das verwaist ist), wird entfernt
    // -> verhindert doppelte "Like-Bereiche".
    document.querySelectorAll(".ytsr-badge").forEach((b) => {
      const cell = b.closest("ytcp-video-list-cell-video");
      if (!cell || cellVideoId(cell) !== b.dataset.ytsrFor) b.remove();
    });

    const byId = bestAnchorsById();
    let withData = 0, placed = 0;
    byId.forEach(({ a }, id) => {
      const data = store.get(id);
      if (!data) return;
      withData++;
      // Titel-Link, -wrapper und "right-section" sind in Studio overflow:hidden ->
      // ein Badge dort wird weggeclippt. Erster Vorfahr ohne Clipping ist die
      // Video-Zelle (ytcp-video-list-cell-video, overflow:visible) -> dort anhaengen.
      const cell = a.closest("ytcp-video-list-cell-video") || a.parentElement || a;
      const existing = cell.querySelector(".ytsr-badge");
      if (existing) {
        const t = badgeText(data);
        if (existing.textContent !== t) { existing.textContent = t; existing.title = badgeTitle(data); }
        placed++;
        return;
      }
      cell.appendChild(makeBadge(id, data));
      placed++;
    });

    if (debug) {
      console.log("[YTSR] Badges: " + placed + " gesetzt / " + withData +
        " Videos mit Daten sichtbar / " + byId.size + " Video-Links im DOM / " +
        store.size + " Videos im Speicher");
    }
  }

  function clearAll() { document.querySelectorAll(".ytsr-badge").forEach((b) => b.remove()); }

  let timer = null;
  function scheduleRefresh() { clearTimeout(timer); timer = setTimeout(refreshAll, 200); }

  // Pruefen, ob ein Knoten zu uns gehoert (Badge oder darin liegender Text-Knoten).
  function isOwn(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    return el.classList?.contains("ytsr-badge") || !!el.closest?.(".ytsr-badge");
  }

  // Beobachten - aber Mutationen ignorieren, die NUR unsere eigenen Badges betreffen.
  // Sonst loest jedes Badge-Einfuegen ein neues Refresh aus (Endlosschleife).
  new MutationObserver((muts) => {
    if (!enabled) return;
    for (const m of muts) {
      const nodes = [...m.addedNodes, ...m.removedNodes];
      if (nodes.length ? nodes.some((n) => !isOwn(n)) : !isOwn(m.target)) {
        scheduleRefresh();
        return;
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  console.log("[YTSR] content script bereit (v" + VERSION + ").");
})();
