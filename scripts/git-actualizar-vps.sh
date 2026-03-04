#!/bin/bash
# En el VPS: pull + instalar deps + build frontend + reiniciar API
# Uso: ./scripts/git-actualizar-vps.sh
# Ajusta PROYECTO si tu ruta es otra.

PROYECTO="${PROYECTO:-/var/www/crm-whatsapp-sas}"
cd "$PROYECTO" || exit 1

echo "=== Git pull ==="
git pull origin main || git pull origin master

echo "=== Backend: npm install ==="
(cd backend && npm install --production)

echo "=== Frontend: npm install + build ==="
(cd frontend && npm install && npm run build)

echo "=== PM2 restart crm-api ==="
(cd backend && pm2 restart crm-api && pm2 save)

echo "=== Listo ==="
