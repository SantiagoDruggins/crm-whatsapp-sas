# Desplegar frontend en el VPS (dsgchatbot.pro)

El backend ya está en api.dsgchatbot.pro. Aquí se sirve el frontend en **dsgchatbot.pro** (y www) y se hace proxy de `/api` y `/uploads` al backend para que todo funcione en un solo dominio.

## 1. En el VPS: instalar dependencias y generar el build

```bash
cd /var/www/crm-whatsapp-sas/frontend
npm install
npm run build
```

Se crea la carpeta `dist/` con los estáticos.

## 2. Crear sitio Nginx para la web (dsgchatbot.pro)

```bash
nano /etc/nginx/sites-available/web
```

Pega esto (y guarda: Ctrl+O, Enter, Ctrl+X):

```nginx
server {
    listen 80;
    server_name dsgchatbot.pro www.dsgchatbot.pro;
    root /var/www/crm-whatsapp-sas/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 3. Activar sitio y recargar Nginx

```bash
ln -sf /etc/nginx/sites-available/web /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 4. SSL para dsgchatbot.pro y www

```bash
certbot --nginx -d dsgchatbot.pro -d www.dsgchatbot.pro
```

## 5. Listo

- **https://dsgchatbot.pro** → frontend (CRM, login, registro, etc.)
- **https://api.dsgchatbot.pro** → API (webhook de WhatsApp y health)

El frontend llama a `/api`, Nginx lo envía al backend en el puerto 4000.

## Actualizar frontend después de cambios

En el VPS:

```bash
cd /var/www/crm-whatsapp-sas
git pull
cd frontend
npm install
npm run build
```

No hace falta reiniciar Nginx; los archivos en `dist/` se habrán actualizado.
