# Código y comandos: PC (desarrollo) y VPS (producción)

---

## Actualizar Git (PC → repo → VPS)

### En tu PC: subir cambios

```bash
cd c:\Users\eduar\Desktop\EMAIL MARKETING IA\saas_crm_multitenant

# Ver qué cambió
git status

# Añadir todo (o archivos concretos: git add backend/src/xxx)
git add .

# Commit con mensaje
git commit -m "Descripción del cambio"

# Subir al remoto (GitHub, GitLab, etc.)
git push origin main
```

Si tu rama se llama `master` en vez de `main`:

```bash
git push origin master
```

### En el VPS: bajar cambios y actualizar

Conéctate por SSH al VPS y ejecuta (ajusta la ruta del proyecto):

```bash
cd /var/www/crm-whatsapp-sas
# o la ruta donde tengas el proyecto

# Bajar últimos cambios (--no-rebase evita el error "divergent branches")
git pull origin main --no-rebase

# Si prefieres que el VPS quede exactamente igual que GitHub (sin commits locales):
# git fetch origin && git reset --hard origin/main

# Reinstalar deps y rebuild frontend + reiniciar API
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && npm run build && cd ..
cd backend && (pm2 describe crm-api >/dev/null 2>&1 && pm2 restart crm-api || pm2 start src/server.js --name crm-api) && pm2 save
```

**Todo en una línea (VPS):**

```bash
cd /var/www/crm-whatsapp-sas && git pull origin main --no-rebase && (cd backend && npm install --omit=dev) && (cd frontend && npm install && npm run build) && (cd backend && (pm2 describe crm-api >/dev/null 2>&1 && pm2 restart crm-api || pm2 start src/server.js --name crm-api) && pm2 save)
```

**Scripts:**  
- **PC (Windows):** `scripts\git-subir-pc.bat "mensaje del commit"` — hace add, commit y push.  
- **VPS:** después de `git pull`, ejecuta `./scripts/git-actualizar-vps.sh` (o `./scripts/start-vps.sh`). Si el proyecto está en otra ruta: `PROYECTO=/ruta/al/proyecto ./scripts/git-actualizar-vps.sh`.  
  Si sale *Permission denied*, da permiso de ejecución o usa bash:  
  `chmod +x scripts/*.sh`  
  o  
  `bash scripts/git-actualizar-vps.sh`

### Migración en el VPS (cuando haya nuevas migraciones)

Si en el repo hay nuevos archivos en `backend/migrations/`, ejecuta en el VPS (una vez por migración nueva).

**Si estás como root** y PostgreSQL usa *peer* authentication (error "Peer authentication failed"), ejecuta con el usuario del sistema `postgres`:

```bash
cd /var/www/crm-whatsapp-sas
sudo -u postgres psql -d saas_crm_multitenant -f /var/www/crm-whatsapp-sas/backend/migrations/019_mensajes_media_url.sql
```

**Si usas usuario/contraseña** (por ejemplo el mismo que en `backend/.env`):

```bash
cd /var/www/crm-whatsapp-sas
PGPASSWORD=tu_password psql -h localhost -U postgres -d saas_crm_multitenant -f backend/migrations/019_mensajes_media_url.sql
```

(Ajusta `postgres`, `saas_crm_multitenant` y la ruta si tu proyecto está en otro sitio.)

**Esta actualización (019):** añade la columna `media_url` a la tabla `mensajes` para poder reproducir audios de clientes en el panel de conversaciones.

---

## Requisitos comunes

- **Node.js** 18+ (recomendado 20 LTS)
- **PostgreSQL** 14+
- **npm** (viene con Node)

---

## 1. PC (desarrollo local)

### 1.1 Base de datos (PostgreSQL)

En tu PC, si tienes PostgreSQL instalado:

```bash
# Crear usuario y base (en psql o pgAdmin)
CREATE USER postgres WITH PASSWORD 'tu_password';
CREATE DATABASE saas_crm_multitenant OWNER postgres;
```

O con Docker:

```bash
docker run -d --name pg-crm -e POSTGRES_PASSWORD=tu_password -e POSTGRES_DB=saas_crm_multitenant -p 5432:5432 postgres:16-alpine
```

### 1.2 Backend (PC)

```bash
cd backend
cp .env.example .env
# Edita .env: DB_*, JWT_SECRET, GEMINI_API_KEY, etc. Para PC usa:
# NODE_ENV=development
# DB_HOST=localhost
# PUBLIC_API_URL=http://localhost:3000
# PUBLIC_APP_URL=http://localhost:3000

npm install
npm run dev
```

Queda escuchando en **http://localhost:4000**.

### 1.3 Frontend (PC)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:3000**. El proxy de Vite envía `/api` y `/uploads` al backend (4000).

### Resumen comandos PC (dos terminales)

