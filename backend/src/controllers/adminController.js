const path = require('path');
const {
  listarEmpresas,
  obtenerEmpresaPorId,
  obtenerEmpresaPublicaPorId,
  actualizarEstadoEmpresa,
  actualizarAdminNotasInternas,
  getAiModels,
  updateAiModels,
  actualizarMarcaBlancaPorAdmin,
  actualizarBranding,
} = require('../models/empresaModel');
const { query } = require('../config/db');
const { listAllForAdmin, listByEmpresaId: listWompiTxByEmpresa } = require('../models/wompiTransactionModel');
const subModel = require('../models/wompiSubscriptionModel');
const pagoModel = require('../models/pagoModel');
const { getCodeByEmpresaId, upsertCodeByEmpresa } = require('../models/affiliateModel');

async function listarEmpresasAdmin(req, res) {
  try {
    const empresas = await listarEmpresas({ limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 });
    const estado = req.query.estado;
    const filtered = estado ? empresas.filter((e) => e.estado === estado) : empresas;
    return res.status(200).json({ ok: true, empresas: filtered });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerEmpresaDetalleAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPublicaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    const empresaId = id;
    const [contactos, usuarios, conv7, pedidos7] = await Promise.all([
      query(`SELECT COUNT(*)::int AS n FROM contactos WHERE empresa_id = $1`, [empresaId]),
      query(`SELECT COUNT(*)::int AS n FROM usuarios WHERE empresa_id = $1 AND is_active = true`, [empresaId]),
      query(
        `SELECT COUNT(*)::int AS n FROM conversaciones WHERE empresa_id = $1 AND updated_at >= now() - interval '7 days'`,
        [empresaId]
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM pedidos WHERE empresa_id = $1 AND created_at >= now() - interval '7 days'`,
        [empresaId]
      ),
    ]);

    const wompiTx = await listWompiTxByEmpresa(empresaId, 30);
    const pagosManual = await pagoModel.listarPorEmpresa(empresaId, { limit: 30, offset: 0 });
    const wompiSubscription = await subModel.getByEmpresaId(empresaId);

    return res.status(200).json({
      ok: true,
      empresa,
      metricas: {
        contactos: contactos.rows[0]?.n ?? 0,
        usuarios_activos: usuarios.rows[0]?.n ?? 0,
        conversaciones_7d: conv7.rows[0]?.n ?? 0,
        pedidos_7d: pedidos7.rows[0]?.n ?? 0,
      },
      wompi_subscription: wompiSubscription || null,
      wompi_transactions: wompiTx,
      pagos_manuales: pagosManual,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarNotasInternasAdmin(req, res) {
  try {
    const { id } = req.params;
    const { admin_notas_internas } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    await actualizarAdminNotasInternas(id, admin_notas_internas);
    const empresaOut = await obtenerEmpresaPublicaPorId(id);
    return res.status(200).json({ ok: true, empresa: empresaOut });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function metricasAdmin(req, res) {
  try {
    const empresasRes = await query(`SELECT estado, COUNT(*) AS total FROM empresas GROUP BY estado`);
    const pagosRes = await query(`SELECT COUNT(*) AS total FROM pagos WHERE estado = 'pendiente'`);
    const porEstado = {};
    empresasRes.rows.forEach((r) => { porEstado[r.estado] = Number(r.total); });
    const totalEmpresas = empresasRes.rows.reduce((s, r) => s + Number(r.total), 0);
    const pagosPendientes = Number(pagosRes.rows[0]?.total || 0);
    return res.status(200).json({ ok: true, metricas: { totalEmpresas, porEstado, pagosPendientes } });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listWompiTransactionsAdmin(req, res) {
  try {
    const rows = await listAllForAdmin(Number(req.query.limit) || 100, Number(req.query.offset) || 0);
    return res.status(200).json({ ok: true, transactions: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarEstadoEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const permitidos = ['activa', 'suspendida', 'vencida', 'demo_activa'];
    if (!estado || !permitidos.includes(estado)) return res.status(400).json({ message: 'estado debe ser uno de: ' + permitidos.join(', ') });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const actualizada = await actualizarEstadoEmpresa(id, { estado });
    return res.status(200).json({ ok: true, empresa: actualizada });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

function calcularFechaExpiracion(desde, tipoDuracion, cantidad) {
  const d = new Date(desde);
  const n = Math.max(0, Number(cantidad) || 0);
  if (tipoDuracion === 'dias') {
    d.setDate(d.getDate() + n);
    return d;
  }
  if (tipoDuracion === 'meses') {
    d.setMonth(d.getMonth() + n);
    return d;
  }
  if (tipoDuracion === 'años') {
    d.setFullYear(d.getFullYear() + n);
    return d;
  }
  d.setDate(d.getDate() + n);
  return d;
}

async function actualizarPlanEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    const { plan, tipo_duracion, cantidad, desde_hoy } = req.body;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const tipos = ['dias', 'meses', 'años'];
    if (!tipo_duracion || !tipos.includes(tipo_duracion)) return res.status(400).json({ message: 'tipo_duracion debe ser: dias, meses o años' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const base = desde_hoy ? new Date() : (empresa.fecha_expiracion ? new Date(empresa.fecha_expiracion) : empresa.demo_expires_at ? new Date(empresa.demo_expires_at) : new Date());
    const fechaExpiracion = calcularFechaExpiracion(base, tipo_duracion, cantidad);
    const actualizada = await actualizarEstadoEmpresa(id, {
      plan: (plan && String(plan).trim()) ? String(plan).trim() : empresa.plan,
      fechaExpiracion,
      estado: 'activa',
    });
    return res.status(200).json({ ok: true, empresa: actualizada, fecha_expiracion: actualizada.fecha_expiracion });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function getAiModelsEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const models = await getAiModels(id);
    return res.status(200).json({ ok: true, models: models || {} });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

function normalizeMarcaBlancaDominioInput(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || String(raw).trim() === '') return null;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!s) return null;
  if (s.length > 255) s = s.slice(0, 255);
  return s;
}

async function actualizarMarcaBlancaEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    const patch = {};
    if (body.marca_blanca !== undefined) patch.marca_blanca = !!body.marca_blanca;
    if (body.marca_blanca_dominio !== undefined) {
      patch.marca_blanca_dominio = normalizeMarcaBlancaDominioInput(body.marca_blanca_dominio);
    }
    if (body.marca_blanca_nombre_publico !== undefined) {
      patch.marca_blanca_nombre_publico =
        body.marca_blanca_nombre_publico === null || body.marca_blanca_nombre_publico === ''
          ? null
          : String(body.marca_blanca_nombre_publico).trim().slice(0, 255);
    }
    if (body.logo_url !== undefined) {
      patch.logo_url = body.logo_url === null || body.logo_url === '' ? null : String(body.logo_url).trim();
    }

    const actualizada = await actualizarMarcaBlancaPorAdmin(id, patch);
    return res.status(200).json({ ok: true, empresa: actualizada });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function subirLogoEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const file = req.file;
    if (!file?.path) return res.status(400).json({ message: 'Debes subir una imagen de logo' });
    const logoUrl = '/uploads/empresas/' + path.basename(file.path);
    await actualizarBranding(id, { logoUrl });
    const actualizada = await obtenerEmpresaPorId(id);
    return res.status(200).json({ ok: true, logo_url: logoUrl, empresa: actualizada });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al subir logo' });
  }
}

async function updateAiModelsEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const body = req.body || {};
    const models = await updateAiModels(id, body);
    return res.status(200).json({ ok: true, models: models || {} });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function getAffiliateCodeEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const affiliate = await getCodeByEmpresaId(id);
    return res.status(200).json({
      ok: true,
      affiliate: affiliate
        ? { code: affiliate.code, activo: !!affiliate.activo, updated_at: affiliate.updated_at }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function setAffiliateCodeEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    const { code, activo } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    if (!empresa.es_creador_affiliate) {
      return res.status(400).json({ message: 'Esta empresa no está habilitada como creador.' });
    }
    const out = await upsertCodeByEmpresa({ empresaId: id, codeRaw: code, activo: activo !== false });
    if (!out.ok && out.reason === 'invalid_code') {
      return res.status(400).json({ message: 'Código inválido. Usa 4-40 caracteres (A-Z, 0-9, _ o -).' });
    }
    if (!out.ok && out.reason === 'code_in_use') {
      return res.status(409).json({ message: 'Ese código ya está asignado a otra empresa.' });
    }
    return res.status(200).json({ ok: true, affiliate: out.row });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function setCreatorAffiliateEmpresaAdmin(req, res) {
  try {
    const { id } = req.params;
    const { es_creador_affiliate } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Falta id de empresa' });
    const empresa = await obtenerEmpresaPorId(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    const enabled = !!es_creador_affiliate;
    await query(`UPDATE empresas SET es_creador_affiliate = $2, updated_at = now() WHERE id = $1`, [id, enabled]);
    if (!enabled) {
      await query(`UPDATE affiliate_codes SET activo = false, updated_at = now() WHERE empresa_id = $1`, [id]);
    }
    const out = await obtenerEmpresaPorId(id);
    return res.status(200).json({
      ok: true,
      empresa: out,
      message: enabled
        ? 'Empresa habilitada como creador.'
        : 'Empresa deshabilitada como creador. El código quedó inactivo.',
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarEmpresasAdmin,
  obtenerEmpresaDetalleAdmin,
  actualizarNotasInternasAdmin,
  metricasAdmin,
  listWompiTransactionsAdmin,
  actualizarEstadoEmpresaAdmin,
  actualizarPlanEmpresaAdmin,
  actualizarMarcaBlancaEmpresaAdmin,
  subirLogoEmpresaAdmin,
  getAiModelsEmpresaAdmin,
  updateAiModelsEmpresaAdmin,
  getAffiliateCodeEmpresaAdmin,
  setAffiliateCodeEmpresaAdmin,
  setCreatorAffiliateEmpresaAdmin,
};
