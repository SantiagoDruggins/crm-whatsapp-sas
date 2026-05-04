const { pool, query } = require('../config/db');

function normalizeMediaInput(media = [], fallbackImageUrl = null) {
  const list = Array.isArray(media) ? media : [];
  const clean = list
    .map((m, idx) => ({
      type: String(m?.type || '').trim().toLowerCase(),
      url: String(m?.url || '').trim(),
      is_primary: !!(m?.is_primary ?? m?.isPrimary),
      order_index: Number.isFinite(Number(m?.order_index ?? m?.orderIndex)) ? Number(m?.order_index ?? m?.orderIndex) : idx,
    }))
    .filter((m) => m.url);

  if (clean.length === 0 && fallbackImageUrl && String(fallbackImageUrl).trim()) {
    clean.push({ type: 'image', url: String(fallbackImageUrl).trim(), is_primary: true, order_index: 0 });
  }

  for (const m of clean) {
    if (!['image', 'video'].includes(m.type)) {
      const err = new Error('Solo se permite media type image o video');
      err.status = 400;
      throw err;
    }
  }

  if (clean.length === 0) {
    const err = new Error('Debe existir mínimo 1 media');
    err.status = 400;
    throw err;
  }

  clean.sort((a, b) => a.order_index - b.order_index);
  if (!clean.some((m) => m.is_primary)) {
    const firstImage = clean.find((m) => m.type === 'image') || clean[0];
    firstImage.is_primary = true;
  }
  let primaryUsed = false;
  return clean.map((m, idx) => {
    const isPrimary = m.is_primary && !primaryUsed;
    if (isPrimary) primaryUsed = true;
    return { ...m, is_primary: isPrimary, order_index: idx };
  });
}

function attachMedia(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const id = row.id;
    if (!byId.has(id)) {
      const base = { ...row, media: [] };
      delete base.media_id;
      delete base.media_type;
      delete base.media_url;
      delete base.media_is_primary;
      delete base.media_order_index;
      byId.set(id, base);
    }
    if (row.media_id) {
      byId.get(id).media.push({
        id: row.media_id,
        type: row.media_type,
        url: row.media_url,
        is_primary: row.media_is_primary,
        order_index: row.media_order_index,
      });
    }
  }
  return Array.from(byId.values()).map((p) => {
    if (!p.imagen_url && p.media.length) {
      const primary = p.media.find((m) => m.is_primary) || p.media.find((m) => m.type === 'image') || p.media[0];
      p.imagen_url = primary?.url || null;
    }
    return p;
  });
}

async function setMediaForProduct(client, productId, media) {
  await client.query(`DELETE FROM product_media WHERE product_id = $1`, [productId]);
  for (const m of media) {
    await client.query(
      `INSERT INTO product_media (product_id, type, url, is_primary, order_index)
       VALUES ($1, $2::product_media_type, $3, $4, $5)`,
      [productId, m.type, m.url, m.is_primary, m.order_index]
    );
  }
}

async function getMedia(productId) {
  const result = await query(
    `SELECT id, type, url, is_primary, order_index
     FROM product_media
     WHERE product_id = $1
     ORDER BY order_index ASC, created_at ASC`,
    [productId]
  );
  return result.rows || [];
}

async function listar(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT p.*, pm.id AS media_id, pm.type AS media_type, pm.url AS media_url,
            pm.is_primary AS media_is_primary, pm.order_index AS media_order_index
     FROM productos p
     LEFT JOIN product_media pm ON pm.product_id = p.id
     WHERE p.empresa_id = $1
     ORDER BY p.created_at DESC, pm.order_index ASC, pm.created_at ASC
     LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return attachMedia(result.rows || []);
}

async function listarActivos(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT p.*, pm.id AS media_id, pm.type AS media_type, pm.url AS media_url,
            pm.is_primary AS media_is_primary, pm.order_index AS media_order_index
     FROM productos p
     LEFT JOIN product_media pm ON pm.product_id = p.id
     WHERE p.empresa_id = $1 AND p.activo = true
     ORDER BY p.nombre ASC, pm.order_index ASC, pm.created_at ASC
     LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return attachMedia(result.rows || []);
}

async function obtener(empresaId, id) {
  const result = await query(
    `SELECT p.*, pm.id AS media_id, pm.type AS media_type, pm.url AS media_url,
            pm.is_primary AS media_is_primary, pm.order_index AS media_order_index
     FROM productos p
     LEFT JOIN product_media pm ON pm.product_id = p.id
     WHERE p.id = $1 AND p.empresa_id = $2
     ORDER BY pm.order_index ASC, pm.created_at ASC`,
    [id, empresaId]
  );
  return attachMedia(result.rows || [])[0] || null;
}

async function crear(empresaId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const media = normalizeMediaInput(data.media, data.imagen_url);
    const primary = media.find((m) => m.is_primary) || media[0];
    const result = await client.query(
      `INSERT INTO productos (empresa_id, nombre, descripcion, precio, moneda, tipo, imagen_url, tags, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9, true))
       RETURNING *`,
      [
        empresaId,
        data.nombre,
        data.descripcion || null,
        Number(data.precio) || 0,
        data.moneda || 'COP',
        data.tipo || 'producto',
        primary?.url || null,
        Array.isArray(data.tags) ? JSON.stringify(data.tags) : '[]',
        data.activo !== undefined ? !!data.activo : true,
      ]
    );
    const producto = result.rows[0] || null;
    await setMediaForProduct(client, producto.id, media);
    await client.query('COMMIT');
    return obtener(empresaId, producto.id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function actualizar(empresaId, id, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT * FROM productos WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    let nextImageUrl = data.imagen_url !== undefined ? data.imagen_url : current.rows[0].imagen_url;
    let normalizedMedia = null;
    if (data.media !== undefined) {
      normalizedMedia = normalizeMediaInput(data.media, data.imagen_url);
      const primary = normalizedMedia.find((m) => m.is_primary) || normalizedMedia[0];
      nextImageUrl = primary?.url || nextImageUrl || null;
    }
    const result = await client.query(
      `UPDATE productos
         SET nombre = COALESCE($3, nombre),
             descripcion = COALESCE($4, descripcion),
             precio = COALESCE($5, precio),
             moneda = COALESCE($6, moneda),
             tipo = COALESCE($7, tipo),
             imagen_url = COALESCE($8, imagen_url),
             tags = COALESCE($9::jsonb, tags),
             activo = COALESCE($10, activo),
             updated_at = now()
       WHERE id = $1 AND empresa_id = $2
       RETURNING *`,
      [
        id,
        empresaId,
        data.nombre || null,
        data.descripcion !== undefined ? data.descripcion : null,
        data.precio !== undefined ? Number(data.precio) : null,
        data.moneda || null,
        data.tipo || null,
        nextImageUrl !== undefined ? nextImageUrl : null,
        Array.isArray(data.tags) ? JSON.stringify(data.tags) : null,
        data.activo !== undefined ? !!data.activo : null,
      ]
    );
    if (normalizedMedia) await setMediaForProduct(client, id, normalizedMedia);
    await client.query('COMMIT');
    return obtener(empresaId, result.rows[0].id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function desactivar(empresaId, id) {
  const result = await query(
    `UPDATE productos SET activo = false, updated_at = now() WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

module.exports = { listar, listarActivos, obtener, crear, actualizar, desactivar, getMedia, normalizeMediaInput };

