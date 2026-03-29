const { userCan } = require('../lib/crmPermissions');

/**
 * Asigna permiso por prefijo de ruta bajo /api/crm (req.path relativo al router).
 */
const RULES = [
  { re: /^\/actividad-reciente(\/|$)/, perm: 'panel' },
  { re: /^\/contactos(\/|$)/, perm: 'contactos' },
  { re: /^\/tags(\/|$)/, perm: 'contactos' },
  { re: /^\/conversaciones(\/|$)/, perm: 'conversaciones' },
  { re: /^\/flows(\/|$)/, perm: 'automatizaciones' },
  { re: /^\/webhooks(\/|$)/, perm: 'integraciones' },
  { re: /^\/appointments(\/|$)/, perm: 'agenda' },
  { re: /^\/productos(\/|$)/, perm: 'catalogo' },
  { re: /^\/empresa\/logo(\/|$)/, perm: 'branding' },
  { re: /^\/feedback(\/|$)/, perm: 'sugerencias' },
];

function crmPathPermissionMiddleware(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'No autorizado' });
  if (req.user.rol === 'super_admin') {
    return res.status(403).json({ message: 'Ruta de empresa no disponible para este usuario.' });
  }
  const path = req.path || '';
  for (const rule of RULES) {
    if (rule.re.test(path)) {
      if (!userCan(req, rule.perm)) {
        return res.status(403).json({ message: 'No tienes permiso para acceder a este módulo.', code: 'CRM_FORBIDDEN' });
      }
      return next();
    }
  }
  return next();
}

module.exports = { crmPathPermissionMiddleware };
