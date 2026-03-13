# Nginx: que /terminos y otras rutas abran la app (SPA)

Si al abrir `https://dsgchatbot.pro/terminos` te manda a la página principal, es porque Nginx no está devolviendo `index.html` para esa ruta.

## Qué hacer en el VPS

1. **Abre la config de Nginx** (ruta típica):
   ```bash
   sudo nano /etc/nginx/sites-available/dsgchatbot.pro
   ```
   (o el archivo que uses para este sitio: `default`, `crm`, etc.)

2. **Busca el `location /`** que sirve el frontend (la carpeta `frontend/dist` o similar). Debe verse algo así:
   ```nginx
   location / {
       root /var/www/crm-whatsapp-sas/frontend/dist;
       index index.html;
   }
   ```

3. **Cámbialo a** (añade `try_files` para que todas las rutas caigan en `index.html`):
   ```nginx
   location / {
       root /var/www/crm-whatsapp-sas/frontend/dist;
       index index.html;
       try_files $uri $uri/ /index.html;
   }
   ```

4. **Guarda** (Ctrl+O, Enter, Ctrl+X en nano).

5. **Comprueba y recarga Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

Después de esto, al abrir `https://dsgchatbot.pro/terminos` se servirá `index.html` y React Router mostrará la página de condiciones.
