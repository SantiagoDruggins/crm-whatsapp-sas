import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Integraciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shopify_store_url: '',
    shopify_access_token: '',
    shopify_activo: false,
    shopify_webhook_secret: '',
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
          shopify_store_url: i.shopify_store_url || '',
          shopify_access_token: i.shopify_access_token || '',
          shopify_activo: !!i.shopify_activo,
          shopify_webhook_secret: i.shopify_webhook_secret || '',
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
    if (payload.ai_api_key === '********') delete payload.ai_api_key;
    if (payload.shopify_access_token === '********') delete payload.shopify_access_token;
    if (payload.shopify_webhook_secret === '********') delete payload.shopify_webhook_secret;
    if (!usarApiPropia) {
      // Vaciar API key para que la empresa use la clave gestionada por el sistema
      payload.ai_api_key = '';
    }
    api
      .patch('/integraciones', payload)
      .then((r) => {
        setForm({
          shopify_store_url: r.integraciones?.shopify_store_url ?? form.shopify_store_url,
          shopify_access_token: r.integraciones?.shopify_access_token ?? form.shopify_access_token,
          shopify_activo: !!r.integraciones?.shopify_activo,
          shopify_webhook_secret: r.integraciones?.shopify_webhook_secret ?? form.shopify_webhook_secret,
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Integraciones</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Conecta tu tienda Shopify para que los pedidos lleguen al CRM. Otras tiendas o apps suelen enlazarse vía Shopify.
      </p>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Shopify</h2>
          <p className="text-[#8b9cad] text-sm mb-4">
            Conecta tu tienda Shopify para que los pedidos nuevos lleguen al CRM. Es opcional: si no usas Shopify, deja esta sección desactivada.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.shopify_activo}
                onChange={(e) => setForm((f) => ({ ...f, shopify_activo: e.target.checked }))}
                className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
              />
              <span className="text-sm font-medium text-[#8b9cad]">Usar Shopify en el CRM</span>
            </label>
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">Dominio de la tienda</label>
              <input
                type="text"
                value={form.shopify_store_url}
                onChange={(e) => setForm((f) => ({ ...f, shopify_store_url: e.target.value.trim() }))}
                placeholder="mitienda.myshopify.com"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <p className="text-xs text-[#6b7a8a] mt-1">El dominio que aparece en la URL de tu admin de Shopify (sin https://).</p>
            </div>
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">Access token (Admin API) — opcional</label>
              <input
                type="password"
                value={form.shopify_access_token}
                onChange={(e) => setForm((f) => ({ ...f, shopify_access_token: e.target.value }))}
                placeholder="Para recibir pedidos por webhook no es obligatorio"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <p className="text-xs text-[#6b7a8a] mt-1">Créalo en Shopify: Ajustes → Apps y canales de ventas → Desarrollar apps → Crear app → Configurar Admin API.</p>
            </div>
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">Secreto del webhook (opcional)</label>
              <input
                type="password"
                value={form.shopify_webhook_secret}
                onChange={(e) => setForm((f) => ({ ...f, shopify_webhook_secret: e.target.value }))}
                placeholder="Para verificar que los pedidos vienen de Shopify"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <p className="text-xs text-[#6b7a8a] mt-1">En tu app de Shopify, es el &quot;Client secret&quot; o el secreto que configuras al crear el webhook.</p>
            </div>
            {form.shopify_activo && form.shopify_store_url && (
              <div className="rounded-lg bg-[#0f1419] border border-[#2d3a47] p-3 mt-2">
                <p className="text-xs text-[#8b9cad] mb-1">URL para el webhook en Shopify (Pedidos → Crear pedido):</p>
                <p className="text-[#00c896] text-xs font-mono break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin.replace(/\/$/, '')}/api/integraciones-webhook/shopify` : ''}
                </p>
                <p className="text-xs text-[#6b7a8a] mt-1">En Shopify: Ajustes → Notificaciones → Webhooks → Crear webhook → Evento: Creación de pedido. Pega esta URL.</p>
              </div>
            )}
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
