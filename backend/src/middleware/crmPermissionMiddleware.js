const { userCan } = require('../lib/crmPermissions');

function requireCrmPermission(key) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autorizado' });
    if (!userCan(req, key)) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a este módulo.', code: 'CRM_FORBIDDEN' });
    }
    next();
  };
}

module.exports = { requireCrmPermission };
