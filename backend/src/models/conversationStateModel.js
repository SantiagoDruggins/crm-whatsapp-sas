const { query } = require('../config/db');

async function get(empresaId, contactoId) {
  const result = await query(
    `SELECT * FROM conversation_state WHERE empresa_id = $1 AND contacto_id = $2 LIMIT 1`,
    [empresaId, contactoId]
  );
  return result.rows[0] || null;
}

/** Crea o actualiza estado de conversación (upsert). */
async function set(empresaId, contactoId, data) {
  const { current_state, last_intent, context_data } = data;
  const result = await query(
    `INSERT INTO conversation_state (empresa_id, contacto_id, current_state, last_intent, context_data, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (empresa_id, contacto_id)
     DO UPDATE SET current_state = COALESCE(EXCLUDED.current_state, conversation_state.current_state),
                   last_intent = COALESCE(EXCLUDED.last_intent, conversation_state.last_intent),
                   context_data = COALESCE(conversation_state.context_data, '{}'::jsonb) || COALESCE(EXCLUDED.context_data, '{}'::jsonb),
                   updated_at = now()
     RETURNING *`,
    [empresaId, contactoId, current_state ?? null, last_intent ?? null, context_data ? JSON.stringify(context_data) : '{}']
  );
  return result.rows[0] || null;
}

/**
 * Actualiza el "motor de conversación" en context_data sin romper claves existentes.
 */
async function setMotorState(empresaId, contactoId, motor = {}) {
  const payload = {};
  if (motor.estado_operativo !== undefined) payload.estado_operativo = motor.estado_operativo;
  if (motor.intencion_actual !== undefined) payload.intencion_actual = motor.intencion_actual;
  if (motor.paso_actual !== undefined) payload.paso_actual = motor.paso_actual;
  if (motor.bloqueo_bot !== undefined) payload.bloqueo_bot = !!motor.bloqueo_bot;
  if (motor.updated_by !== undefined) payload.updated_by = motor.updated_by;
  if (motor.extra && typeof motor.extra === 'object') {
    payload.extra = motor.extra;
  }
  payload.updated_at_iso = new Date().toISOString();
  return set(empresaId, contactoId, {
    current_state: motor.estado_operativo || null,
    last_intent: motor.intencion_actual || null,
    context_data: { motor_conversacion: payload },
  });
}

module.exports = { get, set, setMotorState };
