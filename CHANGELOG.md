# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei
dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

## [1.1.0] - 2026-06-25

### Hinzugefügt
- Neue Spalte **„Abos (gesamt)"**: zeigt pro Video die netto gewonnenen
  Abonnenten seit Veröffentlichung. Die Werte werden sparsam und nur für aktuell
  sichtbare Videos über den Studio-eigenen Analytics-Endpunkt
  (`yta_web/get_cards`, Metrik `SUBSCRIBERS_NET_CHANGE`) innerhalb der laufenden
  Sitzung nachgeladen – jede Video-ID höchstens einmal.
- Lesbare Zahlenformatierung über `Intl.NumberFormat`: große Werte kompakt
  (z. B. `49,3K`, `2,1M`), kleinere exakt mit Tausendertrennung (`1.204`);
  Netto-Abos mit Vorzeichen (`+1.234` / `−5`). Dezimaltrennzeichen folgt der
  UI-Sprache.
- Browserübergreifendes Build-Setup: `scripts/build.mjs` erzeugt pro Browser ein
  eigenes Paket unter `dist/` (Chrome und Firefox), ohne externe Abhängigkeiten.
- `package.json` mit den Skripten `build`, `build:chrome` und `build:firefox`.
- Firefox-Unterstützung: Das Firefox-Manifest erhält automatisch
  `browser_specific_settings.gecko` (Add-on-ID und `strict_min_version` 128.0,
  da Content-Scripts mit `world: "MAIN"` erst ab Firefox 128 verfügbar sind).

### Geändert
- Verhältnis-Balken ist nun zweifarbig: grüner Like-Anteil über rotem
  Dislike-Anteil – auf einen Blick verständlich.
- Zahlen in beiden Spalten sind größer, kräftiger und nutzen gleich breite
  Ziffern (`tabular-nums`) für bessere Lesbarkeit; der Prozentwert tritt dezenter
  zurück.
- README (DE/EN): neue Build- und Installationsanleitung für Chrome und Firefox.
- `.gitignore`: Build-Ausgabe `dist/` wird ignoriert.

## [1.0.0] - 2026-06-24

### Hinzugefügt
- Eigene Spalte **„Likes (vs. Dislikes)"** ganz rechts im Inhalte-Tab (nach
  „Kommentare") – Titel in der Kopfzeile, pro Video eine Zelle mit 👍/👎-Zahlen,
  Verhältnis-Balken und Prozentwert (genaue Zahlen zusätzlich im Tooltip).
- Aktives Nachladen der Dislikes über den Studio-eigenen Endpunkt
  `get_creator_videos` (`metrics.dislikeCount`) innerhalb der laufenden Sitzung.

### Geändert
- Verhältnis wird statt als Badge nun in einer eigenen Tabellenspalte dargestellt.

## [0.7.0] - 2026-06-24

### Hinzugefügt
- Erste Veröffentlichung: YT Studio Like/Dislike Ratio.
- Mitlesen der Likes aus `videos[].publicMetrics.likeCount` der Studio-Seite.
- Einstellungs-Popup (An/Aus, Debug-Modus).
- Lokalisierung Deutsch und Englisch (`_locales`).
- Englische README und Sprachumschalter.

[Unveröffentlicht]: https://github.com/daonware-it/yt-studio-ratio/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/daonware-it/yt-studio-ratio/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/daonware-it/yt-studio-ratio/compare/v0.7.0...v1.0.0
[0.7.0]: https://github.com/daonware-it/yt-studio-ratio/releases/tag/v0.7.0
