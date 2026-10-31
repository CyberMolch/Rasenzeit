# Signaturschlüssel

`rasenzeit-release.jks` signiert alle Release-APKs. Android installiert ein Update nur,
wenn es mit **demselben** Schlüssel signiert ist wie die installierte App – diesen
Schlüssel also nie austauschen oder löschen.

Hinweis zur Sicherheit: Das Repository ist öffentlich, damit liegt auch dieser Schlüssel
offen. Für eine private Hobby-App ist das vertretbar (Updates kommen nur aus deinen
eigenen GitHub-Releases). Für eine Veröffentlichung im Play Store sollte der Schlüssel
stattdessen als GitHub-Secret hinterlegt und hier entfernt werden:

1. `base64 -w0 rasenzeit-release.jks` ausführen und den Text als Secret `KEYSTORE_BASE64` speichern.
2. Die Werte aus `signing.json` als `KEYSTORE_PASSWORD`, `KEY_ALIAS` und `KEY_PASSWORD` speichern.
3. Beide Dateien aus dem Repository löschen. (Da sie in der Git-Historie bleiben,
   ist für den Play Store ein neuer Schlüssel mit Play App Signing sinnvoller.)
