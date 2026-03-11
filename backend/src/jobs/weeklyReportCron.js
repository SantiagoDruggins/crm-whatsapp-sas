const cron = require('node-cron');
const { query } = require('../config/db');
const { enviarMensajeEmpresa, isCloudConfigurado } = require('../controllers/whatsappController');
const { getWhatsappConfig } = require('../models/empresaModel');

function fmtNumber(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

function cleanPhone(p) {
  return (p || '').toString().replace(/\D/g, '');
}

async function buildWeeklyReport(empresaId) {
  const [leads, pedidos, citas, conv] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM contactos WHERE empresa_id = $1 AND created_at >= now() - interval '7 days'`, [empresaId]),
    query(`SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS suma FROM pedidos WHERE empresa_id = $1 AND created_at >= now() - interval '7 days'`, [empresaId]),
    query(`SELECT COUNT(*) AS total FROM appointments WHERE empresa_id = $1 AND created_at >= now() - interval '7 days'`, [empresaId]),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE ultimo_mensaje_at >= now() - interval '7 days') AS total,
         COUNT(*) FILTER (WHERE estado = 'abierta') AS abiertas,
         COUNT(*) FILTER (WHERE pide_agente_humano = true) AS pide_agente
       FROM conversaciones
       WHERE empresa_id = $1`,
      [empresaId]
    ),
  ]);
  return {
    leads: Number(leads.rows[0]?.total || 0),
    pedidos: Number(pedidos.rows[0]?.total || 0),
    pedidosMonto: Number(pedidos.rows[0]?.suma || 0),
    citas: Number(citas.rows[0]?.total || 0),
    conversaciones7d: Number(conv.rows[0]?.total || 0),
    abiertas: Number(conv.rows[0]?.abiertas || 0),
    pideAgente: Number(conv.rows[0]?.pide_agente || 0),
  };
}

async function enviarReportesSemanales() {
  try {
    const empresasRes = await query(
      `SELECT id, nombre, telefono_whatsapp, last_weekly_report_at
       FROM empresas
       WHERE estado IN ('activa', 'demo_activa')`,
      []
    );
    const empresas = empresasRes.rows || [];
    for (const e of empresas) {
      const to = cleanPhone(e.telefono_whatsapp);
      if (!to) continue;

      // Evitar duplicados (si ya se envió en los últimos 6 días)
      if (e.last_weekly_report_at) {
        const diff = Date.now() - new Date(e.last_weekly_report_at).getTime();
        if (diff < 6 * 24 * 60 * 60 * 1000) continue;
      }

      // WhatsApp configurado
      const wa = await getWhatsappConfig(e.id);
      if (!isCloudConfigurado(wa || {})) continue;

      const m = await buildWeeklyReport(e.id);
      const texto =
        `📊 Reporte semanal (${(new Date()).toLocaleDateString('es-CO')})\n` +
        `Empresa: ${e.nombre || '—'}\n\n` +
        `- Leads nuevos: ${fmtNumber(m.leads)}\n` +
        `- Conversaciones (7 días): ${fmtNumber(m.conversaciones7d)}\n` +
        `- Abiertas: ${fmtNumber(m.abiertas)}\n` +
        `- Piden humano: ${fmtNumber(m.pideAgente)}\n` +
        `- Pedidos: ${fmtNumber(m.pedidos)}\n` +
        `- Total pedidos: ${fmtNumber(m.pedidosMonto)}\n` +
        `- Citas: ${fmtNumber(m.citas)}\n\n` +
        `Siguiente paso recomendado:\n` +
        (m.pideAgente > 0 ? `- Atiende “Pide agente humano” para cerrar más rápido.\n` : `- Revisa conversaciones abiertas y responde en menos de 5 min.\n`) +
        (m.pedidos > 0 ? `- En “Pedidos”, verifica dirección y pago.\n` : `- En “Catálogo”, agrega 1 oferta y compártela en WhatsApp.\n`);

      const sent = await enviarMensajeEmpresa(e.id, to, texto);
      if (sent?.ok) {
        await query(`UPDATE empresas SET last_weekly_report_at = now(), updated_at = now() WHERE id = $1`, [e.id]);
      }
    }
  } catch (err) {
    console.error('weeklyReportCron:', err.message || err);
  }
}

function iniciarCronReporteSemanal() {
  // Lunes 9:00am (hora del servidor). Ajustable con env si quieres.
  cron.schedule('0 9 * * 1', enviarReportesSemanales);
}

module.exports = { iniciarCronReporteSemanal, enviarReportesSemanales };

