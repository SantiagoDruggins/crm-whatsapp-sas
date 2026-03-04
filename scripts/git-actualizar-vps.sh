#!/bin/bash
# En el VPS: pull + instalar deps + build frontend + reiniciar/iniciar API
# Uso: ./scripts/git-actualizar-vps.sh
# Ajusta PROYECTO si tu ruta es otra.

PROYECTO="${PROYECTO:-/var/www/crm-whatsapp-sas}"
cd "$PROYECTO" || exit 1

echo "=== Git pull ==="
git pull origin main --no-rebase || git pull origin master --no-rebase

echo "=== Backend: npm install ==="
(cd backend && npm install --omit=dev)

echo "=== Frontend: npm install + build ==="
(cd frontend && npm install && npm run build)

echo "=== PM2: restart o start crm-api ==="
(cd backend && if pm2 describe crm-api >/dev/null 2>&1; then pm2 restart crm-api; else pm2 start src/server.js --name crm-api; fi && pm2 save)

echo "=== Listo ==="
