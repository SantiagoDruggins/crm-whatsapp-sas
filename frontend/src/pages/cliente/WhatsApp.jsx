import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const FB_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const GRAPH_API_VERSION = 'v19.0';

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
  const embeddedSignupPending = useRef({ code: null, phoneNumberId: null, wabaId: null });
  const embeddedSignupCleanup = useRef(null);

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

  useEffect(() => {
    Promise.all([
      loadStatus(),
      api.get('/whatsapp/webhook-config').then((r) => setWebhookConfig({ webhookUrl: r.webhookUrl || '', verifyToken: r.verifyToken || '' })).catch(() => {}),
      api.get('/facebook/embedded-signup-config').then((r) => setEmbeddedSignupConfig(r.appId && r.configId ? { appId: r.appId, configId: r.configId } : null)).catch(() => setEmbeddedSignupConfig(null)),
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
    embeddedSignupPending.current = { code: null, phoneNumberId: null, wabaId: null };
    if (embeddedSignupCleanup.current) {
      embeddedSignupCleanup.current();
      embeddedSignupCleanup.current = null;
    }
    api
      .post('/facebook/embedded-signup-complete', { code, phone_number_id: phoneNumberId, waba_id: wabaId })
      .then(() => {
        setError('');
        loadStatus();
      })
      .catch((e) => setError(e.message || 'Error al completar la conexión'))
      .finally(() => setConectando(false));
  };

  const conectarConFacebook = () => {
    setConectando(true);
    setError('');
    embeddedSignupPending.current = { code: null, phoneNumberId: null, wabaId: null };

    if (embeddedSignupConfig?.appId && embeddedSignupConfig?.configId) {
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
          extras: { setup: {} },
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

  const desconectar = () => {
    if (!window.confirm('¿Desconectar la cuenta de Facebook/WhatsApp? Dejarás de recibir y enviar mensajes hasta que vuelvas a conectar.')) return;
    setDesconectando(true);
    setError('');
    api
      .delete('/facebook/disconnect')
      .then(() => loadStatus())
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
          Conecta tu cuenta de Facebook para administrar tu WhatsApp Business directamente desde el CRM. Solo toma unos segundos.
        </p>
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

        {!status.configurado ? (
          <div className="space-y-4">
            <p className="text-[#8b9cad] text-sm mb-4">
              Elige según tu caso: si ya tienes un número con la API de WhatsApp o si vas a registrar uno nuevo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={conectarConFacebook}
                disabled={conectando}
                className="rounded-xl border-2 border-[#2d3a47] bg-[#1a2129] p-4 text-left hover:border-[#1877f2] hover:bg-[#1e2936] disabled:opacity-50 transition-colors"
              >
                <span className="text-lg font-semibold text-white block mb-1">Migrar número existente</span>
                <span className="text-[#8b9cad] text-sm">
                  Ya tengo un número de WhatsApp Business (API o proveedor). Conecto mi cuenta para usarlo en este CRM.
                </span>
              </button>
              <button
                type="button"
                onClick={conectarConFacebook}
                disabled={conectando}
                className="rounded-xl border-2 border-[#2d3a47] bg-[#1a2129] p-4 text-left hover:border-[#1877f2] hover:bg-[#1e2936] disabled:opacity-50 transition-colors"
              >
                <span className="text-lg font-semibold text-white block mb-1">Registrar número nuevo</span>
                <span className="text-[#8b9cad] text-sm">
                  No tengo número en la API. Quiero registrar uno nuevo (virgen) desde cero con Meta.
                </span>
              </button>
            </div>
            {conectando && (
              <p className="text-[#8b9cad] text-sm">Abriendo ventana de Facebook…</p>
            )}
            <p className="text-[#8b9cad] text-xs mt-2">
              En ambos casos se abre la ventana de Meta. Allí podrás vincular tu número existente o crear uno nuevo. No compartimos tu información con terceros.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={desconectar}
              disabled={desconectando}
              className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 text-sm hover:text-white hover:border-[#4a5568] disabled:opacity-50"
            >
              {desconectando ? 'Desconectando...' : 'Desconectar cuenta'}
            </button>
          </div>
        )}
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
