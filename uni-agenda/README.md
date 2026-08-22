# UniAgenda

Web simple para universitarios. Permite registrar materia, tarea, fecha, hora y prioridad; muestra calendario mensual, pendientes, tareas de hoy y resumen semanal.

## Uso local

Abre `index.html` directamente en el navegador o sirve la carpeta con cualquier servidor estático.

```bash
cd uni-agenda
npx serve .
```

## Publicar en VPS con Nginx

Copia o sube la carpeta `uni-agenda` al VPS y crea un bloque Nginx como este:

```nginx
server {
    listen 80;
    server_name agenda.tudominio.com;
    root /var/www/uni-agenda;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Después:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

También puedes usar el script incluido desde la raíz del repo en el VPS:

```bash
chmod +x scripts/instalar-uni-agenda-vps.sh
DOMINIO=agenda.tudominio.com PROYECTO=/var/www/crm-whatsapp-sas ./scripts/instalar-uni-agenda-vps.sh
```

Los datos se guardan en `localStorage`, así que cada estudiante conserva su agenda en su navegador.
