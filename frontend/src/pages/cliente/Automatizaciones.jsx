import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const TRIGGERS = [
  { value: 'keyword', label: 'Palabra clave en el mensaje' },
  { value: 'lead_status', label: 'Estado del lead' },
  { value: 'tag', label: 'Tag del contacto' },
];

const ACCIONES = [
  { value: 'mensaje', label: 'Enviar mensaje automático' },
  { value: 'enviar_audio', label: 'Enviar audio automático' },
  { value: 'enviar_archivo', label: 'Enviar archivo automático' },
  { value: 'tag', label: 'Añadir tag al contacto' },
  { value: 'cambiar_estado', label: 'Cambiar estado del lead' },
];

export default function Automatizaciones() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);

  const emptyForm = {
    nombre: '',
    trigger_type: 'keyword',
    trigger_value: '',
    accion_tipo: 'mensaje',
    accion_valor: '',
    activo: true,
  };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/crm/flows')
      .then((r) => setFlows(Array.isArray(r?.flows) ? r.flows : []))
      .catch((e) => {
        setFlows([]);
        setError(e?.message || 'Error al cargar automatizaciones.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setModal({});
    setForm(emptyForm);
    setMediaFile(null);
    setError('');
  };

  const openEdit = (flow) => {
    setModal(flow);
    setForm({
      nombre: flow.nombre || '',
      trigger_type: flow.trigger_type || 'keyword',
      trigger_value: flow.trigger_value || '',
      accion_tipo: flow.accion_tipo || 'mensaje',
      accion_valor: flow.accion_valor || '',
      activo: flow.activo !== false,
    });
    setMediaFile(null);
    setError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const needsTextValue = ['mensaje', 'tag', 'cambiar_estado'].includes(form.accion_tipo);
    if (!form.nombre.trim() || !form.trigger_value.trim() || (needsTextValue && !form.accion_valor.trim())) {
      setError('Nombre, valor del disparador y acción son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      nombre: form.nombre.trim(),
      trigger_type: form.trigger_type,
      trigger_value: form.trigger_value.trim(),
      accion_tipo: form.accion_tipo,
      accion_valor: form.accion_valor || '',
      activo: !!form.activo,
    };
    const req = modal?.id
      ? api.patch(`/crm/flows/${modal.id}`, payload)
      : api.post('/crm/flows', payload);
    req
      .then(async (resp) => {
        const flowId = resp?.flow?.id || modal?.id;
        if (mediaFile && flowId && (form.accion_tipo === 'enviar_audio' || form.accion_tipo === 'enviar_archivo')) {
          const fd = new FormData();
          fd.append('archivo', mediaFile);
          await api.upload(`/crm/flows/${flowId}/media`, fd);
        }
        setModal(null);
        setForm(emptyForm);
        setMediaFile(null);
        load();
      })
      .catch((e) => setError(e?.message || 'Error al guardar automatización.'))
      .finally(() => setSaving(false));
  };

  const toggleActivo = (flow) => {
    api
      .patch(`/crm/flows/${flow.id}`, { activo: !flow.activo })
      .then(() => load())
      .catch((e) => setError(e?.message || 'Error al actualizar estado del flujo.'));
  };

  const handleEliminar = (flow) => {
    if (!flow?.id) return;
    if (!window.confirm(`¿Eliminar el flujo "${flow.nombre}"? Esta acción no se puede deshacer.`)) return;
    api
      .delete(`/crm/flows/${flow.id}`)
      .then(() => load())
      .catch((e) => setError(e?.message || 'Error al eliminar flujo.'));
  };

  const describeTrigger = (f) => {
    const base = TRIGGERS.find((t) => t.value === f.trigger_type)?.label || f.trigger_type;
    return `${base || ''} → "${f.trigger_value}"`;
  };

  const describeAccion = (f) => {
    const base = ACCIONES.find((a) => a.value === f.accion_tipo)?.label || f.accion_tipo;
    if (f.accion_tipo === 'mensaje') return `${base}: "${(f.accion_valor || '').slice(0, 40)}${f.accion_valor?.length > 40 ? '…' : ''}"`;
    if (f.accion_tipo === 'enviar_audio') return `${base}: ${f.accion_valor ? 'audio cargado' : 'sin audio'}`;
    if (f.accion_tipo === 'enviar_archivo') return `${base}: ${f.accion_valor ? 'archivo cargado' : 'sin archivo'}`;
    return `${base}: ${f.accion_valor}`;
  };

  return (
    <div className="min-h-[320px] bg-[#0f1419] text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Automatizaciones</h1>
          <p className="text-[#8b9cad] text-sm mt-1">
            Crea reglas simples que se ejecutan antes de la IA. Ideal para palabras clave, clasificación y respuestas rápidas.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]"
        >
          Nuevo flujo
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-[#fca5a5] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 flex items-center gap-3 text-[#8b9cad]">
          <span className="inline-block w-5 h-5 border-2 border-[#00c896] border-t-transparent rounded-full animate-spin" />
          <span>Cargando automatizaciones…</span>
        </div>
      ) : (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="border-b border-[#2d3a47]">
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Disparador</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Acción</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-40">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {flows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">
                      No hay automatizaciones aún. Crea tu primer flujo para responder a palabras clave o actualizar estados automáticamente.
                    </td>
                  </tr>
                ) : (
                  flows.map((f) => (
                    <tr key={f.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/40">
                      <td className="px-4 py-3 text-white text-sm">{f.nombre}</td>
                      <td className="px-4 py-3 text-[#8b9cad] text-sm">{describeTrigger(f)}</td>
                      <td className="px-4 py-3 text-[#8b9cad] text-sm">{describeAccion(f)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActivo(f)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            f.activo ? 'bg-[#00c896]/15 text-[#00c896]' : 'bg-[#2d3a47] text-[#8b9cad]'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${f.activo ? 'bg-[#00c896]' : 'bg-[#6b7a8a]'}`} />
                          {f.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="text-[#00c896] hover:text-[#00e0a8] text-sm"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(f)}
                          className="text-[#f97373] hover:text-red-300 text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">
              {modal?.id ? 'Editar automatización' : 'Nueva automatización'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 text-sm">
              <div>
                <label className="block text-[#8b9cad] mb-1">Nombre del flujo</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                  placeholder="Ej: Respuesta a hola, Clasificar clientes calientes…"
                />
              </div>
              <div>
                <label className="block text-[#8b9cad] mb-1">Cuándo se dispara</label>
                <select
                  value={form.trigger_type}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#8b9cad] mb-1">Valor del disparador</label>
                <input
                  type="text"
                  value={form.trigger_value}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_value: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                  placeholder="Ej: hola, interesado, vip…"
                />
              </div>
              <div>
                <label className="block text-[#8b9cad] mb-1">Acción a ejecutar</label>
                <select
                  value={form.accion_tipo}
                  onChange={(e) => setForm((f) => ({ ...f, accion_tipo: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                >
                  {ACCIONES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#8b9cad] mb-1">
                  {form.accion_tipo === 'mensaje'
                    ? 'Mensaje automático (texto fijo)'
                    : form.accion_tipo === 'enviar_audio'
                    ? 'Audio automático (sube archivo de audio o URL)'
                    : form.accion_tipo === 'enviar_archivo'
                    ? 'Archivo automático (PDF, DOC, etc.)'
                    : form.accion_tipo === 'tag'
                    ? 'Nombre del tag a añadir'
                    : 'Nuevo estado del lead'}
                </label>
                {form.accion_tipo === 'mensaje' ? (
                  <textarea
                    rows={3}
                    value={form.accion_valor}
                    onChange={(e) => setForm((f) => ({ ...f, accion_valor: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                    placeholder="Ej: Hola, gracias por escribir. En este momento nuestro equipo está atendiendo, en breve te respondemos."
                  />
                ) : form.accion_tipo === 'enviar_audio' || form.accion_tipo === 'enviar_archivo' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={form.accion_valor}
                      onChange={(e) => setForm((f) => ({ ...f, accion_valor: e.target.value }))}
                      className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                      placeholder="URL pública opcional del archivo"
                    />
                    <input
                      type="file"
                      accept={form.accion_tipo === 'enviar_audio' ? 'audio/*' : '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,application/*,text/*'}
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-3 py-2 text-[#cbd5e0]"
                    />
                    <p className="text-xs text-[#6b7a8a]">
                      Si subes archivo, al guardar se adjunta al flujo y se enviará automáticamente cuando dispare.
                    </p>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form.accion_valor}
                    onChange={(e) => setForm((f) => ({ ...f, accion_valor: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                    placeholder={form.accion_tipo === 'tag' ? 'Ej: vip, caliente, nuevo' : 'Ej: hot, scheduled, buyer…'}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="flow-activo"
                  type="checkbox"
                  checked={!!form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
                />
                <label htmlFor="flow-activo" className="text-[#8b9cad]">
                  Activar flujo
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

