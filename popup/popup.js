// Lokalisierung: alle [data-i18n]-Elemente aus _locales fuellen (Chrome waehlt
// automatisch Deutsch oder Englisch je nach Browsersprache).
document.querySelectorAll("[data-i18n]").forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});
document.documentElement.lang = (chrome.i18n.getUILanguage() || "en").split("-")[0];

// Versionsnummer aus dem Manifest (eine Pflegestelle) im Header anzeigen.
const VERSION = chrome.runtime?.getManifest?.().version || "?";
document.getElementById("version").textContent = "v" + VERSION;
document.getElementById("versionFoot").textContent = "v" + VERSION;

// Popup-Logik: Schalter lesen/speichern
chrome.storage.local.get(["enabled", "debug"], (cfg) => {
  document.getElementById("enabled").checked = cfg.enabled !== false;
  const debugOn = !!cfg.debug;
  document.getElementById("debug").checked = debugOn;
  document.body.classList.toggle("debug-on", debugOn);
});

document.getElementById("enabled").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

document.getElementById("debug").addEventListener("change", (e) => {
  chrome.storage.local.set({ debug: e.target.checked });
  document.body.classList.toggle("debug-on", e.target.checked);
});

// "So funktioniert's" -> die Willkommens-/Hilfeseite erneut oeffnen.
document.getElementById("help").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome/welcome.html") });
  window.close();
});

// "Problem melden" -> GitHub-Issue-Tracker (oeffnet in neuem Tab).
document.getElementById("report").href = "https://github.com/daonware-it/yt-studio-ratio/issues";
