-- IA universal: proveedor (Gemini, OpenAI, Anthropic) y API key opcional por empresa.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_api_key TEXT;
