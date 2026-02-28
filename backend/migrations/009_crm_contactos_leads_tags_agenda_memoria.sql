-- ============================================================
-- CRM: Contactos (lead_status, last_message, etc), conversation_state,
-- tags, contact_tags, appointments, mensajes.message_type
-- Compatible con esquema existente. No elimina columnas ni tablas.
-- ============================================================

-- ---------------------------------------------
-- CONTACTOS: nuevos campos
-- ---------------------------------------------
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS lead_status VARCHAR(50) DEFAULT 'new';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS conversation_status VARCHAR(50) DEFAULT 'abierta';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES usuarios(id);
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_empresa_telefono
  ON contactos (empresa_id, telefono) WHERE telefono IS NOT NULL AND telefono != '';

CREATE INDEX IF NOT EXISTS idx_contactos_lead_status ON contactos (empresa_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_contactos_last_interaction ON contactos (empresa_id, last_interaction_at DESC NULLS LAST);

-- ---------------------------------------------
-- CONVERSATION_STATE (estado de conversación por contacto)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  current_state VARCHAR(100),
  last_intent VARCHAR(100),
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, contacto_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_contacto ON conversation_state (contacto_id);

-- ---------------------------------------------
-- TAGS (por empresa)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#00c896',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, name)
);
-- Por si la tabla tags ya existía sin updated_at:
ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tags_empresa ON tags (empresa_id);

-- ---------------------------------------------
-- CONTACT_TAGS (relación contacto - tag)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags (contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags (tag_id);

-- ---------------------------------------------
-- APPOINTMENTS (citas / agenda)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  status VARCHAR(50) DEFAULT 'programada',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_empresa ON appointments (empresa_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact ON appointments (contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (empresa_id, date);

-- ---------------------------------------------
-- MENSAJES: tipo de mensaje (opcional)
-- ---------------------------------------------
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

-- Fin migración 009
