/*
 * background.js (Service Worker / Event Page) - Version 1.2.0
 * Einziger Zweck: Beim ERSTEN Installieren eine lokalisierte Willkommens-/
 * Hilfeseite in einem neuen Tab oeffnen. Erklaert, dass die Erweiterung bereits
 * aktiv ist, wo die Spalten erscheinen und wie man bei Problemen einen Debug-
 * Report erstellt. Keine zusaetzlichen Rechte: oeffnet nur eine eigene Seite.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return; // nur bei Erstinstallation, nicht bei Updates
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome/welcome.html") });
  } catch (e) {
    // Falls das Oeffnen scheitert, soll die Installation trotzdem sauber bleiben.
  }
});
