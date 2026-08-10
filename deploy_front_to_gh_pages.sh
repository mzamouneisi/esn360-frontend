#!/bin/bash

# Deploiement du frontend esn360-frontend sur GitHub Pages (branche main, dossier docs/).
# Usage (depuis la racine du projet) :
#   ./deploy_front_to_gh_pages.sh

set -euo pipefail

BRANCH_REQUIRED="main"
PAGES_URL="https://mzamouneisi.github.io/esn360-frontend/"

SCRIPT_NAME="$(basename "$0")"
LOG_FILE="${SCRIPT_NAME%.sh}.log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

if [ ! -f "package.json" ]; then
  log "ERROR: package.json introuvable. Lancez ce script depuis la racine du projet esn360-frontend."
  exit 1
fi

BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH_NAME" != "$BRANCH_REQUIRED" ]; then
  log "ERROR: GitHub Pages est configuré sur la branche '$BRANCH_REQUIRED' (branche actuelle : '$BRANCH_NAME')."
  exit 1
fi

for cmd in git npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: Commande requise introuvable : $cmd"
    exit 1
  fi
done

log "=== Deploiement GitHub Pages (branche '$BRANCH_NAME', dossier docs/) ==="
log "URL publique : $PAGES_URL"

log "Lint..."
npm run lint

log "Tests..."
npm test

log "Build vers docs/ (base et URL API lues dans .env.production)..."
npm run build:pages

if [ ! -f "docs/index.html" ]; then
  log "ERROR: Build invalide : docs/index.html absent."
  exit 1
fi

BASE_OK="$(grep -o 'src="[^"]*"\|href="[^"]*"' docs/index.html | grep -c '/esn360-frontend/' || true)"
if [ "$BASE_OK" -lt 1 ]; then
  log "ERROR: Le build n'utilise pas la base '/esn360-frontend/'. Verifier .env.production."
  exit 1
fi

log "Envoi du dossier docs/ vers git..."
git add docs/
if git diff --cached --quiet; then
  log "Aucun changement dans docs/ : rien a pousser."
else
  git commit -m "GitHub Pages : build docs/ ($(date +'%Y-%m-%d %H:%M:%S'))"
  git push origin "$BRANCH_NAME"
  log "Push effectue."
fi

log "Termine. Le site est en ligne quelques instants plus tard :"
log "  $PAGES_URL"
