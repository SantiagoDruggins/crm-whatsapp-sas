const axios = require('axios');
const config = require('../config/env');
const { signToken, verifyToken } = require('../utils/jwt');
const { updateWhatsappConfig } = require('../models/empresaModel');

const FB_GRAPH = 'https://graph.facebook.com/v19.0';

function getRedirectUri() {
  const base = (config.facebook && config.facebook.redirectUri) ? config.facebook.redirectUri : '';
  if (!base) return null;
  return base;
}

function getAppCredentials() {
  const appId = (config.facebook && config.facebook.appId) ? config.facebook.appId.trim() : '';
  const appSecret = (config.facebook && config.facebook.appSecret) ? config.facebook.appSecret.trim() : '';
  return { appId, appSecret };
}

/**
 * GET /api/facebook/auth-url
 * Devuelve la URL de OAuth de Facebook para que el frontend redirija al usuario.
 * Requiere auth; el state lleva empresaId firmado.
 */
async function getAuthUrl(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const { appId, appSecret } = getAppCredentials();
    const redirectUri = getRedirectUri();
    if (!appId || !appSecret || !redirectUri) {
      return res.status(503).json({
        message: 'Conexión con Facebook no configurada. El administrador debe definir FACEBOOK_APP_ID y FACEBOOK_APP_SECRET.',
      });
    }

    const state = signToken(
      { empresaId, purpose: 'fb_oauth' },
      { expiresIn: '5m' }
    );

    // Solo public_profile evita "Invalid Scopes"; con el token luego consultamos
    // Graph API (businesses -> WABA -> phone_numbers). Si falla, valorar Embedded Signup.
    const scope = 'public_profile';
    const dialogBase = 'https://www.facebook.com/v19.0/dialog/oauth';
    const url = `${dialogBase}?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(state)}`;

    return res.status(200).json({ url });
  } catch (err) {
    console.error('getAuthUrl', err);
    return res.status(500).json({ message: err.message || 'Error al generar URL' });
  }
}

/**
 * GET /api/facebook/callback
 * Facebook redirige aquí con ?code=...&state=...
 * Sin auth; el state JWT contiene empresaId.
 */
async function callback(req, res) {
  const redirectUri = getRedirectUri();
  const frontendBase = (config.publicBaseUrl || redirectUri || '').replace(/\/api\/facebook\/callback\/?$/, '') || '';
  const successRedirect = frontendBase ? `${frontendBase}/dashboard/whatsapp?connected=1` : '/dashboard/whatsapp?connected=1';
  const errorRedirect = frontendBase ? `${frontendBase}/dashboard/whatsapp?error=` : '/dashboard/whatsapp?error=';

  try {
    const { code, state, error: fbError } = req.query;
    if (fbError) {
      const msg = typeof fbError === 'string' ? fbError : 'Acceso denegado';
      return res.redirect(errorRedirect + encodeURIComponent(msg));
    }
    if (!code || !state) {
      return res.redirect(errorRedirect + encodeURIComponent('Faltan code o state'));
    }

    let payload;
    try {
      payload = verifyToken(state);
    } catch {
      return res.redirect(errorRedirect + encodeURIComponent('Sesión de conexión expirada. Vuelve a intentar.'));
    }
    if (payload.purpose !== 'fb_oauth' || !payload.empresaId) {
      return res.redirect(errorRedirect + encodeURIComponent('Estado inválido'));
    }

    const { appId, appSecret } = getAppCredentials();
    if (!appId || !appSecret || !redirectUri) {
      return res.redirect(errorRedirect + encodeURIComponent('Configuración de Facebook incompleta'));
    }

    const tokenRes = await axios.get(`${FB_GRAPH}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });
    let accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.redirect(errorRedirect + encodeURIComponent('No se pudo obtener el token'));
    }

    const longLivedRes = await axios.get(`${FB_GRAPH}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: accessToken,
      },
    });
    accessToken = longLivedRes.data?.access_token || accessToken;

    const meRes = await axios.get(`${FB_GRAPH}/me`, {
      params: {
        fields: 'businesses{owned_whatsapp_business_accounts{id,name,phone_numbers}}',
        access_token: accessToken,
      },
    });
    const businesses = meRes.data?.businesses?.data;
    let phoneNumberId = null;
    if (Array.isArray(businesses) && businesses.length > 0) {
      for (const biz of businesses) {
        const wabas = biz.owned_whatsapp_business_accounts?.data;
        if (Array.isArray(wabas) && wabas.length > 0) {
          const wabaId = wabas[0].id;
          const phoneRes = await axios.get(`${FB_GRAPH}/${wabaId}/phone_numbers`, {
            params: { access_token: accessToken },
          });
          const phones = phoneRes.data?.data;
          if (Array.isArray(phones) && phones.length > 0) {
            phoneNumberId = phones[0].id;
            break;
          }
        }
      }
    }

    if (!phoneNumberId) {
      return res.redirect(errorRedirect + encodeURIComponent('No se encontró ningún número de WhatsApp Business. Vincula un número en Meta Business Suite.'));
    }

    await updateWhatsappConfig(payload.empresaId, {
      accessToken,
      phoneNumberId: String(phoneNumberId),
    });

    return res.redirect(successRedirect);
  } catch (err) {
    console.error('facebook callback', err);
    const msg = err.response?.data?.error?.message || err.message || 'Error al conectar';
    return res.redirect(errorRedirect + encodeURIComponent(String(msg)));
  }
}

