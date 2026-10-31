# Rasenzeit 0.1

Unabhängiger, regelbasierter Pflegebegleiter für den Rasen – als Web-App und als Android-App (Capacitor). Ohne KI, ohne Konto, ohne Backend. Alle Daten bleiben auf dem Gerät.

## Schnellstart

### APK installieren
Die fertige App liegt unter **[Releases](https://github.com/CyberMolch/Rasenzeit/releases)**. Die Datei `rasenzeit-x.y.z.apk` auf dem Android-Handy herunterladen, antippen und installieren (beim ersten Mal die Installation aus dem Browser erlauben).

### Updates
- Die App prüft beim Start höchstens einmal täglich, ob es ein neueres Release gibt, und zeigt dann einen Hinweis mit Änderungen und Download. Manuell: *Profil → Hilfe & Hinweise → Nach Updates suchen*.
- Das Update wird über die installierte App installiert; alle Daten bleiben erhalten.
- Voraussetzung: gleiche Signatur (siehe `android-signing/`) und eine höhere Versionsnummer.

### Neue Version veröffentlichen
1. Änderungen in `CHANGELOG.md` unter `## x.y.z` beschreiben (erscheinen in der App als „Was ist neu“).
2. `version` in `package.json` auf `x.y.z` erhöhen.
3. Auf `main` pushen. GitHub Actions baut die signierte APK und legt das Release `vx.y.z` an, sofern es noch nicht existiert. Die installierten Apps finden es automatisch.

### Lokal bauen
Voraussetzungen: Node.js 22, JDK 21, Android SDK (z. B. über Android Studio).

```bash
npm install
npx cap add android          # nur beim ersten Mal
node scripts/android-setup.mjs
npm run android:apk          # Debug-APK: android/app/build/outputs/apk/debug/
npm run build && npm run dev # Web-Version unter http://localhost:4173
```

## Projektstruktur

| Ordner | Inhalt |
|---|---|
| `src/domain` | Datenmodelle (Nutzer, Fläche, Bodenprofil, Messung, Produkt, Gerät, Aufgabe, Tagebuch, Beobachtung, Anhang) und Bezeichnungen |
| `src/content` | Fachinhalte: Planungsregeln, Pflanzen, Rasenprobleme, Bestimmungshilfen, Demo-Daten – getrennt von der Oberfläche |
| `src/planning` | Regelauswertung: Aufgaben erzeugen, Abhängigkeiten, nächster Schritt |
| `src/lib` | IndexedDB-Speicher, Zustand, Export/Import (JSON, CSV, ICS), Dateiprüfung, Router, Schnittstellen (Wetter, Tarife, Partnerangebote), Android-Anbindung |
| `src/ui` | Designsystem: Icons, Komponenten, Dialoge, Mengenrechner, Bestimmungsablauf |
| `src/pages` | Die fünf Hauptbereiche und alle Unterseiten |

## Umgesetzte Funktionen

- **Einrichtung:** „Mit eigenem Garten starten“ (4 Schritte, alles außer Name überspringbar) und gekennzeichneter **Demomodus** mit „Demo beenden“.
- **Mehrere Rasenflächen** mit getrennten Profilen, Plänen, Tagebüchern, Beobachtungen und Messungen; Umschalten in Übersicht und Profil.
- **Mein Boden** je Fläche: Bodenart mit Herkunft (eigene Einschätzung / Bestimmungshilfe / Analyse), Notiz für Mischboden, Wasserverhalten mit Zeitraum, Teilbereich, Notiz und Foto, Verdichtung mit Untersuchung und Datum, pH-Wert und Analysewerte (Name/Wert/Einheit, originalgetreu als Text) mit Messmethode und PDF-/Bild-Bericht. Messungen verschiedener Methoden werden getrennt geführt.
- **Bodenart grob einschätzen:** vereinfachte Fingerprobe mit Abbildungen, „weiß ich nicht“, Zurück/Ändern; bei Widersprüchen keine eindeutige Bodenart, keine Prozentwerte.
- **Übersicht:** Begrüßung, Gartenbild (eigenes Foto oder Illustration), Bodenzusammenfassung („Boden noch unbekannt“ ohne Warnung), nächster Schritt, danach geplant, Rasenhilfe, zuletzt erledigt.
- **Pflegeplan:** Zeitplan mit Monats-/Jahreswahl und Wochenleiste, Jahresübersicht, eigene Aufgaben (Termin oder Zeitfenster, Voraussetzungen, Produkt, Erinnerungszeit), Bearbeiten/Löschen, Status geplant/verschoben/erledigt, „Angaben fehlen“, Detailseite mit „Warum passt das zu meinem Rasen?“, Mengenrechner, ICS-Export.
  - Verschieben fragt gezielt nach abhängigen Aufgaben – andere bleiben unverändert.
  - Erledigen erzeugt **genau einen** verknüpften Tagebucheintrag; Wieder-öffnen und erneutes Erledigen verwendet ihn wieder.
  - Begründungen erledigter Aufgaben werden eingefroren; spätere Profiländerungen ändern sie nicht.
- **Rasenhilfe:** Suche, „Unkraut eingrenzen“ (Merkmalsvergleich mit Ausschlussgründen), Gundermann, Weißklee, Löwenzahn, Blutrote Fingerhirse mit Reitern Erkennen/Maßnahmen/Verlauf, weitere Rasenprobleme, eigene Beobachtungen mit Fotos, Ausbreitung, Maßnahmenprotokoll, Fotovergleich und geplanter Nachkontrolle.
- **Tagebuch:** Filter Alle/Pflege/Fotos/Beobachtungen, Einträge mit Fläche, Produkt, Menge, Stelle, Fotos und Verknüpfungen; Vorher/Aktuell-Vergleich derselben Stelle mit echten Daten; Fotoverlauf; Export CSV/JSON.
- **Profil:** Name, Flächenverwaltung inkl. Löschen mit Auflistung der betroffenen Daten, Produkte & Dünger (Dosierung aus Nutzereingabe), Geräte, In-App-Erinnerungen, Region, Wetter-Status, Datenschutz & Export, Hilfe & Hinweise. Keine Anmeldung/Abmeldung.
- **Speicherung:** IndexedDB (Daten, Fotos, Dokumente), versioniertes Format (`DATA_VERSION`), verständliche Fehler bei vollem Speicher, Upload-Prüfung (JPEG/PNG/WebP ≤ 10 MB, PDF ≤ 15 MB), Verkleinerung großer Fotos.
- **Export/Import:** vollständige Sicherung mit Anhängen, JSON ohne Anhänge (klar benannt), CSV (Semikolon, UTF-8 für Excel), ICS; Import mit Validierung, Vorschau und Wahl zwischen „Ergänzen“ (überschreibt nichts) und „Alles ersetzen“ (mit Bestätigung).
- **Android:** Export über Teilen-Dialog des Systems, Hardware-Zurück schließt Dialoge und navigiert zurück, Update-Prüfung über GitHub-Releases mit Änderungshinweisen, „Später“ und „Version überspringen“.

## Fehlende Integrationen und offene Punkte (ehrlich)

- **Fachliche Prüfung fehlt:** Alle 14 Planungsregeln, 4 Pflanzensteckbriefe, 4 Problemseiten und beide Bestimmungshilfen sind als **„Entwurf – fachlich noch nicht geprüft“** gekennzeichnet und werden nur als Vorschläge formuliert. Vor einer Veröffentlichung sollte eine Fachperson sie prüfen (`reviewStatus`, `lastReviewed`, `sources` in `src/content/`).
- **Keine Referenzfotos:** Pflanzenbilder sind gekennzeichnete Platzhalter. Rechtmäßig nutzbare, geprüfte Fotos müssen noch beschafft werden.
- **Kein Wetter:** Schnittstelle in `src/lib/services.ts` vorbereitet, aber keine Quelle angebunden; es werden keine Wetterdaten angezeigt.
- **Keine Push-Mitteilungen:** Erinnerungen erscheinen beim Öffnen der App (Glocke) und per ICS-Export. Für echte Android-Benachrichtigungen wäre z. B. `@capacitor/local-notifications` zu ergänzen.
- **Keine Herstellerdatenbank, keine chemischen Empfehlungen, keine Partnerangebote** (Architektur dafür vorbereitet, Liste leer).
- **Region** wird gespeichert, beeinflusst die Planung aber noch nicht.
- **Schrift:** Inter wird über Google Fonts geladen; offline bzw. in der APK ohne Netz wird die Systemschrift (Roboto) verwendet.
- **Typprüfung:** In der Entwicklungsumgebung waren nur Ersatz-Typdefinitionen für React verfügbar (`types-offline/`). Der Build hängt nicht davon ab; `npm run typecheck` mit den echten `@types/react` wurde noch nicht ausgeführt.
- **APK-Bau:** Android SDK und Gradle waren in der Entwicklungsumgebung nicht erreichbar. Die APK baut GitHub Actions; die Android-spezifischen Funktionen (Export, Zurück-Taste, Update-Prüfung) wurden mit einer simulierten Capacitor-Umgebung geprüft.
- **Update-Installation:** Android erlaubt keine stille Installation. Die App lädt die APK über den Browser, die Installation bestätigt der Nutzer.

## Durchgeführte Prüfungen

Automatisiert mit Playwright (Chromium) gegen den Produktions-Build, 22 von 22 Prüfungen bestanden, keine JavaScript-Fehler:

1. Eigene Fläche angelegt (inkl. Ablehnung negativer Größe) · 2. Bodenprofil „weiß ich nicht“ · 3. Bodenart als eigene Einschätzung in der Übersicht · 4. pH-Messung mit Datum und Labormethode (Ablehnung pH > 14) · 5. PDF-Bericht als Anhang (Ablehnung falscher Dateitypen) · 6. Wechsel zwischen zwei Flächen mit unterschiedlichem Boden · 7. Aufgabe angelegt, mit abhängiger Aufgabe verschoben, erledigt · 8. Wieder-öffnen + erneutes Erledigen → genau 1 Tagebucheintrag · 9. Beobachtung mit Foto · 10. Bestimmungshilfe nur mit „weiß ich nicht“ → „zu wenige Angaben“, nach Korrektur Weißklee ohne Prozentwerte · 11. Mengenrechner 2,5 kg/100 m² × 120 m² = 3.000 g · 12. Neuladen mit vollständigem Datenbestand · 13. Vollständige Sicherung + CSV exportiert, alles gelöscht, ungültige Datei abgelehnt, Sicherung inkl. Anhängen wiederhergestellt · 14. Dialog per Tastatur, Fokus im Dialog, Escape schließt, Fokus kehrt zurück; kein horizontales Scrollen bei 360, 390, 768 und 1440 px auf 8 Seiten.

Zusätzlich: Android-Pfad (Export über Dateisystem + Teilen, Zurück-Taste) mit simuliertem Capacitor geprüft.
