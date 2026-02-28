const { query } = require('../config/db');

async function listar(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM tags WHERE empresa_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows;
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM tags WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function crear(empresaId, { name, color } = {}) {
  const result = await query(
    `INSERT INTO tags (empresa_id, name, color) VALUES ($1, $2, $3) RETURNING *`,
    [empresaId, (name && String(name).trim()) || 'Sin nombre', color || '#00c896']
  );
  return result.rows[0];
}

async function actualizar(empresaId, id, { name, color } = {}) {
  const updates = [];
  const values = [id, empresaId];
  let idx = 3;
  if (name !== undefined) {
    updates.push(`name = $${idx}`);
    values.push(String(name).trim());
    idx++;
  }
  if (color !== undefined) {
    updates.push(`color = $${idx}`);
    values.push(color);
    idx++;
  }
  if (updates.length === 0) {
    return getById(empresaId, id);
  }
  updates.push('updated_at = now()');
  const result = await query(`UPDATE tags SET ${updates.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`, values);
  return result.rows[0] || null;
}

async function eliminar(empresaId, id) {
  const result = await query(`DELETE FROM tags WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]);
  return result.rowCount > 0;
}

async function getByContact(empresaId, contactId) {
  const result = await query(
    `SELECT t.* FROM tags t INNER JOIN contact_tags ct ON ct.tag_id = t.id WHERE ct.contact_id = $1 AND t.empresa_id = $2 ORDER BY t.name`,
    [contactId, empresaId]
  );
  return result.rows;
}

async function addToContact(empresaId, contactId, tagId) {
  await query(
    `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT (contact_id, tag_id) DO NOTHING`,
    [contactId, tagId]
  );
  return getById(empresaId, tagId);
}

async function removeFromContact(empresaId, contactId, tagId) {
  const result = await query(`DELETE FROM contact_tags WHERE contact_id = $1 AND tag_id = $2 RETURNING 1`, [contactId, tagId]);
  return result.rowCount > 0;
}

async function setContactTags(empresaId, contactId, tagIds) {
  if (!Array.isArray(tagIds)) return getByContact(empresaId, contactId);
  await query(`DELETE FROM contact_tags WHERE contact_id = $1`, [contactId]);
  for (const tagId of tagIds) {
    await query(`INSERT INTO contact_tags (contact_id, tag_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM tags WHERE id = $2 AND empresa_id = $3) ON CONFLICT DO NOTHING`, [contactId, tagId, empresaId]);
  }
  return getByContact(empresaId, contactId);
}

module.exports = { listar, getById, crear, actualizar, eliminar, getByContact, addToContact, removeFromContact, setContactTags };
