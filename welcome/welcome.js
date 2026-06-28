// Lokalisierung: alle [data-i18n]-Elemente aus _locales fuellen. Chrome/Firefox
// waehlen automatisch Deutsch oder Englisch je nach Browsersprache.
document.querySelectorAll("[data-i18n]").forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});
document.documentElement.lang = (chrome.i18n.getUILanguage() || "en").split("-")[0];