```bash
# Terminal 1 - Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

**Atajo en Windows:** doble clic en `scripts/start-pc.bat` (abre backend y frontend en dos ventanas).

---

## 2. VPS (producción)

### 2.1 Variables de entorno en el VPS

En el VPS crea `backend/.env` a partir de `.env.example` y ajusta:

- `NODE_ENV=production`
- `DB_HOST=localhost` (si PostgreSQL está en el mismo VPS) o IP/host del servidor de BD
- `PUBLIC_API_URL=https://tudominio.com` (mismo dominio que el frontend)
- `PUBLIC_APP_URL=https://tudominio.com`
- JWT, Gemini, WhatsApp, etc. con valores reales

**Facebook / WhatsApp Cloud (conectar desde el CRM):**

- En Meta for Developers, **Facebook Login** → URL de redirección OAuth válida: `https://tu-dominio/api/facebook/callback`.
- **Embedded Signup** (Registro insertado con `FB.login` + `config_id`) en la práctica **solo Meta lo permite a apps BSP / Tech Provider**. Si ves *"Embedded signup is only available for BSPs or TPs"*, es **normal** para una app estándar: el CRM usa **OAuth en ventana** (redirect).
- **No** hace falta `FACEBOOK_USE_EMBEDDED_SIGNUP` salvo que seas partner; por defecto va en **false** (OAuth clásico).
- En `backend/.env` (VPS): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `PUBLIC_APP_URL`. Opcional: `FACEBOOK_OAUTH_SCOPES` si Meta devuelve *Invalid Scopes* (añade los permisos en la app y revisión si aplica).
- Si el popup dice **"necesita al menos un supported permission"** y tu app es tipo **Negocios**: suele faltar el **`config_id` de Facebook Login for Business** (no es el “Registro insertado” de WhatsApp ni Embedded BSP). En Meta: **Facebook Login for Business** → **Configuraciones** → crea una, añade permisos (p. ej. `business_management`) y copia el ID en `FACEBOOK_BUSINESS_LOGIN_CONFIG_ID` en `backend/.env`. Reinicia el API.
- También revisa en **Permisos y funciones** que existan **`public_profile`** y **`business_management`**. Si el `.env` pide permisos que no están en la app, Meta bloquea el diálogo. Prueba `FACEBOOK_OAUTH_SCOPES=public_profile` solo si sigue fallando el modo `scope`.
- El **frontend** ya no usa Embedded Signup salvo que en el build exista `VITE_USE_EMBEDDED_SIGNUP=true` (solo BSP/TP). Tras `git pull`, ejecuta siempre `npm run build` en `frontend` para que deje de salir el error *BSPs or TPs*.
- **API manual por cliente:** en el panel **WhatsApp Cloud** hay un bloque *Configurar API manualmente*: cada empresa puede pegar **Phone Number ID** + **Access token** de su Meta (sin OAuth). El backend ya expone `GET/PATCH /api/whatsapp/config` (autenticado).

### 2.2 Backend en el VPS

```bash
cd /ruta/del/proyecto/backend
npm install --production
npm start
```

Para que no se caiga al cerrar la sesión, usa **PM2**:

```bash
npm install -g pm2
cd /ruta/del/proyecto/backend
pm2 start src/server.js --name crm-api
pm2 save
pm2 startup
```

### 2.3 Frontend en el VPS (build + servir estáticos)

```bash
cd /ruta/del/proyecto/frontend
npm install
npm run build
```

La carpeta `dist` es la que hay que servir con Nginx (o con `serve` detrás de un proxy).

### 2.4 Nginx (recomendado en VPS)

Así el mismo dominio sirve el frontend y redirige `/api` al backend:

```nginx
server {
    listen 80;
    server_name tudominio.com;
    root /ruta/del/proyecto/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
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
        proxy_set_header Host $host;
    }
}
```

Si usas HTTPS (recomendado), configura SSL (certbot/Let's Encrypt) y cambia `listen 80` por `listen 443 ssl` y las directivas `ssl_*`.

### 2.5 Sin Nginx: solo Node (backend + estáticos)

Si no quieres instalar Nginx, puedes servir el `dist` desde el mismo backend. En el backend tendrías que añadir algo como (Express):

```javascript
// Solo para producción: servir frontend build
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}
```

Entonces en el VPS solo ejecutas el backend (con PM2) y el frontend solo lo usas para hacer `npm run build` y copiar `dist` al servidor; no hace falta proceso aparte para el frontend.

---

## Resumen rápido

| Dónde | Backend | Frontend |
|-------|---------|----------|
| **PC** | `cd backend && npm run dev` (puerto 4000) | `cd frontend && npm run dev` (puerto 3000) |
| **VPS** | `cd backend && npm start` o PM2; Nginx proxy a 4000 | `cd frontend && npm run build`; Nginx sirve `dist` |

**Script en VPS:** desde la raíz del proyecto ejecuta `chmod +x scripts/start-vps.sh` y luego `./scripts/start-vps.sh` (instala deps, hace build del frontend y reinicia el backend con PM2).
