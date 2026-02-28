const { query } = require('../config/db');

async function getDashboardEmpresa(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const empresaRes = await query(`SELECT id, nombre, estado, plan, demo_expires_at, fecha_expiracion FROM empresas WHERE id = $1`, [empresaId]);
    const empresa = empresaRes.rows[0];
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    let conversacionesStats = { abiertas: 0, pendientes: 0, cerradas: 0 };
    let leadsNuevos = 0;
    const { getWhatsappConfig } = require('../models/empresaModel');
    const { isCloudConfigurado } = require('./whatsappController');
    const waConfig = await getWhatsappConfig(empresaId);
    const whatsappEstado = isCloudConfigurado(waConfig || {}) ? 'conectado' : 'no_configurado';
    let botEstado = 'deshabilitado';
    try {
      const r = await query(`SELECT COUNT(*) FILTER (WHERE estado = 'abierta') AS abiertas, COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes, COUNT(*) FILTER (WHERE estado = 'cerrada') AS cerradas FROM conversaciones WHERE empresa_id = $1`, [empresaId]);
      conversacionesStats = r.rows[0] || conversacionesStats;
    } catch (e) {}
    try {
      const r = await query(`SELECT COUNT(*) AS leads_nuevos FROM contactos WHERE empresa_id = $1 AND created_at >= now() - interval '7 days'`, [empresaId]);
      leadsNuevos = Number(r.rows[0]?.leads_nuevos || 0);
    } catch (e) {}
    try {
      const r = await query(`SELECT estado FROM bots WHERE empresa_id = $1 ORDER BY updated_at DESC LIMIT 1`, [empresaId]);
      botEstado = r.rows[0]?.estado || 'deshabilitado';
    } catch (e) {}
    const diasRestantes = empresa.fecha_expiracion ? Math.max(0, Math.ceil((new Date(empresa.fecha_expiracion) - new Date()) / (1000 * 60 * 60 * 24))) : null;
    const diasDemoRestantes = empresa.demo_expires_at ? Math.max(0, Math.ceil((new Date(empresa.demo_expires_at) - new Date()) / (1000 * 60 * 60 * 24))) : null;
    return res.json({ ok: true, empresa, estadoCuenta: empresa.estado, diasRestantes, diasDemoRestantes, conversaciones: { abiertas: Number(conversacionesStats.abiertas || 0), pendientes: Number(conversacionesStats.pendientes || 0), cerradas: Number(conversacionesStats.cerradas || 0) }, leadsNuevos7Dias: leadsNuevos, estadoWhatsapp: whatsappEstado, estadoBot: botEstado, planActual: empresa.plan });
  } catch (err) {
    console.error('getDashboardEmpresa', err);
    return res.status(500).json({ message: err.message || 'Error al obtener dashboard' });
  }
}

module.exports = { getDashboardEmpresa };
