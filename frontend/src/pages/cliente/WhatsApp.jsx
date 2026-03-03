import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function WhatsApp() {
  const [configurado, setConfigurado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendText, setSendText] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [configForm, setConfigForm] = useState({ accessToken: '', phoneNumberId: '' });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState({ webhookUrl: '', verifyToken: '' });
  const [mostrarGuia, setMostrarGuia] = useState(false);

  const loadStatus = () => {
    api.get('/whatsapp/status').then((r) => setConfigurado(r.configurado)).catch(() => setConfigurado(false));
  };

  const loadWebhookConfig = () => {
    api.get('/whatsapp/webhook-config').then((r) => setWebhookConfig({ webhookUrl: r.webhookUrl || '', verifyToken: r.verifyToken || '' })).catch(() => setWebhookConfig({ webhookUrl: '', verifyToken: '' }));
  };

  useEffect(() => {
    Promise.all([
      api.get('/whatsapp/status').then((r) => setConfigurado(r.configurado)).catch(() => setConfigurado(false)),
      api.get('/whatsapp/webhook-config').then((r) => setWebhookConfig({ webhookUrl: r.webhookUrl || '', verifyToken: r.verifyToken || '' })).catch(() => setWebhookConfig({ webhookUrl: '', verifyToken: '' })),
    ]).finally(() => setLoading(false));
  }, []);

  const guardarConfig = (e) => {
    e.preventDefault();
    if (!configForm.accessToken.trim() || !configForm.phoneNumberId.trim()) {
      setError('Access Token y Phone Number ID son obligatorios.');
      return;
    }
    setGuardandoConfig(true);
    setError('');
    api
      .patch('/whatsapp/config', { accessToken: configForm.accessToken.trim(), phoneNumberId: configForm.phoneNumberId.trim() })
      .then((r) => {
        setConfigurado(r.configurado ?? true);
        setConfigForm({ accessToken: '', phoneNumberId: '' });
        setMostrarConfig(false);
        loadStatus();
      })
      .catch((e) => setError(e.message))
      .finally(() => setGuardandoConfig(false));
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

  const estadoConexion = configurado
    ? {
        label: 'Conectado',
        badgeBg: 'bg-emerald-500/15',
        dotBg: 'bg-emerald-400',
        textColor: 'text-emerald-300',
      }
    : error
    ? {
        label: 'Error de conexión',
        badgeBg: 'bg-red-500/15',
        dotBg: 'bg-red-500',
        textColor: 'text-red-300',
      }
    : {
        label: 'Pendiente configuración',
        badgeBg: 'bg-yellow-500/15',
        dotBg: 'bg-yellow-400',
        textColor: 'text-yellow-200',
      };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">WhatsApp Cloud API</h1>
          <p className="text-[#8b9cad] text-sm">
            Conecta tu número de WhatsApp Business. Necesitas dos pasos: guardar aquí tu Access Token y Phone Number ID,
            y configurar el webhook en tu app de Meta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarGuia(true)}
          className="inline-flex items-center justify-center rounded-xl border border-[#00c896] text-[#00c896] px-4 py-2 text-sm font-semibold hover:bg-[#00c896]/10"
        >
          Ver guía paso a paso
        </button>
      </div>

      {error && (
        <div className={`mb-6 rounded-xl p-4 border ${isBlockedError ? 'bg-red-500/10 border-red-500/40' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className="text-[#f87171] font-medium">{error}</p>
          {isBlockedError && (
            <p className="text-[#8b9cad] text-sm mt-3">
              Este mensaje lo devuelve Meta cuando el acceso a la API está bloqueado. Revisa en{' '}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:underline">Meta for Developers</a>:
              que la app esté en modo Producción si ya la aprobaron, que el token no esté vencido o revocado, y que no haya restricciones en la cuenta de negocio o el número. Genera un nuevo Access Token (WhatsApp → API Setup) y actualiza las credenciales aquí.
            </p>
          )}
        </div>
      )}

      <div className="bg-[#232d38] border border-[#00c896]/50 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold text-lg mb-1">Conecta tu número de WhatsApp (requerido)</h3>
        <p className="text-[#8b9cad] text-sm mb-4">Para recibir y enviar mensajes, en <strong>Meta for Developers</strong> → tu app → <strong>WhatsApp</strong> → <strong>Configuration</strong> debes poner exactamente estos datos. Luego <strong>Verify and Save</strong> y suscribe el campo <strong>messages</strong>.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8b9cad] uppercase tracking-wider mb-1">Callback URL</label>
            <div className="bg-[#0f1419] border border-[#2d3a47] rounded-lg px-4 py-3">
              <span className="text-[#00c896] font-mono text-sm break-all select-all">
                {webhookConfig.webhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '')}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8b9cad] uppercase tracking-wider mb-1">Contraseña / Verify token</label>
            <div className="bg-[#0f1419] border border-[#2d3a47] rounded-lg px-4 py-3">
              <span className="text-white font-mono text-sm break-all select-all">
                {webhookConfig.verifyToken || '— (pide al administrador de la plataforma)'}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[#8b9cad] text-xs mt-4">Sin configurar el webhook en Meta con esta URL y este verify token, no recibirás mensajes en el CRM.</p>
      </div>

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-white mb-2">Estado de la conexión</h2>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#8b9cad]">
            WhatsApp Cloud API:
            <span
              className={`ml-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${estadoConexion.badgeBg} ${estadoConexion.textColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${estadoConexion.dotBg}`} />
              {estadoConexion.label}
            </span>
          </p>
        </div>

        {(!configurado || mostrarConfig) && (
          <form onSubmit={guardarConfig} className="space-y-4 mt-4 pt-4 border-t border-[#2d3a47]">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Access Token (Meta)</label>
              <input type="password" value={configForm.accessToken} onChange={(e) => setConfigForm((f) => ({ ...f, accessToken: e.target.value }))} placeholder="EAAxxxxx..." className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Phone Number ID</label>
              <input type="text" value={configForm.phoneNumberId} onChange={(e) => setConfigForm((f) => ({ ...f, phoneNumberId: e.target.value }))} placeholder="ID numérico del número de WhatsApp Business" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={guardandoConfig} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
                {guardandoConfig ? 'Guardando...' : configurado ? 'Actualizar credenciales' : 'Guardar credenciales'}
              </button>
              {configurado && (
                <button type="button" onClick={() => { setMostrarConfig(false); setError(''); }} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {configurado && !mostrarConfig && (
          <button type="button" onClick={() => setMostrarConfig(true)} className="text-sm text-[#00c896] hover:text-[#00e0a8]">
            Cambiar credenciales
          </button>
        )}
      </div>

      {configurado && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Enviar mensaje</h2>
          <form onSubmit={enviar} className="flex flex-col gap-3">
            <input type="text" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="Número (ej: 573001234567)" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
            <textarea value={sendText} onChange={(e) => setSendText(e.target.value)} placeholder="Mensaje" rows={3} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
            <button type="submit" disabled={enviando} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50 w-fit">
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      {mostrarGuia && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setMostrarGuia(false)}
        >
          <div
            className="max-w-lg w-full bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Guía rápida para conectar WhatsApp</h2>
                <p className="text-[#8b9cad] text-sm mt-1">
                  No necesitas ser técnico. Sigue estos pasos una sola vez para que el bot pueda responder a tus clientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarGuia(false)}
                className="text-[#8b9cad] hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-[#8b9cad] text-sm">
              <li>
                Entra a{' '}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00c896] hover:underline"
                >
                  Meta for Developers
                </a>{' '}
                e inicia sesión con la cuenta que administra tu WhatsApp Business.
              </li>
              <li>Abre tu app, ve a <strong>WhatsApp</strong> y luego a <strong>Configuration / API Setup</strong>.</li>
              <li>
                En el campo <strong>Callback URL</strong> copia exactamente la URL que ves en este módulo del CRM y pégala en
                Meta.
              </li>
              <li>
                En el campo <strong>Verify Token</strong> copia el valor que aparece aquí y pégalo también en Meta. Después
                pulsa <strong>Verify and Save</strong>.
              </li>
              <li>
                En la sección de <strong>Webhook</strong> de WhatsApp en Meta, asegúrate de suscribir al menos el campo{' '}
                <strong>messages</strong>.
              </li>
            </ol>
            <p className="text-[#fbbf24] text-xs mt-4">
              Importante: sin esta configuración en Meta, el bot no podrá recibir ni responder mensajes de tus clientes.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarGuia(false)}
                className="rounded-xl border border-[#2d3a47] px-4 py-2 text-sm text-[#8b9cad] hover:text-white"
              >
                Cerrar
              </button>
              <a
                href="https://developers.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#00c896] text-[#0f1419] text-sm font-semibold px-4 py-2 hover:bg-[#00e0a8]"
              >
                Abrir Meta Developers
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
