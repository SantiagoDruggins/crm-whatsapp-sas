/** Claves de permisos del panel CRM (coinciden con frontend). */
const CRM_PERMISSION_KEYS = [
  'panel',
  'contactos',
  'conversaciones',
  'pide_agente',
  'whatsapp',
  'bot_ia',
  'catalogo',
  'pedidos',
  'agenda',
  'automatizaciones',
  'integraciones',
  'pagos',
  'branding',
  'sugerencias',
];

function normalizePermisos(raw) {
  const out = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const k of CRM_PERMISSION_KEYS) {
    out[k] = !!src[k];
  }
  return out;
}

function userCan(req, key) {
  if (!req.user) return false;
  if (req.user.rol === 'super_admin') return true;
  if (!req.user.empresaId) return false;
  if (req.user.rol === 'admin' && !req.user.crmRoleId) return true;
  if (req.user.rol === 'admin' && req.user.crmIsFullAccess) return true;
  if (req.user.crmIsFullAccess) return true;
  if (!CRM_PERMISSION_KEYS.includes(key)) return false;
  return !!(req.user.crmPermisos && req.user.crmPermisos[key]);
}

/** Objeto { clave: boolean } para el cliente (login /auth/me). */
function permisosParaCliente(req) {
  if (!req.user || req.user.rol === 'super_admin') {
    const all = {};
    for (const k of CRM_PERMISSION_KEYS) all[k] = true;
    return all;
  }
  if (!req.user.empresaId) {
    const none = {};
    for (const k of CRM_PERMISSION_KEYS) none[k] = false;
    return none;
  }
  if (req.user.rol === 'admin' && !req.user.crmRoleId) {
    const all = {};
    for (const k of CRM_PERMISSION_KEYS) all[k] = true;
    return all;
  }
  if (req.user.rol === 'admin' && req.user.crmIsFullAccess) {
    const all = {};
    for (const k of CRM_PERMISSION_KEYS) all[k] = true;
    return all;
  }
  if (req.user.crmIsFullAccess) {
    const all = {};
    for (const k of CRM_PERMISSION_KEYS) all[k] = true;
    return all;
  }
  return normalizePermisos(req.user.crmPermisos);
}

function esAdminCrm(req) {
  if (!req.user || req.user.rol === 'super_admin') return false;
  if (!req.user.empresaId) return false;
  if (req.user.rol === 'admin' && !req.user.crmRoleId) return true;
  if (req.user.rol === 'admin' && req.user.crmIsFullAccess) return true;
  return !!req.user.crmIsFullAccess;
}

/** Fila con empresa_id, rol, crm_role_id, crm_permisos (join), crm_is_full_access — p. ej. login. */
function usuarioClienteDesdeFila(row) {
  if (!row) return null;
  let crmPermisos = row.crm_permisos && typeof row.crm_permisos === 'object' ? row.crm_permisos : {};
  let crmIsFullAccess = !!row.crm_is_full_access;
  if (row.empresa_id && !row.crm_role_id && row.rol === 'admin') {
    crmIsFullAccess = true;
    crmPermisos = {};
  }
  const reqLike = {
    user: {
      id: row.id,
      rol: row.rol,
      empresaId: row.empresa_id,
      crmRoleId: row.crm_role_id,
      crmPermisos,
      crmIsFullAccess,
    },
  };
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    empresa_id: row.empresa_id,
    crm_role_id: row.crm_role_id || null,
    es_admin_crm: esAdminCrm(reqLike),
    permisos: permisosParaCliente(reqLike),
  };
}

module.exports = {
  CRM_PERMISSION_KEYS,
  normalizePermisos,
  userCan,
  permisosParaCliente,
  esAdminCrm,
  usuarioClienteDesdeFila,
};
