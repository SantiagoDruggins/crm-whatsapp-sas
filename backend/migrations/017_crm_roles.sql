-- Roles editables por empresa + permisos JSON por módulo del panel CRM.

CREATE TABLE IF NOT EXISTS crm_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  permisos JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_full_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT crm_roles_nombre_empresa UNIQUE (empresa_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_crm_roles_empresa ON crm_roles (empresa_id);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS crm_role_id UUID REFERENCES crm_roles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_crm_role ON usuarios (crm_role_id);

-- Un rol "Administrador" con acceso total por cada empresa que aún no lo tenga
INSERT INTO crm_roles (empresa_id, nombre, permisos, is_full_access)
SELECT e.id, 'Administrador', '{}'::jsonb, true
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM crm_roles r WHERE r.empresa_id = e.id AND r.is_full_access = true
);

-- Asignar a todos los usuarios de empresa el rol administrador de su empresa
UPDATE usuarios u
SET crm_role_id = r.id
FROM crm_roles r
WHERE u.empresa_id = r.empresa_id
  AND r.is_full_access = true
  AND u.crm_role_id IS NULL
  AND u.empresa_id IS NOT NULL;
