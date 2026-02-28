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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">WhatsApp Cloud API</h1>
      <p className="text-[#8b9cad] text-sm mb-4">Conecta tu número de WhatsApp Business. Necesitas dos pasos: guardar aquí tu Access Token y Phone Number ID, y configurar el webhook en tu app de Meta.</p>

      <div className="bg-[#232d38] border border-[#00c896]/50 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold text-lg mb-1">Configuración del webhook en Meta (obligatorio)</h3>
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

      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-white mb-2">Estado de la conexión</h2>
        <p className="text-[#8b9cad] mb-4">
          WhatsApp Cloud API: <span className={configurado ? 'text-[#00c896] font-medium' : 'text-[#8b9cad]'}>{configurado ? 'Configurado' : 'No configurado'}</span>
        </p>

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
    </div>
  );
}
