import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Integraciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dropi_token: '',
    dropi_activo: false,
    dropi_api_base_url: '',
    mastershop_token: '',
    mastershop_activo: false,
    gemini_api_key: '',
    ai_provider: 'gemini',
    ai_api_key: '',
  });
  const [usarApiPropia, setUsarApiPropia] = useState(false);

  useEffect(() => {
    api
      .get('/integraciones')
      .then((r) => {
        const i = r.integraciones || {};
        const aiKeyMask = i.ai_configurado ? '********' : (i.ai_api_key || '');
        setForm({
          dropi_token: i.dropi_token || '',
          dropi_activo: !!i.dropi_activo,
          dropi_api_base_url: i.dropi_api_base_url || '',
          mastershop_token: i.mastershop_token || '',
          mastershop_activo: !!i.mastershop_activo,
          gemini_api_key: i.gemini_configurado ? '********' : (i.gemini_api_key || ''),
          ai_provider: i.ai_provider || 'gemini',
          ai_api_key: aiKeyMask,
        });
        setUsarApiPropia(!!i.ai_configurado);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form };
    if (payload.gemini_api_key === '********') delete payload.gemini_api_key;
    if (!usarApiPropia) {
      // Vaciar API key para que la empresa use la clave gestionada por el sistema
      payload.ai_api_key = '';
    } else if (payload.ai_api_key === '********') {
      delete payload.ai_api_key;
    }
    api
      .patch('/integraciones', payload)
      .then((r) => {
        setForm({
          dropi_token: r.integraciones?.dropi_token ?? form.dropi_token,
          dropi_activo: !!r.integraciones?.dropi_activo,
          dropi_api_base_url: r.integraciones?.dropi_api_base_url ?? form.dropi_api_base_url,
          mastershop_token: r.integraciones?.mastershop_token ?? form.mastershop_token,
          mastershop_activo: !!r.integraciones?.mastershop_activo,
          gemini_api_key: r.integraciones?.gemini_configurado ? '********' : (r.integraciones?.gemini_api_key ?? form.gemini_api_key),
          ai_provider: r.integraciones?.ai_provider ?? form.ai_provider,
          ai_api_key: r.integraciones?.ai_configurado ? '********' : (r.integraciones?.ai_api_key ?? form.ai_api_key),
        });
        setUsarApiPropia(!!r.integraciones?.ai_configurado);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const dropiWebhookUrl = `${origin}/api/integraciones-webhook/dropi`;
  const mastershopWebhookUrl = `${origin}/api/integraciones-webhook/mastershop`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Integraciones (Dropshipping)</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Conecta Dropi o Mastershop para que los pedidos se suban automáticamente. Obtén el token en tu panel de Dropi o Mastershop.
      </p>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Dropi</h2>
          <p className="text-[#8b9cad] text-sm mb-4">
            Gestiona pedidos con Dropi usando solo tu token. Obtén el token en la configuración de tu tienda en Dropi y, si Dropi te da una URL de API, pégala abajo.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">URL base de la API de Dropi (opcional)</label>
              <input
                type="url"
                value={form.dropi_api_base_url}
                onChange={(e) => setForm((f) => ({ ...f, dropi_api_base_url: e.target.value.trim() }))}
                placeholder="https://api.dropi.co o la URL que te indique Dropi"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <p className="text-xs text-[#6b7a8a] mt-1">Si Dropi te dio una URL de API en su panel, pégala aquí. Si no, el administrador del servidor puede configurar DROPI_API_BASE_URL.</p>
            </div>
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">Token de integración</label>
              <input
                type="password"
                value={form.dropi_token}
                onChange={(e) => setForm((f) => ({ ...f, dropi_token: e.target.value }))}
                placeholder="Token Dropi"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dropi_activo}
                onChange={(e) => setForm((f) => ({ ...f, dropi_activo: e.target.checked }))}
                className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
              />
              <span className="text-sm text-[#8b9cad]">Subir nuevos pedidos automáticamente a Dropi</span>
            </label>
            <div className="mt-3">
              <p className="text-xs text-[#8b9cad] mb-1">Webhook de pedidos (pégalo en Dropi):</p>
              <div className="bg-[#0f1419] border border-[#2d3a47] rounded-lg px-3 py-2">
                <span className="text-[#00c896] text-xs font-mono break-all select-all">
                  {dropiWebhookUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Mastershop</h2>
          <p className="text-[#8b9cad] text-sm mb-4">
            En Mastershop (app.mastershop.com) ve a Configuraciones → Integraciones y obtén tu token o API key.
          </p>
          <div className="space-y-3">
            <label className="block text-sm text-[#8b9cad]">Token / API key</label>
            <input
              type="password"
              value={form.mastershop_token}
              onChange={(e) => setForm((f) => ({ ...f, mastershop_token: e.target.value }))}
              placeholder="Token Mastershop"
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mastershop_activo}
                onChange={(e) => setForm((f) => ({ ...f, mastershop_activo: e.target.checked }))}
                className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
              />
              <span className="text-sm text-[#8b9cad]">Subir nuevos pedidos automáticamente a Mastershop</span>
            </label>
            <div className="mt-3">
              <p className="text-xs text-[#8b9cad] mb-1">Webhook de pedidos (pégalo en Mastershop):</p>
              <div className="bg-[#0f1419] border border-[#2d3a47] rounded-lg px-3 py-2">
                <span className="text-[#00c896] text-xs font-mono break-all select-all">
                  {mastershopWebhookUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">IA (proveedor universal)</h2>
          <p className="text-[#8b9cad] text-sm mb-4">
            Elige el proveedor de IA para tu bot. <span className="text-[#00c896] font-medium">Por defecto nosotros gestionamos la API de IA de pago</span>, no necesitas crear cuentas ni copiar tokens.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-[#00c896]/40 bg-[#02241d] px-3 py-2 text-xs text-[#c4f5e5]">
              <span className="font-semibold">Modo sencillo:</span> si dejas vacía la API key, el sistema usa la IA incluida en tu plan.
              Activa la opción avanzada solo si quieres conectar tu propia cuenta de IA.
            </div>
            <label className="block text-sm text-[#8b9cad]">Proveedor</label>
            <select
              value={form.ai_provider}
              onChange={(e) => setForm((f) => ({ ...f, ai_provider: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="grok">Grok (xAI)</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8b9cad] mt-1">
              <input
                type="checkbox"
                checked={usarApiPropia}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUsarApiPropia(checked);
                  if (!checked) {
                    setForm((f) => ({ ...f, ai_api_key: '' }));
                  }
                }}
                className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
              />
              <span>Quiero usar mi propia API key (avanzado)</span>
            </label>
            <label className="block text-sm text-[#8b9cad] mt-1">API key (opcional)</label>
            <input
              type="password"
              value={form.ai_api_key}
              onChange={(e) => setForm((f) => ({ ...f, ai_api_key: e.target.value }))}
              placeholder={
                !usarApiPropia
                  ? 'No necesitas configurarla: usamos la IA incluida en tu plan. Activa la opción avanzada sólo si quieres usar tu propia cuenta.'
                  : form.ai_api_key === '********'
                  ? '••••••••'
                  : `Pega tu API key de ${
                      form.ai_provider === 'gemini'
                        ? 'Google AI Studio'
                        : form.ai_provider === 'openai'
                        ? 'OpenAI'
                        : form.ai_provider === 'anthropic'
                        ? 'Anthropic'
                        : 'xAI (console.x.ai)'
                    } (opcional)`
              }
              disabled={!usarApiPropia}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <button type="submit" disabled={saving} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-6 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
