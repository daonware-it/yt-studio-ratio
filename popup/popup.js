// Lokalisierung: alle [data-i18n]-Elemente aus _locales fuellen (Chrome waehlt
// automatisch Deutsch oder Englisch je nach Browsersprache).
document.querySelectorAll("[data-i18n]").forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});
document.documentElement.lang = (chrome.i18n.getUILanguage() || "en").split("-")[0];

// Popup-Logik: Schalter lesen/speichern
chrome.storage.local.get(["enabled", "debug"], (cfg) => {
  document.getElementById("enabled").checked = cfg.enabled !== false;
  document.getElementById("debug").checked = !!cfg.debug;
});

document.getElementById("enabled").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

document.getElementById("debug").addEventListener("change", (e) => {
  chrome.storage.local.set({ debug: e.target.checked });
});
