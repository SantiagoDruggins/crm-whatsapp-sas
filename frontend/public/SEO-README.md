# SEO – DELTHASEG CRM WhatsApp

## Qué está configurado

- **index.html**: título y meta description orientados a búsquedas (CRM WhatsApp, chatbot IA, Colombia). Open Graph y Twitter Card para redes. JSON-LD (Organization + SoftwareApplication) para resultados enriquecidos.
- **robots.txt**: permite indexar `/`, `/registro`, `/login`, `/politica-de-privacidad`. Bloquea `/dashboard`, `/admin` y flujos de contraseña.
- **sitemap.xml**: incluye home, registro, login y política de privacidad.

## Antes de producción

1. **Dominio real**  
   Si cambias de dominio, sustituye `https://dsgchatbot.pro` por la nueva URL en:
   - `index.html`: `canonical`, `og:url`, `og:image`, `twitter:image`, y las URLs del JSON-LD.
   - `public/robots.txt`: línea `Sitemap:`.
   - `public/sitemap.xml`: todas las `<loc>`.

2. **Imagen para redes (recomendado)**  
   Para mejor preview en Facebook/LinkedIn/WhatsApp, crea una imagen **1200×630 px** (og:image), por ejemplo `og-image.jpg` en `public/`, y en `index.html` pon:
   - `og:image` y `twitter:image`: `https://dsgchatbot.pro/og-image.jpg`

3. **Google Search Console**  
   Verifica el sitio y envía `sitemap.xml` (URL: `https://dsgchatbot.pro/sitemap.xml`).

4. **lastmod en sitemap**  
   Cuando cambies contenido importante, actualiza la fecha `<lastmod>` en `sitemap.xml`.

## Palabras clave objetivo (referencia)

CRM WhatsApp, chatbot WhatsApp, IA WhatsApp, automatizar WhatsApp, WhatsApp Business, ventas por WhatsApp, CRM Colombia, bot IA, demo gratis CRM.
