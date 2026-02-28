const appointmentModel = require('../models/appointmentModel');
const contactoModel = require('../models/contactoModel');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function listarAppointments(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const opts = {
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
    };
    const appointments = await appointmentModel.listarPorEmpresa(empresaId, opts);
    return res.status(200).json({ ok: true, appointments });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerAppointment(req, res) {
  try {
    const appointment = await appointmentModel.getById(req.user.empresaId, req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json({ ok: true, appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearAppointment(req, res) {
  try {
    const { contact_id, date, time, status, notes } = req.body;
    if (!contact_id || !date) return res.status(400).json({ message: 'contact_id y date son requeridos' });
    const contacto = await contactoModel.getById(req.user.empresaId, contact_id);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    const appointment = await appointmentModel.crear(req.user.empresaId, { contact_id, date, time, status, notes });
    return res.status(201).json({ ok: true, appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarAppointment(req, res) {
  try {
    const appointment = await appointmentModel.actualizar(req.user.empresaId, req.params.id, req.body);
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json({ ok: true, appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarAppointment(req, res) {
  try {
    const deleted = await appointmentModel.eliminar(req.user.empresaId, req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json({ ok: true, message: 'Cita eliminada' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listarAppointmentsContacto(req, res) {
  try {
    const contacto = await contactoModel.getById(req.user.empresaId, req.params.id);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    const appointments = await appointmentModel.listarPorContacto(req.user.empresaId, req.params.id, { desde: req.query.desde || null });
    return res.status(200).json({ ok: true, appointments });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarAppointments,
  obtenerAppointment,
  crearAppointment,
  actualizarAppointment,
  eliminarAppointment,
  listarAppointmentsContacto,
};
