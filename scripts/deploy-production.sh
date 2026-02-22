#!/bin/bash
# Deploy en producción: pull, instalar dependencias (web + backend), build web, reiniciar Pacman.
# Ejecutar desde la raíz del repo: bash scripts/deploy-production.sh
#
# Si git pull falla por package-lock.json, antes ejecutá:
#   git checkout -- package-lock.json

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Nombre del proceso en PM2 (backend Pacman)
PM2_APP_NAME="${PM2_APP_NAME:-pacman-backend}"

echo "=== 1/5 git pull ==="
git pull

echo "=== 2/5 npm install (web) ==="
npm install

echo "=== 3/5 npm install (backend Pacman) ==="
cd backend && npm install && cd ..

echo "=== 4/5 Build web (Expo export) ==="
npx expo export --platform web

echo "=== 5/5 PM2 restart backend ==="
pm2 restart "$PM2_APP_NAME"

echo "=== Listo. Web: contenido en dist/ (servilo con nginx o lo que uses). Backend: $PM2_APP_NAME reiniciado. ==="
