# YT Studio Like/Dislike Ratio

**Deutsch** · [English](README.en.md)

Eine kleine Browser-Erweiterung, die das **Like/Dislike-Verhältnis im Inhalte-Tab
von YouTube Studio** wieder sichtbar macht – in einer **eigenen Spalte „Likes
(vs. Dislikes)"** ganz rechts, mit 👍/👎-Zahlen, Verhältnis-Balken und Prozent
(genaue Zahlen zusätzlich im Tooltip).

![Like/Dislike-Spalte im Inhalte-Tab von YouTube Studio](IMAGE/content-badges.png)

<p align="center">
  <img src="IMAGE/popup-de.png" alt="Einstellungs-Popup (Deutsch)" width="280">
  &nbsp;&nbsp;
  <img src="IMAGE/popup-en.png" alt="Settings popup (English)" width="280">
</p>

## Wie es funktioniert (und warum es unbedenklich ist)

- Die Erweiterung läuft nur auf `studio.youtube.com`.
- Sie **liest mit**, was die Studio-Seite ohnehin selbst lädt (interne
  `youtubei`-Endpunkte), und stellt das Verhältnis wieder dar.
- Sie stellt **keine eigenen Anfragen**, baut keine Auth-Header nach und schickt
  **nichts an Dritte**. Alles passiert lokal im Browser.
- Jeder sieht ausschließlich die Daten **seines eigenen, angemeldeten Kanals** –
  weil die Erweiterung einfach die bestehende Sitzung nutzt.

## Lokal installieren (zum Testen)

**Chrome / Edge / Brave**
1. `chrome://extensions` öffnen
2. „Entwicklermodus" oben rechts aktivieren
3. „Entpackte Erweiterung laden" → diesen Ordner auswählen
4. `studio.youtube.com` → Inhalte öffnen, Seite ggf. neu laden

**Firefox**
1. `about:debugging#/runtime/this-firefox`
2. „Temporäres Add-on laden" → `manifest.json` auswählen
   (Für dauerhafte Nutzung muss das Add-on bei AMO signiert werden.)

## Wenn nichts erscheint (Debug)

YouTube ändert die internen Endpunkte ohne Vorwarnung. Falls die Spalte leer
bleibt:

1. Auf das Erweiterungs-Icon klicken → **Debug-Modus** einschalten
2. Inhalte-Tab neu laden, Entwicklerkonsole öffnen (F12)
3. Nach `[YTSR]` filtern. Dort werden die erkannten Felder und rohen Payloads
   ausgegeben (u. a. `[YTSR][recon]` und `[YTSR][dislike-DATA]`).

Schick mir die Konsolen-Ausgabe, dann passe ich die Feld-Zuordnung exakt an.

## Aktueller Stand (v1.0.0)

- Fügt im Inhalte-Tab eine **eigene Spalte „Likes (vs. Dislikes)"** ganz rechts
  nach „Kommentare" ein – Titel in der Kopfzeile, pro Video eine Zelle mit
  👍/👎-Zahlen, **Verhältnis-Balken** und Prozent.
- **Likes** kommen aus `videos[].publicMetrics.likeCount`, **Dislikes** werden
  aktiv über den Studio-eigenen Endpunkt nachgeladen (`get_creator_videos`,
  `metrics.dislikeCount`) – alles in deiner laufenden Sitzung, ohne Zusatzrechte.
- Bis die Dislikes geladen sind, zeigt die Zelle den Like-Wert mit dezentem
  Lade-Zustand; danach erscheint das echte Verhältnis.

## Dateien

```
manifest.json        – Konfiguration (Manifest V3)
src/inject.js        – liest die Netzwerk-Antworten der Seite mit (Likes/Dislikes)
src/content.js       – baut die Spalte in Kopfzeile und Video-Zeilen ein
src/styles.css       – Aussehen der Spalte (Balken, Abstände)
popup/               – kleines Einstellungs-Popup (An/Aus, Debug)
icons/               – Icons
```
