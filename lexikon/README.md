# Referenzbilder für das Pflanzenlexikon

1. **Kandidaten anfordern:** `lexikon/kandidaten.anfordern` ändern und pushen.
   GitHub Actions sucht frei lizenzierte Fotos auf Wikimedia Commons (ohne NC/ND),
   gleicht die Namen mit GBIF ab und legt Vorschaubilder samt Metadaten im Branch
   `bildauswahl` ab.
2. **Sichten:** Jedes Bild auf Art und Merkmal prüfen.
3. **Übernehmen:** Ausgewählte Dateien mit Bildunterschrift und Alternativtext in
   `lexikon/bildauswahl.json` eintragen und pushen. Actions lädt sie in
   `public/lexikon/` und schreibt Urheber, Lizenz, Lizenzlink, Quellseite und
   Änderungen aus der Commons-API nach `src/content/lexicon/images.json`.
