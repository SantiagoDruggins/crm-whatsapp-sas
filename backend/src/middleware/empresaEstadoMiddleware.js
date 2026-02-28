function empresaEstadoMiddleware(req, res, next) {
  if (req.user && req.user.rol === 'super_admin') return next();
  const empresa = req.empresa;
  if (!empresa || !empresa.id) return res.status(403).json({ message: 'Empresa no asociada' });
  const ahora = new Date();
  if (empresa.estado === 'demo_activa') {
    if (empresa.demo_expires_at && new Date(empresa.demo_expires_at) < ahora)
      return res.status(402).json({ message: 'Demo vencida.', code: 'DEMO_VENCIDA' });
    return next();
  }
  if (empresa.estado === 'activa') {
    if (empresa.fecha_expiracion && new Date(empresa.fecha_expiracion) < ahora)
      return res.status(402).json({ message: 'Suscripción vencida.', code: 'SUSCRIPCION_VENCIDA' });
    return next();
  }
  if (empresa.estado === 'pago_en_revision') return res.status(402).json({ message: 'Pago en revisión.', code: 'PAGO_EN_REVISION' });
  if (empresa.estado === 'suspendida') return res.status(403).json({ message: 'Cuenta suspendida.', code: 'CUENTA_SUSPENDIDA' });
  if (empresa.estado === 'vencida') return res.status(402).json({ message: 'Suscripción vencida.', code: 'SUSCRIPCION_VENCIDA' });
  next();
}

module.exports = empresaEstadoMiddleware;
