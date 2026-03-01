const { query } = require('../config/db');

/**
 * GET /crm/actividad-reciente
 * Devuelve conversaciones con último mensaje, citas próximas y pedidos recientes para notificaciones.
 */
async function actividadReciente(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const [convRes, citasRes, pedidosRes] = await Promise.all([
      query(
        `SELECT c.id, c.ultimo_mensaje_at, co.nombre AS contacto_nombre, co.apellidos AS contacto_apellidos, co.telefono AS contacto_telefono
         FROM conversaciones c
         LEFT JOIN contactos co ON co.id = c.contacto_id AND co.empresa_id = c.empresa_id
         WHERE c.empresa_id = $1 AND c.ultimo_mensaje_at IS NOT NULL
         ORDER BY c.ultimo_mensaje_at DESC
         LIMIT 20`,
        [empresaId]
      ),
      query(
        `SELECT a.id, a.date, a.time, a.status, a.notes, a.created_at, co.nombre AS contacto_nombre, co.telefono AS contacto_telefono
         FROM appointments a
         JOIN contactos co ON co.id = a.contact_id AND co.empresa_id = a.empresa_id
         WHERE a.empresa_id = $1 AND a.date >= CURRENT_DATE
         ORDER BY a.date ASC, a.time ASC NULLS LAST
         LIMIT 10`,
        [empresaId]
      ),
      query(
        `SELECT p.id, p.estado, p.total, p.created_at, c.nombre AS contacto_nombre, c.telefono AS contacto_telefono
         FROM pedidos p
         LEFT JOIN contactos c ON c.id = p.contacto_id
         WHERE p.empresa_id = $1
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [empresaId]
      )
    ]);

    const conversaciones = (convRes.rows || []).map((r) => ({
      id: r.id,
      ultimo_mensaje_at: r.ultimo_mensaje_at,
      contacto_nombre: [r.contacto_nombre, r.contacto_apellidos].filter(Boolean).join(' ').trim() || r.contacto_telefono || 'Contacto',
      contacto_telefono: r.contacto_telefono
    }));
    const citas_proximas = citasRes.rows || [];
    const pedidos_recientes = pedidosRes.rows || [];

    return res.json({
      ok: true,
      conversaciones,
      citas_proximas,
      pedidos_recientes
    });
  } catch (err) {
    console.error('actividadReciente', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { actividadReciente };
