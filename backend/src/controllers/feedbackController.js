const feedbackModel = require('../models/feedbackModel');

async function crearFeedback(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { tipo, mensaje } = req.body || {};
    const texto = (mensaje || '').trim();
    if (!texto) return res.status(400).json({ message: 'El mensaje es obligatorio' });
    const validTipos = ['sugerencia', 'mejora', 'bug', 'otro'];
    const tipoFinal = validTipos.includes((tipo || '').trim().toLowerCase()) ? (tipo || 'sugerencia').trim().toLowerCase() : 'sugerencia';
    const feedback = await feedbackModel.crear(empresaId, { usuarioId: userId, tipo: tipoFinal, mensaje: texto });
    return res.status(201).json({ ok: true, feedback });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al enviar' });
  }
}

async function listarFeedbackAdmin(req, res) {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const tipo = (req.query.tipo || '').trim() || undefined;
    const list = await feedbackModel.listarParaAdmin({ limit, offset, tipo });
    return res.status(200).json({ ok: true, feedback: list });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { crearFeedback, listarFeedbackAdmin };
