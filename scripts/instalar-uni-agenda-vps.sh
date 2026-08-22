#!/usr/bin/env bash
set -euo pipefail

PROYECTO="${PROYECTO:-/var/www/crm-whatsapp-sas}"
DESTINO="${DESTINO:-/var/www/uni-agenda}"
DOMINIO="${DOMINIO:-agenda.tudominio.com}"
NGINX_SITE="/etc/nginx/sites-available/uni-agenda"

if [ ! -d "$PROYECTO/uni-agenda" ]; then
  echo "No existe $PROYECTO/uni-agenda. Ajusta PROYECTO=/ruta/del/repo."
  exit 1
fi

sudo mkdir -p "$DESTINO"
sudo rsync -a --delete "$PROYECTO/uni-agenda/" "$DESTINO/"

sudo tee "$NGINX_SITE" >/dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMINIO};

    root ${DESTINO};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/uni-agenda
sudo nginx -t
sudo systemctl reload nginx

echo "UniAgenda publicada en http://${DOMINIO}"
