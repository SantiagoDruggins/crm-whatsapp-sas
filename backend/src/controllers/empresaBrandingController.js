const path = require('path');
const { actualizarBranding } = require('../models/empresaModel');

async function subirLogoEmpresa(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const file = req.file;
    if (!file?.path) return res.status(400).json({ message: 'Debes subir una imagen de logo' });
    const logoUrl = '/uploads/empresas/' + path.basename(file.path);
    const empresa = await actualizarBranding(empresaId, { logoUrl });
    return res.status(200).json({ ok: true, logo_url: logoUrl, empresa });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al subir logo' });
  }
}

module.exports = { subirLogoEmpresa };

