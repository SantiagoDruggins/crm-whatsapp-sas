require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  /** URL pública base de la app (ej. https://dsgchatbot.pro) para enlazar imágenes enviadas por WhatsApp */
  publicBaseUrl: (process.env.PUBLIC_APP_URL || process.env.PUBLIC_API_URL || '').replace(/\/$/, ''),
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'saas_crm_multitenant',
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
    ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts',
    temperature: Number(process.env.GEMINI_TEMPERATURE || 0.4),
    topP: Number(process.env.GEMINI_TOP_P || 0.9),
    maxOutputTokens: Math.min(65536, Math.max(256, Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 8192)))
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'
  },
  grok: {
    apiKey: process.env.GROK_API_KEY || '',
    model: process.env.GROK_MODEL || 'grok-2-latest'
  },
  facebook: {
    appId: (process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || '').trim(),
    appSecret: (process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '').trim(),
    /** URL base pública (ej. https://dsgchatbot.pro) para redirect_uri del OAuth */
    redirectUri: (process.env.PUBLIC_APP_URL || process.env.PUBLIC_API_URL || '').replace(/\/$/, '') + '/api/facebook/callback',
    /**
     * Embedded Signup (FB.login + config_id) solo está permitido por Meta para BSP / Tech Provider.
     * Apps normales deben usar OAuth redirect (GET /auth-url). Por defecto: false.
     * Pon true solo si tu app está aprobada como partner BSP/TP.
     */
    useEmbeddedSignup: process.env.FACEBOOK_USE_EMBEDDED_SIGNUP === 'true',
    /** ID de configuración "Registro insertado" en Meta (solo si useEmbeddedSignup=true). */
    embeddedSignupConfigId: (process.env.FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID || '').trim(),
    /**
     * Facebook Login for Business (app tipo Negocios): config_id de la configuración creada en
     * Meta → Facebook Login for Business → Configuraciones. Sin esto Meta suele mostrar
     * "necesita al menos un supported permission" al usar solo ?scope=...
     * NO es el mismo ID que Embedded Signup de WhatsApp (BSP).
     */
    businessLoginConfigId: (process.env.FACEBOOK_BUSINESS_LOGIN_CONFIG_ID || '').trim(),
    /**
     * Botones "Migrar / Registrar" (un clic). Por defecto activo; pon FACEBOOK_SHOW_OAUTH_UI=false para ocultarlos.
     */
    showFacebookOAuthUi: process.env.FACEBOOK_SHOW_OAUTH_UI !== 'false',
    /**
     * Formulario pegar Phone Number ID + token. Por defecto oculto (solo conexión automática).
     * FACEBOOK_SHOW_MANUAL_WHATSAPP_API=true para soporte o entornos de prueba.
     */
    showManualWhatsappApi: process.env.FACEBOOK_SHOW_MANUAL_WHATSAPP_API === 'true',
    /**
     * Permisos OAuth (modo scope). Si falta FACEBOOK_BUSINESS_LOGIN_CONFIG_ID, default mínimo public_profile
     * para que el diálogo no falle; el callback puede pedir business_management o usar configuración manual.
     */
    oauthScopes: (process.env.FACEBOOK_OAUTH_SCOPES || '').trim() ||
      'public_profile',
  },
  whatsapp: {
    cloudVerifyToken: process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || '',
    /** Misma prioridad que publicBaseUrl: si solo existe PUBLIC_APP_URL, el panel y Meta deben usar la misma base. */
    publicWebhookBaseUrl: (process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || process.env.PUBLIC_WEBHOOK_BASE_URL || '').replace(/\/$/, ''),
    cloudAccessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '',
    cloudPhoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '',
    cloudApiBaseUrl: process.env.WHATSAPP_CLOUD_API_BASE_URL || 'https://graph.facebook.com/v19.0'
  },
  wompi: {
    env: (process.env.WOMPI_ENV || 'production').toLowerCase(), // production | sandbox
    publicKey: (process.env.WOMPI_PUBLIC_KEY || '').trim(),
    privateKey: (process.env.WOMPI_PRIVATE_KEY || '').trim(),
    /** Secreto para verificar webhooks (si lo configuras en Wompi). */
    eventsSecret: (process.env.WOMPI_EVENTS_SECRET || '').trim(),
    /** Secreto de integridad (Dashboard → Desarrolladores) para Widget / Web Checkout. No es la llave privada. */
    integritySecret: (process.env.WOMPI_INTEGRITY_SECRET || '').trim(),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@example.com'
  }
};

module.exports = config;
