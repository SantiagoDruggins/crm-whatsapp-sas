const { getCodeByEmpresaId, listMyReferrals } = require('../models/affiliateModel');

function baseUrl(req) {
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').replace(/:$/, '');
  return host ? `${proto}://${host}` : '';
}

async function getMyAffiliateData(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const code = await getCodeByEmpresaId(empresaId);
    const data = await listMyReferrals(empresaId, { limit: Number(req.query.limit) || 100 });
    const url = code?.code ? `${baseUrl(req)}/registro?ref=${encodeURIComponent(code.code)}` : '';
    return res.json({
      ok: true,
      affiliate: {
        code: code?.code || null,
        active: !!code?.activo,
        invite_url: url || null,
      },
      referrals: data.referrals || [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al obtener referidos' });
  }
}

module.exports = { getMyAffiliateData };
