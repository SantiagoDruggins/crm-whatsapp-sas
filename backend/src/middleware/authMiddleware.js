const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return res.status(401).json({ message: 'No autorizado: token requerido' });
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    const { userId, empresaId, rol } = decoded;
    const result = await query(`
      SELECT u.id, u.nombre, u.email, u.rol, u.is_active, u.empresa_id,
             e.estado AS empresa_estado, e.demo_expires_at, e.fecha_expiracion, e.plan
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.id = $1
    `, [userId]);
    if (result.rowCount === 0) return res.status(401).json({ message: 'Usuario no encontrado' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'Usuario inactivo' });
    req.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, empresaId: user.empresa_id || empresaId || null };
    req.empresa = { id: user.empresa_id || empresaId || null, estado: user.empresa_estado, demo_expires_at: user.demo_expires_at, fecha_expiracion: user.fecha_expiracion, plan: user.plan };
    next();
  } catch (err) {
    console.error('authMiddleware', err);
    res.status(500).json({ message: 'Error interno de autenticación' });
  }
}

module.exports = authMiddleware;
