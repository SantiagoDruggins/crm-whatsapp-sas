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

  const loadStatus = () => {
    api.get('/whatsapp/status').then((r) => setConfigurado(r.configurado)).catch(() => setConfigurado(false)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
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
      <p className="text-[#8b9cad] text-sm mb-4">Cada empresa configura su propia API. Ingresa el Access Token y el Phone Number ID que obtienes en Meta for Developers (WhatsApp Business).</p>
      <div className="bg-[#232d38] border border-[#2d3a47] rounded-xl p-4 mb-6 text-sm">
        <p className="text-[#8b9cad] mb-1"><strong className="text-white">Webhook (para el administrador del servidor):</strong></p>
        <p className="text-[#00c896] font-mono break-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://tu-dominio.com/api/whatsapp/webhook'}</p>
        <p className="text-[#8b9cad] mt-2">En Meta → WhatsApp → Configuration pon esta URL (si tu API está en otro dominio, usa ese dominio + <code className="text-[#00c896]">/api/whatsapp/webhook</code>) y el <strong>Verify Token</strong> del .env del servidor (<code className="text-[#00c896]">WHATSAPP_CLOUD_VERIFY_TOKEN</code>). Suscribe el campo <strong>messages</strong>.</p>
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
