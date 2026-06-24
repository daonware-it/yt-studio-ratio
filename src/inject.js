/*
 * inject.js (Main World) - Version 0.7.0
 * Likes: passiv aus videos[].publicMetrics.likeCount (list_creator_videos).
 * Dislikes: aktiv nachgeladen. Wir spiegeln den Studio-eigenen Request
 *   POST /youtubei/v1/creator/get_creator_videos
 * mit { videoIds:[...], mask:{ metrics:{all:true} } } -> videos[].metrics.dislikeCount.
 * Auth/Header/context werden dafuer von einem echten Studio-Request mitgelesen
 * (z. B. list_creator_videos, der im Inhalte-Tab ohnehin feuert) und 1:1
 * wiederverwendet - keine zusaetzlichen Rechte, alles in der laufenden Sitzung.
 */
(function () {
  "use strict";

  const VERSION = "0.7.0"; // MAIN-World hat keinen chrome.runtime-Zugriff -> hier pflegen
  const DEBUG_KEY = "__ytsr_debug";
  const isDebug = () => window[DEBUG_KEY] === true;
  const shouldWatch = (url) => !!url && String(url).includes("youtubei");
  const seenEndpoints = new Set();

  // Auth/Header/context eines echten Studio-Requests (zum Wiederverwenden beim
  // aktiven Dislike-Abruf). Wird laufend aus echten youtubei-Requests aufgefrischt.
  let lastAuth = null;
  const pendingDislikeIds = []; // IDs, die warten, bis Auth vorliegt

  function pathOf(url) {
    try { return new URL(url, location.origin).pathname; }
    catch (e) { return String(url).split("?")[0]; }
  }

  function toNumber(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") return null;
    const c = v.replace(/[\s\u00a0]/g, "");
    if (/^\d[\d.,]*$/.test(c)) return parseInt(c.replace(/[.,]/g, ""), 10);
    return null;
  }

  // ----- Extraktion (fest verdrahtet auf die echten Felder) ------------------
  function extractVideo(node) {
    if (!node || typeof node.videoId !== "string") return null;
    let likes = null, dislikes = null;
    if (node.publicMetrics && node.publicMetrics.likeCount != null) {
      likes = toNumber(node.publicMetrics.likeCount);
    } else if (node.likeCount != null) {
      likes = toNumber(node.likeCount);
    }
    // metrics.* stammt aus get_creator_videos / Analytics und enthaelt Dislikes.
    if (node.metrics) {
      if (likes == null && node.metrics.likeCount != null) likes = toNumber(node.metrics.likeCount);
      if (node.metrics.dislikeCount != null) dislikes = toNumber(node.metrics.dislikeCount);
    }
    if (likes == null && dislikes == null) return null;
    return { videoId: node.videoId, likes, dislikes };
  }

  function deepCollect(node, sink, depth) {
    if (depth > 16 || node == null || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const v of node) deepCollect(v, sink, depth + 1); return; }
    const rec = extractVideo(node);
    if (rec) sink.push(rec);
    for (const k of Object.keys(node)) deepCollect(node[k], sink, depth + 1);
  }

  function emit(records) {
    if (!records.length) return;
    window.dispatchEvent(new CustomEvent("ytsr:data", { detail: { records } }));
    if (isDebug()) console.log("[YTSR] " + records.length + " Video(s) mit Metriken erkannt.");
  }

  // ----- Aktiver Dislike-Abruf ----------------------------------------------
  function captureAuth(url, headerSrc, bodyText) {
    try {
      if (!shouldWatch(url) || !bodyText) return;
      let context = null;
      try { context = JSON.parse(bodyText).context; } catch (e) {}
      if (!context) return; // ohne context kein gueltiger Replay
      const headers = {};
      if (headerSrc) {
        if (typeof headerSrc.forEach === "function") headerSrc.forEach((v, k) => { headers[k] = v; });
        else if (Array.isArray(headerSrc)) for (const pair of headerSrc) headers[pair[0]] = pair[1];
        else for (const k of Object.keys(headerSrc)) headers[k] = headerSrc[k];
      }
      lastAuth = { url: String(url), headers, context };
      try { window.__ytsr_auth = lastAuth; } catch (e) {}
      if (pendingDislikeIds.length) doFetchDislikes(pendingDislikeIds.splice(0));
    } catch (e) {}
  }

  function buildCreatorUrl(endpoint) {
    let search = "";
    try { search = new URL(lastAuth.url, location.origin).search; } catch (e) {}
    return location.origin + "/youtubei/v1/creator/" + endpoint + search;
  }

  async function doFetchDislikes(ids) {
    ids = Array.from(new Set(ids.filter(Boolean)));
    if (!ids.length) return;
    if (!lastAuth) { // Auth noch nicht gesehen -> spaeter nachholen
      for (const id of ids) if (!pendingDislikeIds.includes(id)) pendingDislikeIds.push(id);
      return;
    }
    const CHUNK = 20;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = ids.slice(i, i + CHUNK);
      try {
        const headers = Object.assign({}, lastAuth.headers);
        delete headers["content-length"]; delete headers["Content-Length"];
        headers["content-type"] = "application/json";
        const body = JSON.stringify({
          context: lastAuth.context,
          failOnError: false,
          videoIds: batch,
          mask: { videoId: true, title: true, metrics: { all: true }, publicMetrics: { all: true } },
          criticalRead: false
        });
        const res = await origFetch(buildCreatorUrl("get_creator_videos"), {
          method: "POST", credentials: "include", headers, body
        });
        const json = JSON.parse(await res.text());
        const sink = [];
        deepCollect(json, sink, 0);
        if (isDebug()) console.log("[YTSR] Dislikes aktiv geladen: " + sink.length + "/" + batch.length + " Video(s).");
        emit(sink);
      } catch (e) {
        if (isDebug()) console.log("[YTSR] Dislike-Abruf fehlgeschlagen:", e);
      }
    }
  }

  // ----- Diagnose (nur Debug) ------------------------------------------------
  const RECON_RE = /like|dislike|rating|thumb|video|engage|approv|sentiment|metric/i;
  function reconPaths(node, base, out, depth) {
    if (depth > 16 || node == null || typeof node !== "object" || out.size > 120) return;
    if (Array.isArray(node)) { for (let i = 0; i < Math.min(node.length, 2); i++) reconPaths(node[i], base + "[]", out, depth + 1); return; }
    for (const k of Object.keys(node)) {
      const p = base ? base + "." + k : k;
      if (RECON_RE.test(k)) {
        const val = node[k];
        const t = val === null ? "null" : Array.isArray(val) ? "array" : typeof val === "object" ? "object" : typeof val;
        out.add(p + " (" + t + ")");
      }
      reconPaths(node[k], p, out, depth + 1);
    }
  }

  // Sammelt Pfade, deren Schluessel ODER String-Wert "dislike" erwaehnt, samt Wert.
  // Zeigt zudem den jeweils naechstgelegenen videoId-Wert zum Korrelieren.
  function collectDislike(node, base, out, depth) {
    if (depth > 18 || node == null || typeof node !== "object" || out.length > 200) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < Math.min(node.length, 8); i++) collectDislike(node[i], base + "[" + i + "]", out, depth + 1);
      return;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      const p = base ? base + "." + k : k;
      const keyHit = /dislike/i.test(k);
      const valHit = typeof v === "string" && /dislike/i.test(v);
      if (keyHit || valHit) {
        const shown = (v === null || typeof v === "object") ? JSON.stringify(v).slice(0, 120) : String(v);
        out.push(p + " = " + shown);
      }
      collectDislike(v, p, out, depth + 1);
    }
  }

  function handlePayload(url, text, reqBody) {
    if (!shouldWatch(url)) return;
    let json;
    try { json = JSON.parse(text); } catch (e) { return; }
    const path = pathOf(url);

    if (isDebug() && !seenEndpoints.has(path)) {
      seenEndpoints.add(path);
      const out = new Set();
      reconPaths(json, "", out, 0);
      console.log("[YTSR][recon] " + path + (out.size ? ":\n" + Array.from(out).join("\n") : " (keine)"));
    }

    // Recon fuer Dislikes: Analytics laeuft ueber yta_web/* (nicht "analytic" im Pfad).
    const hasDislike = /dislike/i.test(text);
    if (isDebug() && hasDislike) {
      // Volle Antwort + Request global ablegen (zum Inspizieren in der Konsole).
      try {
        window.__ytsr_lastDislikeResp = json;
        window.__ytsr_lastDislikeReq = { path: path, body: reqBody };
      } catch (e) {}
      // Kompakte Extraktion: alle Pfade, deren Schluessel ODER String-Wert "dislike"
      // erwaehnt, samt Wert - so sehen wir, wo die echten Zahlen stehen.
      const hits = [];
      collectDislike(json, "", hits, 0);
      console.log("[YTSR][dislike-DATA] " + path + "\n" +
        (hits.length ? hits.slice(0, 60).join("\n") : "(nur im Text, keine strukturierten Treffer)") +
        "\n--> volle Antwort: window.__ytsr_lastDislikeResp | Request: window.__ytsr_lastDislikeReq");
    } else if (isDebug() && /yta_web|analytic/i.test(path)) {
      console.log("[YTSR][analytics] " + path + " (kein dislike)");
    }

    const sink = [];
    deepCollect(json, sink, 0);
    emit(sink);
  }

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    let url = null, reqBody = null, headerSrc = null;
    try {
      const isReq = args[0] && typeof args[0] === "object" && "url" in args[0];
      url = isReq ? args[0].url : args[0];
      const opt = args[1];
      headerSrc = (opt && opt.headers) || (isReq ? args[0].headers : null);
      if (opt && typeof opt.body === "string") reqBody = opt.body;
      if (shouldWatch(url)) captureAuth(url, headerSrc, reqBody);
    } catch (e) {}
    const res = await origFetch.apply(this, args);
    try {
      if (shouldWatch(url)) res.clone().text().then((t) => handlePayload(url, t, reqBody)).catch(() => {});
    } catch (e) {}
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (m, url) { this.__ytsr_url = url; return origOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    (this.__ytsr_h = this.__ytsr_h || {})[k] = v;
    return origSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.__ytsr_body = (typeof body === "string") ? body : null;
    try { if (shouldWatch(this.__ytsr_url)) captureAuth(this.__ytsr_url, this.__ytsr_h, this.__ytsr_body); } catch (e) {}
    this.addEventListener("load", function () {
      try {
        if (!shouldWatch(this.__ytsr_url)) return;
        if (this.responseType === "" || this.responseType === "text") handlePayload(this.__ytsr_url, this.responseText, this.__ytsr_body);
        else if (this.responseType === "json") handlePayload(this.__ytsr_url, JSON.stringify(this.response), this.__ytsr_body);
      } catch (e) {}
    });
    return origSend.apply(this, arguments);
  };

  window.addEventListener("ytsr:setDebug", (e) => {
    window[DEBUG_KEY] = !!(e.detail && e.detail.on);
    console.log("[YTSR] Debug-Modus:", window[DEBUG_KEY]);
  });

  // Aufforderung aus der isolierten Welt: Dislikes fuer diese Video-IDs holen.
  window.addEventListener("ytsr:fetchDislikes", (e) => {
    const ids = (e.detail && e.detail.videoIds) || [];
    if (ids.length) doFetchDislikes(ids);
  });

  console.log("[YTSR] Netzwerk-Mitleser aktiv (v" + VERSION + ", MAIN-World).");
})();
