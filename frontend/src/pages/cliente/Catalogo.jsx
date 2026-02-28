import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const TIPOS = [
  { value: 'producto', label: 'Producto' },
  { value: 'servicio', label: 'Servicio' },
];

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', moneda: 'COP', tipo: 'producto', imagen_url: '' });
  const [guardando, setGuardando] = useState(false);
  const [imagenFile, setImagenFile] = useState(null);

  const load = () => {
    api
      .get('/crm/productos')
      .then((r) => setItems(r.productos || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setModal({});
    setForm({ nombre: '', descripcion: '', precio: '', moneda: 'COP', tipo: 'producto', imagen_url: '' });
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
      imagen_url: p.imagen_url || '',
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        precio: Number(form.precio) || 0,
        moneda: form.moneda || 'COP',
        tipo: form.tipo || 'producto',
        imagen_url: form.imagen_url || null,
      };
      const res = modal?.id ? await api.patch(`/crm/productos/${modal.id}`, payload) : await api.post('/crm/productos', payload);
      const prod = res.producto;
      if (imagenFile && prod?.id) {
        const fd = new FormData();
        fd.append('imagen', imagenFile);
        await api.upload(`/crm/productos/${prod.id}/imagen`, fd);
      }
      setModal(null);
      setImagenFile(null);
      load();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (p) => {
    if (!window.confirm(`¿Desactivar el ${p.tipo || 'producto'} "${p.nombre}"?`)) return;
    api
      .delete(`/crm/productos/${p.id}`)
      .then(() => load())
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando catálogo...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Catálogo</h1>
        <button onClick={openNew} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
          Nuevo ítem
        </button>
      </div>
      <p className="text-sm text-[#8b9cad] mb-4">
        Agrega aquí tus productos o servicios con descripción, precio y, si quieres, una URL de imagen. El bot usará este catálogo para responder sobre tu oferta.
      </p>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Precio</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Imagen</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">
                  No hay ítems en el catálogo. Crea tu primer producto o servicio.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{p.nombre}</div>
                    {p.descripcion && <div className="text-xs text-[#8b9cad] line-clamp-2">{p.descripcion}</div>}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">{p.tipo || 'producto'}</td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">
                    {Number(p.precio).toLocaleString('es-CO')} {p.moneda || 'COP'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-xs">
                    {p.imagen_url ? (
                      <a href={p.imagen_url} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:text-[#00e0a8]">
                        Ver imagen
                      </a>
                    ) : (
                      <span className="text-[#6b7a8a]">Sin imagen</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-[#00c896] hover:text-[#00e0a8]">
                        Editar
                      </button>
                      <button onClick={() => eliminar(p)} className="text-xs text-[#f87171] hover:text-red-400">
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !guardando && setModal(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{modal.id ? 'Editar ítem' : 'Nuevo ítem'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8b9cad] mb-1">Precio</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8b9cad] mb-1">Moneda</label>
                  <input
                    type="text"
                    value={form.moneda}
                    onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                    className="w-24 rounded-xl bg-[#0f1419] border border-[#2d3a47] px-3 py-2 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8b9cad] mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">URL de imagen (opcional)</label>
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                  placeholder="https://tus-imagenes.com/producto.jpg"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Foto (subir archivo, opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[#8b9cad]"
                />
                {imagenFile && <p className="text-xs text-[#6b7a8a] mt-1">Archivo seleccionado: {imagenFile.name}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={guardando}
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

