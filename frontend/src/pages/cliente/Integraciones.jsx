import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Integraciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dropi_token: '',
    dropi_activo: false,
    mastershop_token: '',
    mastershop_activo: false,
    gemini_api_key: '',
    ai_provider: 'gemini',
    ai_api_key: '',
  });

  useEffect(() => {
    api
      .get('/integraciones')
      .then((r) => {
        const i = r.integraciones || {};
        setForm({
          dropi_token: i.dropi_token || '',
          dropi_activo: !!i.dropi_activo,
          mastershop_token: i.mastershop_token || '',
          mastershop_activo: !!i.mastershop_activo,
          gemini_api_key: i.gemini_configurado ? '********' : (i.gemini_api_key || ''),
          ai_provider: i.ai_provider || 'gemini',
          ai_api_key: i.ai_configurado ? '********' : (i.ai_api_key || ''),
        });
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
    api
      .patch('/integraciones', payload)
      .then((r) => {
        setForm({
          dropi_token: r.integraciones?.dropi_token ?? form.dropi_token,
          dropi_activo: !!r.integraciones?.dropi_activo,
          mastershop_token: r.integraciones?.mastershop_token ?? form.mastershop_token,
          mastershop_activo: !!r.integraciones?.mastershop_activo,
          gemini_api_key: r.integraciones?.gemini_configurado ? '********' : (r.integraciones?.gemini_api_key ?? form.gemini_api_key),
          ai_provider: r.integraciones?.ai_provider ?? form.ai_provider,
          ai_api_key: r.integraciones?.ai_configurado ? '********' : (r.integraciones?.ai_api_key ?? form.ai_api_key),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

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
            En Dropi (Dropify) obtén el token de integración en la configuración de tu tienda y pégalo aquí.
          </p>
          <div className="space-y-3">
            <label className="block text-sm text-[#8b9cad]">Token de integración</label>
            <input
              type="password"
              value={form.dropi_token}
              onChange={(e) => setForm((f) => ({ ...f, dropi_token: e.target.value }))}
              placeholder="Token Dropi"
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dropi_activo}
                onChange={(e) => setForm((f) => ({ ...f, dropi_activo: e.target.checked }))}
                className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
              />
              <span className="text-sm text-[#8b9cad]">Subir nuevos pedidos automáticamente a Dropi</span>
            </label>
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
          </div>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">IA (proveedor universal)</h2>
          <p className="text-[#8b9cad] text-sm mb-4">
            Elige el proveedor de IA para tu bot. Si no configuras tu propia API key, se usa la clave incluida en tu plan (por defecto: Gemini).
          </p>
          <div className="space-y-3">
            <label className="block text-sm text-[#8b9cad]">Proveedor</label>
            <select
              value={form.ai_provider}
              onChange={(e) => setForm((f) => ({ ...f, ai_provider: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
            <label className="block text-sm text-[#8b9cad]">API key (opcional)</label>
            <input
              type="password"
              value={form.ai_api_key}
              onChange={(e) => setForm((f) => ({ ...f, ai_api_key: e.target.value }))}
              placeholder={form.ai_api_key === '********' ? '••••••••' : `Pega tu API key de ${form.ai_provider === 'gemini' ? 'Google AI Studio' : form.ai_provider === 'openai' ? 'OpenAI' : 'Anthropic'} (opcional)`}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
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
