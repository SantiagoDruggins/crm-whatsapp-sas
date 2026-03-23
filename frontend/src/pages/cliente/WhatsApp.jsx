import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const FB_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const GRAPH_API_VERSION = 'v19.0';

/**
 * Meta solo permite Embedded Signup (FB.login + config_id) a apps BSP/TP.
 * Por defecto false: siempre OAuth en ventana (redirect). Solo pon
 * VITE_USE_EMBEDDED_SIGNUP=true en build si eres partner y lo necesitas.
 */
const USE_EMBEDDED_SIGNUP_UI =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EMBEDDED_SIGNUP === 'true';

export default function WhatsApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({
    configurado: false,
    facebookConectado: false,
    whatsappDetectado: false,
    numeroConectado: false,
  });
  const [sendTo, setSendTo] = useState('');
  const [sendText, setSendText] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState({ webhookUrl: '', verifyToken: '' });
  const [embeddedSignupConfig, setEmbeddedSignupConfig] = useState(null);
  /** Login for Business (FACEBOOK_BUSINESS_LOGIN_CONFIG_ID): un clic con FB.login + config_id */
  const [fbBusinessConfig, setFbBusinessConfig] = useState(null);
  /** Texto opcional del backend (ej. OAuth clásico vs Embedded solo BSP) */
  const [facebookConnectHint, setFacebookConnectHint] = useState('');
  const embeddedSignupPending = useRef({ code: null, phoneNumberId: null, wabaId: null });
  const embeddedSignupCleanup = useRef(null);
  const embeddedSignupInFlight = useRef(false);
  /** Mientras Meta propague el número, reintentamos estado sin otro clic */
  const [syncingMeta, setSyncingMeta] = useState(false);
  /** Configuración manual Cloud API (token + Phone Number ID desde Meta) */
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [manualHasToken, setManualHasToken] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  /** Si false, el admin ocultó los botones de ventana Meta (FACEBOOK_SHOW_OAUTH_UI=false) */
  const [showFacebookOAuth, setShowFacebookOAuth] = useState(true);

  const loadStatus = () => {
    return api
      .get('/whatsapp/status')
      .then((r) =>
        setStatus({
          configurado: !!r.configurado,
          facebookConectado: !!r.facebookConectado,
          whatsappDetectado: !!r.whatsappDetectado,
          numeroConectado: !!r.numeroConectado,
        })
      )
      .catch(() => setStatus({ configurado: false, facebookConectado: false, whatsappDetectado: false, numeroConectado: false }));
  };

  const loadManualConfig = () =>
    api
      .get('/whatsapp/config')
      .then((r) => {
        setManualPhoneId(r.phoneNumberId || '');
        setManualHasToken(!!r.hasAccessToken);
      })
      .catch(() => {});

  useEffect(() => {
    Promise.all([
      loadStatus(),
      loadManualConfig(),
      api.get('/whatsapp/webhook-config').then((r) => setWebhookConfig({ webhookUrl: r.webhookUrl || '', verifyToken: r.verifyToken || '' })).catch(() => {}),
      api
        .get('/facebook/embedded-signup-config')
        .then((r) => {
          setFacebookConnectHint(typeof r.hint === 'string' ? r.hint : '');
          setShowFacebookOAuth(r.showFacebookOAuth !== false);
          setEmbeddedSignupConfig(
            USE_EMBEDDED_SIGNUP_UI && r.appId && r.configId ? { appId: r.appId, configId: r.configId } : null
          );
          setFbBusinessConfig(
            r.appId && r.businessLoginConfigId ? { appId: r.appId, businessLoginConfigId: r.businessLoginConfigId } : null
          );
        })
        .catch(() => {
          setEmbeddedSignupConfig(null);
          setFbBusinessConfig(null);
          setFacebookConnectHint('');
        }),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const err = params.get('error');
    if (connected === '1') {
      setError('');
      loadStatus();
      window.history.replaceState({}, '', window.location.pathname);
      // Si estamos en un popup (volvimos de Facebook), cerramos y el padre actualizará
      if (window.opener) {
        window.close();
      }
    }
    if (err) {
      const msg = decodeURIComponent(err);
      setError(msg);
      window.history.replaceState({}, '', window.location.pathname);
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'facebook_oauth_error', error: msg }, '*');
        } catch (_) {}
        window.close();
      }
    }
  }, []);

  // Un clic: si ya hay token pero aún no número/WABA completo, el backend intenta resolver en /status;
  // aquí reconsultamos solo automáticos (sin formularios).
  useEffect(() => {
    if (loading) return;
    if (!status.facebookConectado || status.configurado) {
      setSyncingMeta(false);
      return;
    }
    setSyncingMeta(true);
    let n = 0;
    const max = 45;
    const id = setInterval(() => {
      n += 1;
      loadStatus();
      if (n >= max) {
        clearInterval(id);
        setSyncingMeta(false);
      }
    }, 40000);
    return () => clearInterval(id);
  }, [loading, status.facebookConectado, status.configurado]);

  // Escuchar error enviado desde el popup
  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type === 'facebook_oauth_error' && e.data?.error) setError(e.data.error);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const tryCompleteEmbeddedSignup = () => {
    const { code, phoneNumberId, wabaId } = embeddedSignupPending.current;
    if (!code) return;
    if (embeddedSignupInFlight.current) return;
    embeddedSignupInFlight.current = true;
    if (embeddedSignupCleanup.current) {
      embeddedSignupCleanup.current();
      embeddedSignupCleanup.current = null;
    }
    api
      .post('/facebook/embedded-signup-complete', { code, phone_number_id: phoneNumberId, waba_id: wabaId })
      .then(() => {
        setError('');
        loadStatus();
        embeddedSignupPending.current = { code: null, phoneNumberId: null, wabaId: null };
      })
      .catch((e) => setError(e.message || 'Error al completar la conexión'))
      .finally(() => {
        embeddedSignupInFlight.current = false;
        setConectando(false);
      });
  };

  const conectarConFacebook = () => {
    setConectando(true);
    setError('');
    embeddedSignupPending.current = { code: null, phoneNumberId: null, wabaId: null };
    embeddedSignupInFlight.current = false;

    if (USE_EMBEDDED_SIGNUP_UI && embeddedSignupConfig?.appId && embeddedSignupConfig?.configId) {
      const runEmbeddedSignup = () => {
        const onMessage = (event) => {
          if (!event.origin || (!event.origin.endsWith('facebook.com') && !event.origin.endsWith('web.facebook.com'))) return;
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
            if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
              const phoneNumberId = data.data?.phone_number_id;
              const wabaId = data.data?.waba_id;
              if (wabaId) embeddedSignupPending.current.wabaId = wabaId;
              if (phoneNumberId) {
                embeddedSignupPending.current.phoneNumberId = phoneNumberId;
              }
              // En FINISH_ONLY_WABA puede no venir phone_number_id; el backend intentará resolverlo con waba_id.
              tryCompleteEmbeddedSignup();
            }
          } catch (_) {}
        };
        window.addEventListener('message', onMessage);
        embeddedSignupCleanup.current = () => window.removeEventListener('message', onMessage);

        const fbLoginCallback = (response) => {
          if (response.authResponse?.code) {
            embeddedSignupPending.current.code = response.authResponse.code;
            tryCompleteEmbeddedSignup();
          } else if (response.status && response.status !== 'unknown') {
            setError(response.error_message || 'No se pudo completar el inicio de sesión.');
            setConectando(false);
            if (embeddedSignupCleanup.current) {
              embeddedSignupCleanup.current();
              embeddedSignupCleanup.current = null;
            }
          }
        };

        if (typeof window.FB === 'undefined') {
          setError('SDK de Facebook no cargado. Recarga la página e inténtalo de nuevo.');
          setConectando(false);
          if (embeddedSignupCleanup.current) {
            embeddedSignupCleanup.current();
            embeddedSignupCleanup.current = null;
          }
          return;
        }
        window.FB.init({
          appId: embeddedSignupConfig.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_API_VERSION,
        });
        window.FB.login(fbLoginCallback, {
          config_id: embeddedSignupConfig.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            feature: 'whatsapp_embedded_signup',
            sessionInfoVersion: '3',
          },
        });
      };

      if (typeof window.FB !== 'undefined') {
        runEmbeddedSignup();
        return;
      }
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: embeddedSignupConfig.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_API_VERSION,
        });
        runEmbeddedSignup();
      };
      const existing = document.querySelector('script[src="' + FB_SDK_URL + '"]');
      if (existing) {
        const check = setInterval(() => {
          if (window.FB) {
            clearInterval(check);
            runEmbeddedSignup();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          if (!window.FB) {
            setError('SDK de Facebook no cargó a tiempo. Recarga la página.');
            setConectando(false);
          }
        }, 5000);
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = FB_SDK_URL;
      script.onload = () => {
        if (window.FB) runEmbeddedSignup();
        else setConectando(false);
      };
      script.onerror = () => {
        setError('No se pudo cargar el SDK de Facebook.');
        setConectando(false);
      };
      document.head.appendChild(script);
      return;
    }

    // Facebook Login for Business (un clic): FB.login + FACEBOOK_BUSINESS_LOGIN_CONFIG_ID — mismo flujo Meta migrar/crear sin BSP
    if (fbBusinessConfig?.appId && fbBusinessConfig?.businessLoginConfigId) {
      const runLoginForBusiness = () => {
        const onMessage = (event) => {
          if (!event.origin || (!event.origin.endsWith('facebook.com') && !event.origin.endsWith('web.facebook.com'))) return;
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
            if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
              const phoneNumberId = data.data?.phone_number_id;
              const wabaId = data.data?.waba_id;
              if (wabaId) embeddedSignupPending.current.wabaId = wabaId;
              if (phoneNumberId) embeddedSignupPending.current.phoneNumberId = phoneNumberId;
              tryCompleteEmbeddedSignup();
            }
          } catch (_) {}
        };
        window.addEventListener('message', onMessage);
        embeddedSignupCleanup.current = () => window.removeEventListener('message', onMessage);

        const fbLoginCallback = (response) => {
          if (response.authResponse?.code) {
            embeddedSignupPending.current.code = response.authResponse.code;
            tryCompleteEmbeddedSignup();
          } else if (response.status && response.status !== 'unknown') {
            setError(response.error_message || 'No se pudo completar el inicio de sesión.');
            setConectando(false);
            if (embeddedSignupCleanup.current) {
              embeddedSignupCleanup.current();
              embeddedSignupCleanup.current = null;
            }
          }
        };

        if (typeof window.FB === 'undefined') {
          setError('SDK de Facebook no cargado. Recarga la página e inténtalo de nuevo.');
          setConectando(false);
          if (embeddedSignupCleanup.current) {
            embeddedSignupCleanup.current();
            embeddedSignupCleanup.current = null;
          }
          return;
        }
        window.FB.init({
          appId: fbBusinessConfig.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_API_VERSION,
        });
        window.FB.login(fbLoginCallback, {
          config_id: fbBusinessConfig.businessLoginConfigId,
          response_type: 'code',
          override_default_response_type: true,
        });
      };

      if (typeof window.FB !== 'undefined') {
        runLoginForBusiness();
        return;
      }
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: fbBusinessConfig.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_API_VERSION,
        });
        runLoginForBusiness();
      };
      const existingLfb = document.querySelector('script[src="' + FB_SDK_URL + '"]');
      if (existingLfb) {
        const checkLfb = setInterval(() => {
          if (window.FB) {
            clearInterval(checkLfb);
            runLoginForBusiness();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkLfb);
          if (!window.FB) {
            setError('SDK de Facebook no cargó a tiempo. Recarga la página.');
            setConectando(false);
          }
        }, 5000);
        return;
      }
      const scriptLfb = document.createElement('script');
      scriptLfb.async = true;
      scriptLfb.defer = true;
      scriptLfb.crossOrigin = 'anonymous';
      scriptLfb.src = FB_SDK_URL;
      scriptLfb.onload = () => {
        if (window.FB) runLoginForBusiness();
        else setConectando(false);
      };
      scriptLfb.onerror = () => {
        setError('No se pudo cargar el SDK de Facebook.');
        setConectando(false);
      };
      document.head.appendChild(scriptLfb);
      return;
    }

    api
      .get('/facebook/auth-url')
      .then((r) => {
        if (!r.url) {
          setError('No se pudo obtener la URL de conexión.');
          return;
        }
        const w = window.open(
          r.url,
          'facebook_oauth',
          'width=560,height=700,scrollbars=yes,resizable=yes,left=100,top=100'
        );
        if (!w) {
          setError('Permite ventanas emergentes para este sitio o intenta de nuevo.');
          return;
        }
        const interval = setInterval(() => {
          if (w.closed) {
            clearInterval(interval);
            loadStatus();
          }
        }, 400);
      })
      .catch((e) => setError(e.message || 'Error al iniciar conexión'))
      .finally(() => setConectando(false));
  };

  const guardarConfigManual = (e) => {
    e.preventDefault();
    setError('');
    const phone = manualPhoneId.trim();
    if (!phone) {
      setError('Indica el Phone Number ID de Meta.');
      return;
    }
    const tok = manualToken.trim();
    if (!manualHasToken && !tok) {
      setError('Pega el Access Token permanente (desde Meta → WhatsApp → API).');
      return;
    }
    setManualSaving(true);
    const body = { phoneNumberId: phone };
    if (tok) body.accessToken = tok;
    api
      .patch('/whatsapp/config', body)
      .then(() => {
        setError('');
        setManualToken('');
        setManualHasToken(true);
        loadStatus();
        loadManualConfig();
      })
      .catch((err) => setError(err.message || 'No se pudo guardar'))
      .finally(() => setManualSaving(false));
  };

  const desconectar = () => {
    if (!window.confirm('¿Desconectar la cuenta de Facebook/WhatsApp? Dejarás de recibir y enviar mensajes hasta que vuelvas a conectar.')) return;
    setDesconectando(true);
    setError('');
    api
      .delete('/facebook/disconnect')
      .then(() => loadStatus().then(() => loadManualConfig()))
      .catch((e) => setError(e.message || 'Error al desconectar'))
      .finally(() => setDesconectando(false));
  };

  const enviar = (e) => {
    e.preventDefault();
    if (!sendTo.trim() || !sendText.trim()) return;
    setEnviando(true);
    setError('');
    api
      .post('/whatsapp/send', { to: sendTo.trim(), text: sendText.trim() })
      .then(() => setSendText(''))
      .catch((e) => setError(e.message))
      .finally(() => setEnviando(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

  const isBlockedError = error && /API access blocked|blocked|access.*blocked/i.test(error);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Conecta tu cuenta de WhatsApp Business</h1>
        <p className="text-[#8b9cad] text-sm">
          <strong className="text-white">Un clic:</strong> elige <em>Migrar</em> o <em>Registrar nuevo</em> y completa el asistente de Meta. Si el servidor tiene{' '}
          <code className="text-[#8b9cad]">FACEBOOK_BUSINESS_LOGIN_CONFIG_ID</code>, se abre con el SDK (mejor que ventana emergente). Si algo falla, usa la API manual
          al final de la página.
        </p>
        {facebookConnectHint && (
          <p className="text-[#8b9cad] text-xs mt-2 max-w-2xl border border-[#2d3a47] rounded-lg p-3 bg-[#151a20]">
            {facebookConnectHint}
          </p>
        )}
      </div>

      {error && (
        <div className={`mb-6 rounded-xl p-4 border ${isBlockedError ? 'bg-red-500/10 border-red-500/40' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className="text-[#f87171] font-medium">{error}</p>
          {isBlockedError && (
            <p className="text-[#8b9cad] text-sm mt-3">
              Revisa en{' '}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:underline">
                Meta for Developers
              </a>{' '}
              que la app esté en modo Producción y que el token no esté vencido. Vuelve a conectar con Facebook.
            </p>
          )}
        </div>
      )}

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Estado de la conexión</h2>

        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full ${status.facebookConectado ? 'bg-emerald-400' : 'bg-[#4a5568]'}`} />
            <span className={status.facebookConectado ? 'text-emerald-300' : 'text-[#8b9cad]'}>
              {status.facebookConectado ? 'Facebook conectado' : 'Facebook no conectado'}
            </span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full ${status.whatsappDetectado ? 'bg-emerald-400' : 'bg-[#4a5568]'}`} />
            <span className={status.whatsappDetectado ? 'text-emerald-300' : 'text-[#8b9cad]'}>
              {status.whatsappDetectado ? 'WhatsApp Business detectado' : 'WhatsApp Business no detectado'}
            </span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full ${status.numeroConectado ? 'bg-emerald-400' : 'bg-[#4a5568]'}`} />
            <span className={status.numeroConectado ? 'text-emerald-300' : 'text-[#8b9cad]'}>
              {status.numeroConectado ? 'Número conectado' : 'Número no conectado'}
            </span>
          </li>
        </ul>

        {status.configurado ? (
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={desconectar}
              disabled={desconectando}
              className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 text-sm hover:text-white hover:border-[#4a5568] disabled:opacity-50"
            >
              {desconectando ? 'Desconectando...' : 'Desconectar cuenta'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {showFacebookOAuth ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">Un clic con Meta</h3>
                  {fbBusinessConfig?.businessLoginConfigId && (
                    <span className="text-xs rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5">SDK + Login for Business</span>
                  )}
                </div>
                <p className="text-[#8b9cad] text-sm">
                  Los dos botones abren el mismo flujo de Meta: en el asistente eliges <strong className="text-[#cbd5e0]">migrar</strong> un número o{' '}
                  <strong className="text-[#cbd5e0]">crear uno nuevo</strong>. Sin <code className="text-[#8b9cad]">FACEBOOK_BUSINESS_LOGIN_CONFIG_ID</code> en el
                  servidor puede abrirse ventana emergente en lugar del SDK.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={conectarConFacebook}
                    disabled={conectando}
                    className="rounded-xl border-2 border-[#1877f2]/50 bg-[#1877f2]/10 p-5 text-left hover:border-[#1877f2] hover:bg-[#1877f2]/15 disabled:opacity-50 transition-colors"
                  >
                    <span className="text-lg font-semibold text-white block mb-1">Migrar número existente</span>
                    <span className="text-[#8b9cad] text-sm">Ya tengo WhatsApp Business / API. Un clic → Meta te guía.</span>
                  </button>
                  <button
                    type="button"
                    onClick={conectarConFacebook}
                    disabled={conectando}
                    className="rounded-xl border-2 border-[#1877f2]/50 bg-[#1877f2]/10 p-5 text-left hover:border-[#1877f2] hover:bg-[#1877f2]/15 disabled:opacity-50 transition-colors"
                  >
                    <span className="text-lg font-semibold text-white block mb-1">Registrar número nuevo</span>
                    <span className="text-[#8b9cad] text-sm">Número nuevo con Meta. Un clic → mismo asistente.</span>
                  </button>
                </div>
                {conectando && (
                  <p className="text-[#8b9cad] text-sm">
                    {fbBusinessConfig?.businessLoginConfigId ? 'Abriendo Meta (SDK)…' : 'Abriendo ventana de Meta…'}
                  </p>
                )}
                {syncingMeta && status.facebookConectado && (
                  <p className="text-[#8b9cad] text-sm border-t border-[#2d3a47] pt-3">
                    Sincronizando con Meta… Si tarda, revisa la sección manual abajo.
                  </p>
                )}
              </>
            ) : (
              <p className="text-amber-200/90 text-sm">
                OAuth desactivado en el servidor (<code>FACEBOOK_SHOW_OAUTH_UI=false</code>). Usa la API manual abajo.
              </p>
            )}
          </div>
        )}

        <details className="rounded-xl border border-[#2d3a47] bg-[#151a20] p-4">
          <summary className="text-[#8b9cad] font-medium cursor-pointer select-none">
            Otras opciones: pegar Phone Number ID y token a mano
          </summary>
          <p className="text-[#8b9cad] text-sm mt-3 mb-4">
            Meta → <strong className="text-[#cbd5e0]">WhatsApp → API de la nube</strong>: copia ID y token. Webhook en la sección técnica de abajo.
          </p>
          <form onSubmit={guardarConfigManual} className="space-y-3 max-w-lg">
            <div>
              <label className="block text-[#8b9cad] text-xs mb-1">Phone Number ID</label>
              <input
                type="text"
                value={manualPhoneId}
                onChange={(e) => setManualPhoneId(e.target.value)}
                placeholder="Ej: 123456789012345"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a] font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[#8b9cad] text-xs mb-1">
                Access Token {manualHasToken && <span className="text-emerald-500/90">(ya guardado — pega solo si quieres cambiarlo)</span>}
              </label>
              <input
                type="password"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder={manualHasToken ? 'Dejar vacío para mantener el actual' : 'Token largo permanente de Meta'}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a] font-mono text-sm"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={manualSaving}
              className="rounded-xl bg-[#2d3a47] text-white font-medium px-4 py-2 hover:bg-[#3d4f63] disabled:opacity-50"
            >
              {manualSaving ? 'Guardando...' : 'Guardar credenciales Cloud API'}
            </button>
          </form>
        </details>
      </div>

      {status.configurado && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 max-w-lg mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Enviar mensaje de prueba</h2>
          <form onSubmit={enviar} className="flex flex-col gap-3">
            <input
              type="text"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="Número (ej: 573001234567)"
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <textarea
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              placeholder="Mensaje"
              rows={3}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50 w-fit"
            >
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      <details className="bg-[#232d38] border border-[#2d3a47] rounded-xl p-4">
        <summary className="text-[#8b9cad] text-sm cursor-pointer select-none">Información técnica (webhook)</summary>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-[#8b9cad]">Callback URL: </span>
            <span className="text-[#00c896] font-mono break-all">
              {webhookConfig.webhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '')}
            </span>
          </div>
          <div>
            <span className="text-[#8b9cad]">Verify token: </span>
            <span className="text-white font-mono">{webhookConfig.verifyToken || '—'}</span>
          </div>
        </div>
      </details>
    </div>
  );
}
