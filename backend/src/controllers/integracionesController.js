const { getIntegracionesConfig, updateIntegracionesConfig } = require('../models/empresaModel');

async function getConfig(req, res) {
  try {
    const config = await getIntegracionesConfig(req.user.empresaId);
    if (!config) return res.status(404).json({ message: 'Empresa no encontrada' });
    return res.status(200).json({ ok: true, integraciones: config });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function updateConfig(req, res) {
  try {
    const { gemini_api_key, ai_provider, ai_api_key, shopify_store_url, shopify_access_token, shopify_activo, shopify_webhook_secret } = req.body;
    const config = await updateIntegracionesConfig(req.user.empresaId, {
      gemini_api_key,
      ai_provider,
      ai_api_key,
      shopify_store_url,
      shopify_access_token,
      shopify_activo,
      shopify_webhook_secret,
    });
    return res.status(200).json({ ok: true, integraciones: config });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { getConfig, updateConfig };
