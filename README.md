# YT Studio Like/Dislike Ratio

**Deutsch** · [English](README.en.md)

Eine kleine Browser-Erweiterung, die das **Like/Dislike-Verhältnis im Inhalte-Tab
von YouTube Studio** wieder sichtbar macht – in einer **eigenen Spalte „Likes
(vs. Dislikes)"** ganz rechts, mit 👍/👎-Zahlen, Verhältnis-Balken und Prozent
(genaue Zahlen zusätzlich im Tooltip). Eine zweite Spalte **„Abos (gesamt)"**
zeigt zusätzlich, wie viele Abonnenten jedes Video netto seit der
Veröffentlichung gebracht hat.

![Like/Dislike-Spalte im Inhalte-Tab von YouTube Studio](IMAGE/content-badges.png)

<p align="center">
  <img src="IMAGE/popup-de.png" alt="Einstellungs-Popup (Deutsch)" width="280">
  &nbsp;&nbsp;
  <img src="IMAGE/popup-en.png" alt="Settings popup (English)" width="280">
</p>

Beim ersten Installieren öffnet sich automatisch eine kurze Willkommensseite, die
erklärt, dass die Erweiterung bereits aktiv ist und wie man bei Problemen einen
Report schickt:

<p align="center">
  <img src="IMAGE/welcome-de.png" alt="Willkommensseite nach der Installation" width="420">
</p>

## Wie es funktioniert (und warum es unbedenklich ist)

- Die Erweiterung läuft nur auf `studio.youtube.com`.
- Sie **liest mit**, was die Studio-Seite ohnehin selbst lädt (interne
  `youtubei`-Endpunkte), und stellt das Verhältnis wieder dar.
- Sie stellt **keine eigenen Anfragen**, baut keine Auth-Header nach und schickt
  **nichts an Dritte**. Alles passiert lokal im Browser.
- Jeder sieht ausschließlich die Daten **seines eigenen, angemeldeten Kanals** –
  weil die Erweiterung einfach die bestehende Sitzung nutzt.

## Bauen

Die Erweiterung ist **Manifest V3** und läuft sowohl in Chrome als auch in
Firefox. Da Firefox zusätzlich `browser_specific_settings` benötigt (das Chrome
ablehnt), erzeugt ein kleines Build-Skript pro Browser ein eigenes Paket unter
`dist/` (nur Node.js nötig, keine Abhängigkeiten):

```
npm run build           # baut dist/chrome und dist/firefox
npm run build:chrome    # nur Chrome
npm run build:firefox   # nur Firefox
```

## Lokal installieren (zum Testen)

**Chrome / Edge / Brave**
1. `npm run build:chrome` ausführen
2. `chrome://extensions` öffnen
3. „Entwicklermodus" oben rechts aktivieren
4. „Entpackte Erweiterung laden" → Ordner `dist/chrome` auswählen
5. `studio.youtube.com` → Inhalte öffnen, Seite ggf. neu laden

**Firefox** (Version 128 oder neuer)
1. `npm run build:firefox` ausführen
2. `about:debugging#/runtime/this-firefox`
3. „Temporäres Add-on laden" → `dist/firefox/manifest.json` auswählen
   (Für dauerhafte Nutzung muss das Add-on bei AMO signiert werden.)

## Wenn nichts erscheint (Debug)

YouTube ändert die internen Endpunkte ohne Vorwarnung. Falls die Spalte leer
bleibt:

1. Auf das Erweiterungs-Icon klicken → **Debug-Modus** einschalten
2. Inhalte-Tab neu laden, Entwicklerkonsole öffnen (F12)
3. Nach `[YTSR]` filtern. Dort werden die erkannten Felder und rohen Payloads
   ausgegeben (u. a. `[YTSR][recon]` und `[YTSR][dislike-DATA]`).

Schick mir die Konsolen-Ausgabe, dann passe ich die Feld-Zuordnung exakt an.

## Aktueller Stand (v1.2.0)

- **Willkommensseite bei der Erstinstallation**: erklärt automatisch, dass die
  Erweiterung bereits aktiv ist, wo die Spalten erscheinen, wie man sie im Popup
  schaltet und wie man per Debug-Modus einen Report schickt – ohne zusätzliche
  Berechtigungen.
- Fügt im Inhalte-Tab eine **eigene Spalte „Likes (vs. Dislikes)"** ganz rechts
  nach „Kommentare" ein – Titel in der Kopfzeile, pro Video eine Zelle mit
  👍/👎-Zahlen, **zweifarbigem Verhältnis-Balken** (grün = Likes, rot = Dislikes)
  und Prozent.
- Zusätzliche Spalte **„Abos (gesamt)"**: netto gewonnene Abonnenten pro Video
  seit Veröffentlichung – grün bei Plus, rot bei Minus. Die Werte werden sparsam
  und nur für sichtbare Videos über den Studio-Analytics-Endpunkt
  (`yta_web/get_cards`, Metrik `SUBSCRIBERS_NET_CHANGE`) nachgeladen.
- **Lesbare Zahlen**: große Werte kompakt (`49,3K`, `2,1M`), kleinere exakt mit
  Tausendertrennung (`1.204`); kräftige, gleich breite Ziffern.
- Läuft in **Chrome und Firefox** (browserspezifische Pakete via `npm run build`).
- **Likes** kommen aus `videos[].publicMetrics.likeCount`, **Dislikes** werden
  aktiv über den Studio-eigenen Endpunkt nachgeladen (`get_creator_videos`,
  `metrics.dislikeCount`) – alles in deiner laufenden Sitzung, ohne Zusatzrechte.
- Bis die Dislikes geladen sind, zeigt die Zelle den Like-Wert mit dezentem
  Lade-Zustand; danach erscheint das echte Verhältnis.

## Dateien

```
manifest.json        – Konfiguration (Manifest V3, Chrome-Basis)
scripts/build.mjs    – erzeugt browserspezifische Pakete in dist/
src/inject.js        – liest Netzwerk-Antworten mit & lädt Dislikes/Abos nach
src/content.js       – baut beide Spalten in Kopfzeile und Video-Zeilen ein
src/background.js    – öffnet bei Erstinstallation die Willkommensseite
src/styles.css       – Aussehen der Spalten (Balken, Farben, Abstände)
popup/               – kleines Einstellungs-Popup (An/Aus, Debug)
welcome/             – Willkommens-/Hilfeseite (erscheint nach der Installation)
icons/               – Icons
```
