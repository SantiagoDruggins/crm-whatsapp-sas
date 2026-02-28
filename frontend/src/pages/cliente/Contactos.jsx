import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'interested', label: 'Interesado' },
  { value: 'warm', label: 'Cálido' },
  { value: 'hot', label: 'Caliente' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
];

function safeTags(c) {
  if (Array.isArray(c?.tags)) return c.tags.join(', ');
  if (typeof c?.tags === 'string') return c.tags;
  return '—';
}

export default function Contactos() {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    tags: '',
    notas: '',
    lead_status: 'new',
  });

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    api
      .get('/crm/contactos')
      .then((r) => {
        const list = Array.isArray(r?.contactos) ? r.contactos : [];
        setContactos(list);
      })
      .catch((e) => {
        setContactos([]);
        setError(e?.message || 'Error al cargar contactos. Revisa la conexión.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const payload = {
      nombre: form.nombre,
      apellidos: form.apellidos || null,
      email: form.email || null,
      telefono: form.telefono || null,
      tags,
      notas: form.notas || null,
      lead_status: form.lead_status || 'new',
    };
    if (modal?.id) {
      api
        .patch(`/crm/contactos/${modal.id}`, payload)
        .then(() => {
          setModal(null);
          setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '', lead_status: 'new' });
          load();
        })
        .catch((e) => setError(e?.message || 'Error al guardar'));
    } else {
      api
        .post('/crm/contactos', payload)
        .then(() => {
          setModal(null);
          setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '', lead_status: 'new' });
          load();
        })
        .catch((e) => setError(e?.message || 'Error al crear'));
    }
  };

  const openEdit = (c) => {
    setModal(c);
    setForm({
      nombre: c?.nombre ?? '',
      apellidos: c?.apellidos ?? '',
      email: c?.email ?? '',
      telefono: c?.telefono ?? '',
      tags: safeTags(c),
      notas: c?.notas ?? '',
      lead_status: c?.lead_status || 'new',
    });
  };

  const openNew = () => {
    setModal({});
    setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '', lead_status: 'new' });
    setError('');
  };

  const list = Array.isArray(contactos) ? contactos : [];

  return (
    <div className="min-h-[320px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Contactos</h1>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]"
        >
          Nuevo contacto
        </button>
      </div>

      {loading && (
        <p className="text-[#8b9cad] py-8" aria-live="polite">
          Cargando contactos…
        </p>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-[#f87171] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-[#f87171] hover:text-white">
            ×
          </button>
        </div>
      )}

      {!loading && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-[#2d3a47]">
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Teléfono</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Lead</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Tags</th>
                  <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">
                      No hay contactos. Crea uno o conéctate a WhatsApp para que se creen automáticamente.
                    </td>
                  </tr>
                ) : (
                  list.map((c) => (
                    <tr key={c.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                      <td className="px-4 py-3 text-white">
                        {(c?.nombre ?? '').trim()} {(c?.apellidos ?? '').trim()}
                      </td>
                      <td className="px-4 py-3 text-[#8b9cad]">{c?.email || '—'}</td>
                      <td className="px-4 py-3 text-[#8b9cad]">{c?.telefono || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#232d38] text-[#8b9cad]">
                          {LEAD_STATUS_OPTIONS.find((o) => o.value === (c?.lead_status || 'new'))?.label || c?.lead_status || 'Nuevo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8b9cad]">{safeTags(c)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="text-[#00c896] hover:text-[#00e0a8] text-sm"
                        >
                          Editar
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title" className="text-lg font-bold text-white mb-4">
              {modal?.id ? 'Editar contacto' : 'Nuevo contacto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre *"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                required
              />
              <input
                type="text"
                placeholder="Apellidos"
                value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <label className="block text-sm text-[#8b9cad]">Estado del lead</label>
              <select
                value={form.lead_status}
                onChange={(e) => setForm((f) => ({ ...f, lead_status: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              >
                {LEAD_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tags (separados por coma)"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <textarea
                placeholder="Notas"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                rows={2}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
