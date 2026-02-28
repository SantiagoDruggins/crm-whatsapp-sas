const { listarEmpresas, obtenerEmpresaPorId, actualizarEstadoEmpresa } = require('../models/empresaModel');
const { query } = require('../config/db');

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

module.exports = { listarEmpresasAdmin, metricasAdmin, actualizarEstadoEmpresaAdmin, actualizarPlanEmpresaAdmin };
