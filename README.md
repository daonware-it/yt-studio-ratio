# YT Studio Like/Dislike Ratio

Eine kleine Browser-Erweiterung, die das **Like/Dislike-Verhältnis im Inhalte-Tab
von YouTube Studio** wieder sichtbar macht. Pro Video erscheint ein Badge wie
`👍 92,4 %` (mit den genauen Zahlen im Tooltip).

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

## Wenn kein Badge erscheint (Debug)

YouTube ändert die internen Endpunkte ohne Vorwarnung. Falls nichts auftaucht:

1. Auf das Erweiterungs-Icon klicken → **Debug-Modus** einschalten
2. Inhalte-Tab neu laden, Entwicklerkonsole öffnen (F12)
3. Nach `[YTSR]` filtern. Dort werden die rohen Payloads ausgegeben.
4. In `src/inject.js` die Listen `LIKE_KEYS`, `DISLIKE_KEYS` und `VIDEO_ID_KEYS`
   um die tatsächlich gefundenen Feldnamen ergänzen.

Schick mir die Konsolen-Ausgabe, dann passe ich die Feld-Zuordnung exakt an.

## Veröffentlichen, damit es jeder nutzen kann

- **Chrome Web Store:** Entwicklerkonto anlegen (einmalig 5 $ Gebühr), den Ordner
  als ZIP hochladen, Store-Eintrag + Datenschutzhinweis ausfüllen, Review abwarten.
- **Firefox (AMO):** ZIP bei `addons.mozilla.org` hochladen, signieren lassen.

Den Datenschutztext kannst du knapp halten: „Liest ausschließlich lokal die
Like/Dislike-Daten des angemeldeten Kanals in YouTube Studio. Es werden keine
Daten gespeichert oder übertragen."

## Grenzen / Ehrlichkeit

- Beruht auf nicht-dokumentierten Studio-Schnittstellen → kann nach einem
  YouTube-Update brechen und braucht dann eine Anpassung.
- Wenn YouTube die Like/Dislike-Zahlen gar nicht mehr in die Inhalte-Antworten
  packt, müsste auf die offizielle YouTube-Analytics-API umgestellt werden – die
  ist stabil, erfordert aber pro Nutzer OAuth und ist für „jeden ohne Setup"
  nicht ideal.
- Dieser Code ist ein getestet-strukturiertes Grundgerüst, aber nicht gegen die
  Live-Seite verifiziert. Erste Feinjustierung über den Debug-Modus einplanen.


## Aktueller Stand (v0.3.0)

- Zeigt pro Video im Inhalte-Tab ein **Like-Badge** (👍 Zahl). Die Felder sind
  fest verdrahtet: `videos[].videoId` + `videos[].publicMetrics.likeCount`.
- **Dislikes/Verhältnis sind noch nicht dabei**: YouTube liefert die Dislike-Zahl
  nicht im Inhalte-Endpunkt. Das kommt später über die YouTube-Analytics-API
  (dann wird aus dem Like-Badge ein echtes Verhältnis).
- Wenn kein Badge erscheint: im Popup **Debug** an, Inhalte-Tab neu laden, Konsole
  nach `[YTSR]` filtern. `[YTSR] N Video(s) mit Likes erkannt.` heißt: Daten da.

## Dateien

```
manifest.json        – Konfiguration (Manifest V3)
src/inject.js        – liest die Netzwerk-Antworten der Seite mit
src/content.js       – baut die Badges in die Video-Zeilen ein
src/styles.css       – Aussehen der Badges
popup/               – kleines Einstellungs-Popup (An/Aus, Debug)
icons/               – Icons
```
