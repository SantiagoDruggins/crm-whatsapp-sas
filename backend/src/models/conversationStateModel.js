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
                   context_data = COALESCE(EXCLUDED.context_data, conversation_state.context_data),
                   updated_at = now()
     RETURNING *`,
    [empresaId, contactoId, current_state ?? null, last_intent ?? null, context_data ? JSON.stringify(context_data) : '{}']
  );
  return result.rows[0] || null;
}

module.exports = { get, set };
