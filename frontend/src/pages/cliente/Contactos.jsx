import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'interested', label: 'Interesado' },
  { value: 'warm', label: 'Cálido' },
  { value: 'hot', label: 'Caliente' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
];

/** Convierte tags a texto; tags puede ser array, string, objeto (JSONB) o null. Nunca usa .join salvo en array real. */
function safeTags(c) {
  const t = c?.tags;
  if (t == null) return '—';
  if (Array.isArray(t)) return t.join(', ');
  if (typeof t === 'string') return t;
  if (typeof t === 'object') {
    try {
      const arr = Object.values(t).filter((x) => x != null && String(x).trim() !== '');
      return Array.isArray(arr) && arr.length ? arr.join(', ') : '—';
    } catch {
      return '—';
    }
  }
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
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setError((prev) => prev || 'Tiempo de espera agotado. Comprueba tu conexión.');
    }, 12000);
    api
      .get('/crm/contactos')
      .then((r) => {
        if (cancelled) return;
        try {
          const raw = Array.isArray(r?.contactos) ? r.contactos : [];
          const list = raw.filter((c) => c != null && typeof c === 'object');
          setContactos(list);
        } catch (err) {
          setContactos([]);
          setError(err?.message || 'Error al procesar la lista de contactos.');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setContactos([]);
        setError(e?.message || 'Error al cargar contactos. Revisa la conexión.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return () => { if (typeof cleanup === 'function') cleanup(); };
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

  const list = Array.isArray(contactos) ? contactos.filter((c) => c != null && typeof c === 'object') : [];

  return (
    <div className="min-h-[320px] bg-[#0f1419] text-white">
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
        <div className="py-8 flex items-center gap-3 text-[#8b9cad]" aria-live="polite">
          <span className="inline-block w-5 h-5 border-2 border-[#00c896] border-t-transparent rounded-full animate-spin" />
          <span>Cargando contactos…</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-[#f87171] text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p>{error}</p>
              {(error.includes('vencida') || error.includes('revisión') || error.includes('Empresa no asociada')) && (
                <Link to="/dashboard/pagos" className="mt-2 inline-block text-[#00c896] hover:text-[#00e0a8] text-sm font-medium">
                  Ir a Pagos →
                </Link>
              )}
              <button type="button" onClick={() => { setError(''); load(); }} className="mt-2 mr-2 rounded-lg bg-[#232d38] text-[#8b9cad] hover:text-white px-3 py-1.5 text-sm">
                Reintentar
              </button>
            </div>
            <button type="button" onClick={() => setError('')} className="text-[#f87171] hover:text-white shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden min-h-[200px]">
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
                  list.map((c, idx) => (
                    <tr key={c?.id ?? `contact-${idx}`} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                      <td className="px-4 py-3 text-white">
                        {String(c?.nombre ?? '').trim()} {String(c?.apellidos ?? '').trim()}
                      </td>
                      <td className="px-4 py-3 text-[#8b9cad]">{c?.email ?? '—'}</td>
                      <td className="px-4 py-3 text-[#8b9cad]">{c?.telefono ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#232d38] text-[#8b9cad]">
                          {LEAD_STATUS_OPTIONS.find((o) => o.value === (c?.lead_status || 'new'))?.label || 'Nuevo'}
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
