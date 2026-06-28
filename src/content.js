/*
 * content.js (isolierte Welt) - Version 1.2.0
 * Fügt zwei eigene Tabellenspalten rechts nach "Kommentare" ein:
 *  1) "Likes (vs. Dislikes)" - Verhältnis-Balken + Zahlen.
 *  2) "Abos (gesamt)" - Netto-Abos seit Veröffentlichung pro Video.
 * Einhängen robust über die Video-Links.
 */
(function () {
  "use strict";

  const VERSION = chrome.runtime?.getManifest?.().version || "?";
  const store = new Map(); // videoId -> { likes, dislikes, subscribers }
  const requestedDislikes = new Set(); // bereits aktiv angefragte IDs (Dedupe)
  const requestedSubs = new Set();     // dito fuer den Abo-Abruf
  let enabled = true;
  let debug = false;

  const t = (key, fallback) => {
    try { return chrome.i18n?.getMessage(key) || fallback; } catch (e) { return fallback; }
  };
  const COL_HEADER = t("columnHeader", "Likes (vs. Dislikes)");
  const COL_LOADING = t("columnLoading", "Dislikes werden geladen …");
  const SUBS_HEADER = t("columnHeaderSubs", "Abos (gesamt)");
  const SUBS_LOADING = t("columnLoadingSubs", "Abos werden geladen …");

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
        dislikes: r.dislikes != null ? r.dislikes : prev.dislikes,
        subscribers: r.subscribers != null ? r.subscribers : prev.subscribers
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

  // Abos sind teuer (1 Analytics-Request pro Video) -> nur fuer aktuell sichtbare
  // Videos anfragen und jede ID genau einmal pro Sitzung.
  function requestMissingSubscribers(visibleIds) {
    if (!enabled) return;
    const need = [];
    for (const id of visibleIds) {
      const data = store.get(id);
      if (data && data.subscribers == null && !requestedSubs.has(id)) {
        requestedSubs.add(id);
        need.push(id);
      }
    }
    if (need.length) {
      window.dispatchEvent(new CustomEvent("ytsr:fetchSubscribers", { detail: { videoIds: need } }));
    }
  }

  // ----- Zahlen & Prozent ----------------------------------------------------
  // Zahlenformat nach UI-Sprache (Fallback Deutsch).
  const NUM_LOCALE = (() => {
    try { return chrome.i18n?.getUILanguage?.() || "de-DE"; } catch (e) { return "de-DE"; }
  })();
  // Dezimaltrennzeichen des Locales ("," bei DE, "." bei EN).
  const DECIMAL_SEP = (1.1).toLocaleString(NUM_LOCALE).replace(/[0-9]/g, "") || ".";
  const nfFull = new Intl.NumberFormat(NUM_LOCALE);
  // Kompakt-Suffixe (K/M/B) gibt es nur im englischen Format zuverlässig; das
  // Dezimaltrennzeichen tauschen wir danach aufs UI-Locale (-> "49,3K", "2,1M").
  const nfCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

  // Exakt mit Tausendertrennung (für Tooltip): 1204 -> "1.204".
  function fmt(n) { return nfFull.format(n != null ? n : 0); }
  // Kompakt für die Zelle: < 10.000 exakt, darüber K/M (49300 -> "49,3K").
  function fmtShort(n) {
    n = n != null ? n : 0;
    return Math.abs(n) >= 10000 ? nfCompact.format(n).replace(".", DECIMAL_SEP) : fmt(n);
  }
  // Mit Vorzeichen (für Netto-Werte): +1.234 / −5 / 0.
  function fmtSigned(n, formatter) {
    n = n != null ? n : 0;
    return (n > 0 ? "+" : n < 0 ? "−" : "") + formatter(Math.abs(n));
  }
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

    let numsText = "👍 " + fmtShort(data.likes);
    if (hasDislikes) numsText += "  👎 " + fmtShort(data.dislikes);
    if (nums.textContent !== numsText) nums.textContent = numsText;

    fill.style.width = fillPct + "%";
    cell.classList.toggle("ytsr-pending", !hasDislikes);

    const pctText = hasDislikes && p != null ? p + " %" : "…";
    if (pctEl.textContent !== pctText) pctEl.textContent = pctText;

    cell.title = cellTitle(data);
  }

  function makeCell(id, data) {
    const cell = document.createElement("div");
    cell.className = "ytsr-cell ytsr-likes-cell";
    cell.dataset.ytsrFor = id;
    cell.innerHTML =
      '<div class="ytsr-nums"></div>' +
      '<div class="ytsr-bar"><div class="ytsr-bar-fill"></div></div>' +
      '<div class="ytsr-pct"></div>';
    fillCell(cell, data);
    return cell;
  }

  // ----- Abo-Zelle (Netto-Abos seit Veröffentlichung) -----------------------
  function fillSubsCell(cell, data) {
    const has = data.subscribers != null;
    const valEl = cell.querySelector(".ytsr-subs-val");
    const txt = has ? "👥 " + fmtSigned(data.subscribers, fmtShort) : "👥 …";
    if (valEl.textContent !== txt) valEl.textContent = txt;
    cell.classList.toggle("ytsr-pending", !has);
    cell.classList.toggle("ytsr-subs-pos", has && data.subscribers > 0);
    cell.classList.toggle("ytsr-subs-neg", has && data.subscribers < 0);
    cell.title = has
      ? "👥 " + fmtSigned(data.subscribers, fmt) + " — " +
        t("subsTooltip", "Abonnenten (netto, seit Veröffentlichung)")
      : SUBS_LOADING;
  }

  function makeSubsCell(id, data) {
    const cell = document.createElement("div");
    cell.className = "ytsr-cell ytsr-subs-cell";
    cell.dataset.ytsrFor = id;
    cell.innerHTML = '<div class="ytsr-subs-val"></div>';
    fillSubsCell(cell, data);
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
    if (!header) return;
    if (!header.querySelector(".ytsr-header-cell-likes")) {
      const h = document.createElement("div");
      h.className = "ytsr-header-cell ytsr-header-cell-likes";
      h.textContent = COL_HEADER;
      header.appendChild(h);
    }
    if (!header.querySelector(".ytsr-header-cell-subs")) {
      const h = document.createElement("div");
      h.className = "ytsr-header-cell ytsr-header-cell-subs";
      h.textContent = SUBS_HEADER;
      header.appendChild(h);
    }
  }

  function removeHeaderCell() {
    document.querySelectorAll(".ytsr-header-cell").forEach((h) => h.remove());
  }

  // ----- Aufbau & Pflege -----------------------------------------------------
  // Eine Spalten-Zelle (per Modifier-Klasse) im Container sicherstellen/pflegen.
  function ensureColumnCell(container, id, data, modifierClass, make, fill) {
    let cell = container.querySelector("." + modifierClass);
    if (cell && cell.dataset.ytsrFor === id) {
      fill(cell, data);
    } else {
      if (cell) cell.remove(); // gehoert zu altem Video (Recycling)
      cell = make(id, data);
      container.appendChild(cell);
    }
  }

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
    const visibleIds = [];
    byId.forEach(({ a }, id) => {
      const data = store.get(id);
      if (!data) return;
      withData++;
      const container = rowCellContainer(a);
      if (!container) return;

      ensureColumnCell(container, id, data, "ytsr-likes-cell", makeCell, fillCell);
      ensureColumnCell(container, id, data, "ytsr-subs-cell", makeSubsCell, fillSubsCell);
      visibleIds.push(id);
      placed++;
    });

    // Abos nur fuer aktuell sichtbare Videos nachladen (sparsam).
    requestMissingSubscribers(visibleIds);

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
