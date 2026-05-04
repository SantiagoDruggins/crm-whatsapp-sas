import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const TIPOS = [
  { value: 'producto', label: 'Producto' },
  { value: 'servicio', label: 'Servicio' },
];

function mediaSrc(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) return u;
  const base = import.meta.env.VITE_UPLOADS_BASE || window.location.origin;
  const path = u.startsWith('/') ? u : '/' + u;
  if (path.startsWith('/uploads/')) return `${base}/api${path}`;
  return base + path;
}

function normalizeMedia(producto) {
  const media = Array.isArray(producto?.media) ? producto.media : [];
  if (media.length) {
    return media.map((m, idx) => ({
      type: m.type || 'image',
      url: m.url || '',
      is_primary: !!m.is_primary,
      order_index: Number(m.order_index) || idx,
    }));
  }
  if (producto?.imagen_url) return [{ type: 'image', url: producto.imagen_url, is_primary: true, order_index: 0 }];
  return [];
}

function emptyForm() {
  return { nombre: '', descripcion: '', precio: '', moneda: 'COP', tipo: 'producto', media: [] };
}

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  const previewMedia = useMemo(() => {
    const fromUrls = form.media || [];
    const fromFiles = mediaFiles.map((file, idx) => ({
      type: file.type?.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(file),
      file,
      is_primary: fromUrls.length === 0 && idx === 0 && !file.type?.startsWith('video/'),
      order_index: fromUrls.length + idx,
    }));
    return [...fromUrls, ...fromFiles];
  }, [form.media, mediaFiles]);

  const load = () => {
    api
      .get('/crm/productos')
      .then((r) => {
        setError('');
        setItems(r.productos || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setModal({});
    setForm(emptyForm());
    setMediaFiles([]);
    setError('');
  };

  const openEdit = (p) => {
    setModal(p);
    setForm({
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: p.precio != null ? String(p.precio) : '',
      moneda: p.moneda || 'COP',
      tipo: p.tipo || 'producto',
      media: normalizeMedia(p),
    });
    setMediaFiles([]);
    setError('');
  };

  const setPrimary = (idx) => {
    setForm((f) => ({
      ...f,
      media: (f.media || []).map((m, i) => ({ ...m, is_primary: i === idx })),
    }));
  };

  const addUrlMedia = () => {
    setForm((f) => ({
      ...f,
      media: [
        ...(f.media || []),
        { type: 'image', url: '', is_primary: (f.media || []).length === 0, order_index: (f.media || []).length },
      ],
    }));
  };

  const updateMedia = (idx, patch) => {
    setForm((f) => ({
      ...f,
      media: (f.media || []).map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  };

  const removeMedia = (idx) => {
    setForm((f) => {
      const next = (f.media || []).filter((_, i) => i !== idx).map((m, i) => ({ ...m, order_index: i }));
      if (next.length && !next.some((m) => m.is_primary)) next[0].is_primary = true;
      return { ...f, media: next };
    });
  };

  const moveMedia = (idx, dir) => {
    setForm((f) => {
      const next = [...(f.media || [])];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return f;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...f, media: next.map((m, i) => ({ ...m, order_index: i })) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    const mediaPayload = (form.media || []).filter((m) => String(m.url || '').trim());
    if (mediaPayload.length === 0 && mediaFiles.length === 0) return setError('Agrega al menos una imagen o video.');
    setGuardando(true);
    try {
      let media = mediaPayload.map((m, idx) => ({ ...m, order_index: idx }));
      if (mediaFiles.length) {
        const fd = new FormData();
        mediaFiles.forEach((file) => fd.append('media', file));
        const uploaded = await api.upload('/crm/productos/media', fd);
        const newMedia = (uploaded.media || []).map((m, idx) => ({
          ...m,
          is_primary: media.length === 0 && idx === 0 && m.type === 'image',
          order_index: media.length + idx,
        }));
        media = [...media, ...newMedia];
      }
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        precio: Number(form.precio) || 0,
        moneda: form.moneda || 'COP',
        tipo: form.tipo || 'producto',
        imagen_url: media.find((m) => m.is_primary)?.url || media.find((m) => m.type === 'image')?.url || null,
        media,
      };
      await (modal?.id ? api.patch(`/crm/productos/${modal.id}`, payload) : api.post('/crm/productos', payload));
      setModal(null);
      setMediaFiles([]);
      load();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (p) => {
    if (!window.confirm(`Desactivar el ${p.tipo || 'producto'} "${p.nombre}"?`)) return;
    api.delete(`/crm/productos/${p.id}`).then(load).catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando catalogo...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Catalogo</h1>
        <button onClick={openNew} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
          Nuevo item
        </button>
      </div>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-20">Media</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Precio</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">No hay items en el catalogo.</td></tr>
            ) : items.map((p) => {
              const media = normalizeMedia(p);
              const primary = media.find((m) => m.is_primary) || media.find((m) => m.type === 'image') || media[0];
              return (
                <tr key={p.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3">
                    {primary ? (
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-[#2d3a47] bg-[#0f1419]">
                        {primary.type === 'video' ? (
                          <video src={mediaSrc(primary.url)} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={mediaSrc(primary.url)} alt={p.nombre || 'Producto'} className="h-full w-full object-cover" />
                        )}
                        {media.some((m) => m.type === 'video') && <span className="absolute inset-0 grid place-items-center text-white text-xs bg-black/25">Play</span>}
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg border border-dashed border-[#2d3a47] flex items-center justify-center text-[10px] text-[#6b7a8a]">Sin media</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-[#8b9cad]">{media.length} archivo(s)</div>
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">{p.tipo || 'producto'}</td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">{Number(p.precio).toLocaleString('es-CO')} {p.moneda || 'COP'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-[#00c896] hover:text-[#00e0a8]">Editar</button>
                      <button onClick={() => eliminar(p)} className="text-xs text-[#f87171] hover:text-red-400">Desactivar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => !guardando && setModal(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{modal.id ? 'Editar item' : 'Nuevo item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm text-[#8b9cad]">Nombre
                  <input type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="mt-1 w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white" required />
                </label>
                <label className="block text-sm text-[#8b9cad]">Tipo
                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className="mt-1 w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white">
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Descripcion" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={0} step="0.01" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} placeholder="Precio" className="rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white" />
                <input type="text" value={form.moneda} onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))} className="rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white" />
              </div>

              <div className="border-t border-[#2d3a47] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">Galeria</span>
                  <button type="button" onClick={addUrlMedia} className="text-xs rounded-lg border border-[#2d3a47] text-[#8b9cad] px-3 py-1.5 hover:text-white">Agregar URL</button>
                </div>
                <input type="file" multiple accept="image/*,video/*" onChange={(e) => setMediaFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-[#8b9cad] mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(form.media || []).map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-[#2d3a47] bg-[#0f1419] p-3">
                      <div className="flex gap-2 mb-2">
                        <select value={m.type} onChange={(e) => updateMedia(idx, { type: e.target.value })} className="rounded-lg bg-[#1a2129] border border-[#2d3a47] px-2 py-1 text-sm text-white">
                          <option value="image">Imagen</option>
                          <option value="video">Video</option>
                        </select>
                        <button type="button" onClick={() => moveMedia(idx, -1)} className="text-xs text-[#8b9cad]">Subir</button>
                        <button type="button" onClick={() => moveMedia(idx, 1)} className="text-xs text-[#8b9cad]">Bajar</button>
                        <button type="button" onClick={() => removeMedia(idx)} className="ml-auto text-xs text-[#f87171]">Quitar</button>
                      </div>
                      <input value={m.url} onChange={(e) => updateMedia(idx, { url: e.target.value })} placeholder="https://..." className="w-full rounded-lg bg-[#1a2129] border border-[#2d3a47] px-3 py-2 text-white text-sm" />
                      <label className="mt-2 flex items-center gap-2 text-xs text-[#8b9cad]">
                        <input type="radio" checked={!!m.is_primary} onChange={() => setPrimary(idx)} />
                        Principal
                      </label>
                    </div>
                  ))}
                </div>
                {previewMedia.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {previewMedia.map((m, idx) => (
                      <div key={`${m.url}-${idx}`} className="relative w-24 h-20 rounded-lg overflow-hidden border border-[#2d3a47] bg-[#0f1419] shrink-0">
                        {m.type === 'video' ? <video src={mediaSrc(m.url)} className="w-full h-full object-cover" muted /> : <img src={mediaSrc(m.url)} alt="" className="w-full h-full object-cover" />}
                        {m.type === 'video' && <span className="absolute inset-0 grid place-items-center text-white text-xs bg-black/25">Play</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardando} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModal(null)} disabled={guardando} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
