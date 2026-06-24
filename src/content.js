/*
 * content.js (isolierte Welt) - Version 1.0.0
 * Fügt eine eigene Tabellenspalte "Likes (vs. Dislikes)" rechts nach
 * "Kommentare" ein: Titel in der Kopfzeile, pro Video eine Zelle mit
 * Verhältnis-Balken + Zahlen. Einhängen robust über die Video-Links.
 */
(function () {
  "use strict";

  const VERSION = chrome.runtime?.getManifest?.().version || "?";
  const store = new Map(); // videoId -> { likes, dislikes }
  const requestedDislikes = new Set(); // bereits aktiv angefragte IDs (Dedupe)
  let enabled = true;
  let debug = false;

  const t = (key, fallback) => {
    try { return chrome.i18n?.getMessage(key) || fallback; } catch (e) { return fallback; }
  };
  const COL_HEADER = t("columnHeader", "Likes (vs. Dislikes)");
  const COL_LOADING = t("columnLoading", "Dislikes werden geladen …");

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

  // Daten aus dem Netzwerk-Mitleser (inject.js) entgegennehmen.
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

  // ----- Zahlen & Prozent ----------------------------------------------------
  function fmt(n) { return (n != null ? n : 0).toLocaleString("de-DE"); }
  function pctLiked(data) {
    const likes = data.likes != null ? data.likes : 0;
    const total = likes + (data.dislikes || 0);
    return total > 0 ? Math.round((likes / total) * 100) : null;
  }
  function cellTitle(data) {
    if (data.dislikes == null) return COL_LOADING;
    const p = pctLiked(data);
    return "👍 " + fmt(data.likes) + " / 👎 " + fmt(data.dislikes) +
      (p != null ? " — " + p + " % positiv" : "");
  }

  // ----- Zellinhalt (Balken + Zahlen) ---------------------------------------
  function fillCell(cell, data) {
    const p = pctLiked(data);
    const hasDislikes = data.dislikes != null;
    const fillPct = p != null ? p : 100;

    const nums = cell.querySelector(".ytsr-nums");
    const fill = cell.querySelector(".ytsr-bar-fill");
    const pctEl = cell.querySelector(".ytsr-pct");

    let numsText = "👍 " + fmt(data.likes);
    if (hasDislikes) numsText += "  👎 " + fmt(data.dislikes);
    if (nums.textContent !== numsText) nums.textContent = numsText;

    fill.style.width = fillPct + "%";
    cell.classList.toggle("ytsr-pending", !hasDislikes);

    const pctText = hasDislikes && p != null ? p + " %" : "…";
    if (pctEl.textContent !== pctText) pctEl.textContent = pctText;

    cell.title = cellTitle(data);
  }

  function makeCell(id, data) {
    const cell = document.createElement("div");
    cell.className = "ytsr-cell";
    cell.dataset.ytsrFor = id;
    cell.innerHTML =
      '<div class="ytsr-nums"></div>' +
      '<div class="ytsr-bar"><div class="ytsr-bar-fill"></div></div>' +
      '<div class="ytsr-pct"></div>';
    fillCell(cell, data);
    return cell;
  }

  // ----- Tabellen-Struktur finden -------------------------------------------
  // Aktuelle Video-ID einer Zeile (oder null).
  function rowVideoId(row) {
    if (!row) return null;
    const a = row.querySelector('a[href*="/video/"]');
    const m = a && (a.getAttribute("href") || "").match(/\/video\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  // Spalten-Container einer Zeile: von der Video-Zelle bis zum direkten Kind
  // von <ytcp-video-row> hochklettern (#row-container mit allen Spaltenzellen).
  function rowCellContainer(a) {
    const row = a.closest("ytcp-video-row");
    if (!row) return null;
    let el = a.closest("ytcp-video-list-cell-video") || a;
    while (el && el.parentElement && el.parentElement !== row) el = el.parentElement;
    return el && el.parentElement === row ? el : null;
  }

  // Kopfzeile der Tabelle (Spaltentitel). Fallbacks, falls YouTube Namen aendert.
  function findHeaderRow() {
    return document.querySelector(
      ".video-table-content ytcp-table-header, ytcp-table-header#table-header, " +
      "ytcp-table-header"
    );
  }

  function ensureHeaderCell() {
    const header = findHeaderRow();
    if (!header || header.querySelector(".ytsr-header-cell")) return;
    const h = document.createElement("div");
    h.className = "ytsr-header-cell";
    h.textContent = COL_HEADER;
    header.appendChild(h);
  }

  function removeHeaderCell() {
    document.querySelectorAll(".ytsr-header-cell").forEach((h) => h.remove());
  }

  // ----- Aufbau & Pflege -----------------------------------------------------
  function refreshAll() {
    if (!enabled) return;

    ensureHeaderCell();

    // Cleanup: Studio recycelt Zeilen beim Filtern/Sortieren/Scrollen. Eine Zelle,
    // deren Zeile inzwischen ein anderes Video zeigt (oder verwaist ist), entfernen
    // -> verhindert falsch zugeordnete Werte.
    document.querySelectorAll(".ytsr-cell").forEach((c) => {
      const row = c.closest("ytcp-video-row");
      if (!row || rowVideoId(row) !== c.dataset.ytsrFor) c.remove();
    });

    // Pro Video-ID den "besten" Link (laengster Text = meist der Titel) nehmen.
    const byId = new Map();
    document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
      const m = (a.getAttribute("href") || "").match(/\/video\/([^/?#]+)/);
      if (!m) return;
      const id = m[1];
      const txt = (a.textContent || "").trim().length;
      const cur = byId.get(id);
      if (!cur || txt > cur.txt) byId.set(id, { a, txt });
    });

    let withData = 0, placed = 0;
    byId.forEach(({ a }, id) => {
      const data = store.get(id);
      if (!data) return;
      withData++;
      const container = rowCellContainer(a);
      if (!container) return;

      let cell = container.querySelector(".ytsr-cell");
      if (cell && cell.dataset.ytsrFor === id) {
        fillCell(cell, data);
      } else {
        if (cell) cell.remove(); // gehoert zu altem Video (Recycling)
        cell = makeCell(id, data);
        container.appendChild(cell);
      }
      placed++;
    });

    if (debug) {
      console.log("[YTSR] Spaltenzellen: " + placed + " gesetzt / " + withData +
        " Videos mit Daten sichtbar / " + byId.size + " Video-Links im DOM / " +
        store.size + " Videos im Speicher");
    }
  }

  function clearAll() {
    document.querySelectorAll(".ytsr-cell").forEach((c) => c.remove());
    removeHeaderCell();
  }

  let timer = null;
  function scheduleRefresh() { clearTimeout(timer); timer = setTimeout(refreshAll, 200); }

  // Gehoert ein Knoten zu uns (unsere Zelle/Header oder darin liegend)?
  function isOwn(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    return el.classList?.contains("ytsr-cell") || el.classList?.contains("ytsr-header-cell") ||
      !!el.closest?.(".ytsr-cell, .ytsr-header-cell");
  }

  // Beobachten - aber Mutationen ignorieren, die NUR unsere eigenen Knoten betreffen,
  // sonst loest jedes Einfuegen ein neues Refresh aus (Endlosschleife).
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

  // Eine Lade-Bestaetigung (hilft bei Bug-Reports zu sehen, dass das Script laeuft).
  console.log("[YTSR] content script bereit (v" + VERSION + ").");
})();
