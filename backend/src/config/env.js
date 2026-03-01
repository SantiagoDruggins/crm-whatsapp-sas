require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
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
  whatsapp: {
    cloudVerifyToken: process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || '',
    publicWebhookBaseUrl: (process.env.PUBLIC_API_URL || process.env.PUBLIC_WEBHOOK_BASE_URL || '').replace(/\/$/, ''),
    cloudAccessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '',
    cloudPhoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '',
    cloudApiBaseUrl: process.env.WHATSAPP_CLOUD_API_BASE_URL || 'https://graph.facebook.com/v19.0'
  },
  dropi: {
    apiBaseUrl: process.env.DROPI_API_BASE_URL || '',
    apiKeyHeader: process.env.DROPI_API_KEY_HEADER || 'Authorization'
  },
  mastershop: {
    apiBaseUrl: process.env.MASTERSHOP_API_BASE_URL || '',
    apiKeyHeader: process.env.MASTERSHOP_API_KEY_HEADER || 'Authorization'
  }
};

module.exports = config;
