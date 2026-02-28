-- Añadir tipo de bot (soporte, agenda, ventas, general) y conocimiento (textos/archivos)
ALTER TABLE bots ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'general';
ALTER TABLE bots ADD COLUMN IF NOT EXISTS conocimiento JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN bots.tipo IS 'soporte | agenda | ventas | general';
COMMENT ON COLUMN bots.conocimiento IS 'Array de { tipo: texto|archivo|imagen, nombre?, contenido?, ruta? }';
