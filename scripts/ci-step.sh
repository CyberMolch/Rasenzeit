#!/usr/bin/env bash
# Führt einen CI-Schritt aus und meldet bei Fehlern die letzten Zeilen der Ausgabe
# als Annotation, damit die Ursache auch ohne Zugriff auf das vollständige Log sichtbar ist.
# Aufruf: scripts/ci-step.sh "Titel" befehl args...
title="$1"; shift
log="$(mktemp)"
set -o pipefail
if "$@" 2>&1 | tee "$log"; then exit 0; fi
code=$?
msg="$(tail -n 40 "$log" | cut -c1-300 | sed 's/%/%25/g' | awk 'BEGIN{ORS="%0A"} {print}')"
echo "::error title=${title} (Exit ${code})::${msg}"
exit "$code"
