const cron = require('node-cron');
const { query } = require('../config/db');

async function revisarSuscripcionesVencidas() {
  try {
    await query(`
      UPDATE empresas SET estado = 'vencida', updated_at = now()
      WHERE estado IN ('activa', 'demo_activa') AND fecha_expiracion IS NOT NULL AND fecha_expiracion < now()
    `);
    await query(`
      UPDATE empresas SET estado = 'vencida', updated_at = now()
      WHERE estado = 'demo_activa' AND demo_expires_at IS NOT NULL AND demo_expires_at < now()
    `);
  } catch (e) {
    console.error('Error cron suscripciones', e);
  }
}

function iniciarCronSuscripciones() {
  cron.schedule('0 * * * *', revisarSuscripcionesVencidas);
  revisarSuscripcionesVencidas().catch(() => {});
}

module.exports = { iniciarCronSuscripciones };
