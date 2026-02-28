# Despliegue en VPS y configuración del webhook de WhatsApp

## 1. Requisitos en el VPS

- Dominio apuntando a la IP del VPS (ej: `api.tudominio.com` o `tudominio.com`).
- **HTTPS** obligatorio: Meta solo acepta webhooks por HTTPS.
- Backend escuchando en un puerto (ej: 4000) y Nginx (o Caddy) como reverse proxy con SSL.

## 2. URL del webhook

Tu backend expone el webhook en:

```
https://TU_DOMINIO/api/whatsapp/webhook
```

Ejemplos:
- Si tu API está en `https://api.miapp.com` → `https://api.miapp.com/api/whatsapp/webhook`
- Si está en `https://miapp.com/backend` tendrías que montar la API en ese path; lo habitual es un subdominio tipo `api.miapp.com`.

## 3. Variables de entorno (backend)

En el `.env` del servidor define al menos:

```env
# WhatsApp Cloud API - Webhook
WHATSAPP_CLOUD_VERIFY_TOKEN=un_texto_secreto_que_eliges_tu

# Opcional: URL pública del API (para que los clientes vean la URL correcta del webhook en el CRM)
# Si no la pones, se usará el dominio desde el que carguen la web.
PUBLIC_API_URL=https://api.dsgchatbot.pro
```

Ese **Verify Token** es un valor que tú inventas (ej: una frase larga o un UUID). Debe ser **el mismo** que pongas en la consola de Meta.

Las demás variables de WhatsApp cada **empresa** las configura en el CRM (token y Phone Number ID por empresa). El verify token del `.env` es global y se usa solo para la verificación inicial del webhook con Meta.

## 4. Nginx (ejemplo) con SSL

Supón que el backend corre en `localhost:4000` y tu dominio es `api.tudominio.com`:

```nginx
server {
    listen 80;
    server_name api.tudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tudominio.com;

    ssl_certificate     /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

Obtén el certificado con Certbot:

```bash
sudo certbot certonly --nginx -d api.tudominio.com
```

## 5. Configurar el webhook en Meta (Facebook Developers)

1. Entra a [developers.facebook.com](https://developers.facebook.com) → tu app → **WhatsApp** → **Configuration** (o **Configuración**).
2. En **Webhook**:
   - **Callback URL**: `https://TU_DOMINIO/api/whatsapp/webhook`  
     (reemplaza TU_DOMINIO por tu dominio real, sin barra final).
   - **Verify token**: el mismo valor que pusiste en `WHATSAPP_CLOUD_VERIFY_TOKEN` en el `.env`.
3. Pulsa **Verify and Save**. Meta hará un `GET` a esa URL con `hub.mode=subscribe`, `hub.verify_token=...` y `hub.challenge=...`. Tu backend debe responder con el `challenge` en el body; si el verify token coincide, Meta dará la verificación por válida.
4. En **Webhook fields**, suscríbete al campo **messages** (y si usas notificaciones de estado, **message_deliveries** / **message_reads** según quieras).
5. Guarda.

## 6. Comprobar que responde

- **GET** (verificación):
  ```text
  https://TU_DOMINIO/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=12345
  ```
  Debe devolver en el cuerpo solo: `12345` (y 200).

- **Health** del API:
  ```text
  https://TU_DOMINIO/health
  ```
  Debe devolver algo como `{"status":"ok","env":"production"}`.

## 7. Resumen

| Dónde              | Qué poner |
|--------------------|-----------|
| `.env` en el VPS   | `WHATSAPP_CLOUD_VERIFY_TOKEN=el_mismo_secreto` |
| Meta → Callback URL| `https://TU_DOMINIO/api/whatsapp/webhook`      |
| Meta → Verify token| El mismo valor que `WHATSAPP_CLOUD_VERIFY_TOKEN` |
| Meta → Webhook fields | Suscribir **messages** (y otros si los usas) |

Cada empresa sigue configurando su **Access Token** y **Phone Number ID** desde el CRM (Integraciones / WhatsApp). El webhook es uno solo por backend; el controlador identifica la empresa por el `phone_number_id` que Meta envía en cada POST.
