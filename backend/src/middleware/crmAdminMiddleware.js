const { esAdminCrm } = require('../lib/crmPermissions');

/** Solo administradores del CRM (rol con acceso total a la empresa) gestionan roles y usuarios. */
function requireCrmAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'No autorizado' });
  if (esAdminCrm(req)) return next();
  return res.status(403).json({ message: 'Solo el administrador de la empresa puede gestionar equipo y roles.' });
}

module.exports = { requireCrmAdmin };