/**
 * POST /api/facebook/disconnect o DELETE
 * Limpia token y phone_number_id de la empresa.
 */
async function disconnect(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    await updateWhatsappConfig(empresaId, {
      accessToken: '',
      phoneNumberId: '',
    });
    return res.status(200).json({ ok: true, configurado: false, message: 'Cuenta desconectada' });
  } catch (err) {
    console.error('facebook disconnect', err);
    return res.status(500).json({ message: err.message || 'Error al desconectar' });
  }
}

/**
 * GET /api/facebook/embedded-signup-config
 * Devuelve appId y configId para que el frontend inicie el SDK y lance Embedded Signup.
 */
async function getEmbeddedSignupConfig(req, res) {
  try {
    const appId = (config.facebook && config.facebook.appId) ? config.facebook.appId.trim() : '';
    const configId = (config.facebook && config.facebook.embeddedSignupConfigId) ? config.facebook.embeddedSignupConfigId.trim() : '';
    if (!appId || !configId) {
      return res.status(404).json({
        message: 'Embedded Signup no configurado. Definir FACEBOOK_APP_ID y FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID.',
        useClassicOAuth: true,
      });
    }
    return res.status(200).json({ appId, configId });
  } catch (err) {
    console.error('getEmbeddedSignupConfig', err);
    return res.status(500).json({ message: err.message || 'Error al obtener configuración' });
  }
}

/**
 * POST /api/facebook/embedded-signup-complete
 * Body: { code, phone_number_id }
 * Intercambia el code de Embedded Signup por access_token y guarda token + phone_number_id en la empresa.
 * redirect_uri vacío según documentación cuando el flujo se lanza con FB.login (Embedded Signup).
 */
async function embeddedSignupComplete(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const { code, phone_number_id: phoneNumberId } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Falta el código de autorización (code)' });
    }

    const { appId, appSecret } = getAppCredentials();
    if (!appId || !appSecret) {
      return res.status(503).json({
        message: 'Conexión con Facebook no configurada. Definir FACEBOOK_APP_ID y FACEBOOK_APP_SECRET.',
      });
    }

    // Embedded Signup con SDK: redirect_uri suele ser vacío o el origen de la página
    const tokenRes = await axios.get(`${FB_GRAPH}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code.trim(),
        redirect_uri: '',
      },
    });
    let accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({
        message: tokenRes.data?.error_message || 'No se pudo canjear el código por token. El código puede haber expirado (30 s).',
      });
    }

    const longLivedRes = await axios.get(`${FB_GRAPH}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: accessToken,
      },
    });
    accessToken = longLivedRes.data?.access_token || accessToken;

    let finalPhoneNumberId = phoneNumberId && String(phoneNumberId).trim();
    if (!finalPhoneNumberId) {
      const meRes = await axios.get(`${FB_GRAPH}/me`, {
        params: {
          fields: 'businesses{owned_whatsapp_business_accounts{id,name,phone_numbers}}',
          access_token: accessToken,
        },
      });
      const businesses = meRes.data?.businesses?.data;
      if (Array.isArray(businesses) && businesses.length > 0) {
        for (const biz of businesses) {
          const wabas = biz.owned_whatsapp_business_accounts?.data;
          if (Array.isArray(wabas) && wabas.length > 0) {
            const wabaId = wabas[0].id;
            const phoneRes = await axios.get(`${FB_GRAPH}/${wabaId}/phone_numbers`, {
              params: { access_token: accessToken },
            });
            const phones = phoneRes.data?.data;
            if (Array.isArray(phones) && phones.length > 0) {
              finalPhoneNumberId = String(phones[0].id);
              break;
            }
          }
        }
      }
    }

    if (!finalPhoneNumberId) {
      return res.status(400).json({
        message: 'No se encontró ningún número de WhatsApp Business. Completa el flujo de registro insertado con un número.',
      });
    }

    await updateWhatsappConfig(empresaId, {
      accessToken,
      phoneNumberId: finalPhoneNumberId,
    });

    return res.status(200).json({ ok: true, configurado: true, message: 'WhatsApp conectado correctamente' });
  } catch (err) {
    console.error('embeddedSignupComplete', err);
    const msg = err.response?.data?.error?.message || err.message || 'Error al completar la conexión';
    return res.status(500).json({ message: String(msg) });
  }
}

module.exports = {
  getAuthUrl,
  callback,
  disconnect,
  getEmbeddedSignupConfig,
  embeddedSignupComplete,
};
