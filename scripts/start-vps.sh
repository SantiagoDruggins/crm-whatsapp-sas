#!/bin/bash
# Ejecutar en la raíz del proyecto en el VPS (ej: /var/www/crm-whatsapp-sas)
# Uso: ./scripts/start-vps.sh

set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "=== Instalando dependencias backend ==="
cd "$ROOT/backend"
npm install --production

echo "=== Instalando dependencias y build frontend ==="
cd "$ROOT/frontend"
npm install
npm run build

echo "=== Reiniciando API con PM2 ==="
cd "$ROOT/backend"
if pm2 describe crm-api >/dev/null 2>&1; then
  pm2 restart crm-api
else
  pm2 start src/server.js --name crm-api
fi
pm2 save

echo "=== Listo. Frontend en dist/. API en PM2 (crm-api). ==="
echo "Asegúrate de que Nginx apunte a frontend/dist y proxy /api a 4000."
