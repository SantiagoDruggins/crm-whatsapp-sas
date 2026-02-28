import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [form, setForm] = useState({
    contacto_id: '',
    total: '',
    datos: { items: [] },
    direccion: { nombre: '', telefono: '', direccion: '', ciudad: '' },
  });

  const load = () => {
    api.get('/pedidos').then((r) => setPedidos(r.pedidos || [])).catch((e) => setError(e.message));
    api.get('/crm/contactos').then((r) => setContactos(r.contactos || [])).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    load();
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      contacto_id: form.contacto_id || undefined,
      total: Number(form.total) || 0,
      datos: form.datos,
      direccion: form.direccion,
    };
    api
      .post('/pedidos', payload)
      .then((r) => {
        setModal(null);
        setForm({ contacto_id: '', total: '', datos: { items: [] }, direccion: { nombre: '', telefono: '', direccion: '', ciudad: '' } });
        setPedidos((prev) => [r.pedido, ...prev]);
      })
      .catch((e) => setError(e.message));
  };

  const syncTo = (id, tipo) => {
    setSyncing(id);
    const endpoint = tipo === 'dropi' ? `/pedidos/${id}/sync-dropi` : `/pedidos/${id}/sync-mastershop`;
    api
      .post(endpoint)
      .then((r) => {
        setPedidos((prev) => prev.map((p) => (p.id === id ? r.pedido : p)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setSyncing(null));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando pedidos...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <button
          onClick={() => {
            setModal({});
            setForm({ contacto_id: '', total: '', datos: { items: [] }, direccion: { nombre: '', telefono: '', direccion: '', ciudad: '' } });
            setError('');
          }}
          className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]"
        >
          Nuevo pedido
        </button>
      </div>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Cliente</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Total</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Dropi</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Mastershop</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-40">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">
                  No hay pedidos. Crea uno para enviarlo a Dropi o Mastershop si tienes la integración activa.
                </td>
              </tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">
                    {p.contacto_nombre || '—'} {p.contacto_telefono ? ` · ${p.contacto_telefono}` : ''}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">${Number(p.total).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#8b9cad]">{p.estado}</span></td>
                  <td className="px-4 py-3 text-[#8b9cad] text-xs">
                    {p.dropi_enviado_at ? `✓ ${p.dropi_id || 'Enviado'}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-xs">
                    {p.mastershop_enviado_at ? `✓ ${p.mastershop_id || 'Enviado'}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!p.dropi_enviado_at && (
                        <button
                          type="button"
                          onClick={() => syncTo(p.id, 'dropi')}
                          disabled={!!syncing}
                          className="text-xs rounded bg-[#00c896]/20 text-[#00c896] px-2 py-1 hover:bg-[#00c896]/30 disabled:opacity-50"
                        >
                          {syncing === p.id ? '...' : 'Enviar a Dropi'}
                        </button>
                      )}
                      {!p.mastershop_enviado_at && (
                        <button
                          type="button"
                          onClick={() => syncTo(p.id, 'mastershop')}
                          disabled={!!syncing}
                          className="text-xs rounded bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-1 hover:bg-[#3b82f6]/30 disabled:opacity-50"
                        >
                          {syncing === p.id ? '...' : 'Enviar a Mastershop'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Nuevo pedido</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Contacto (opcional)</label>
                <select
                  value={form.contacto_id}
                  onChange={(e) => setForm((f) => ({ ...f, contacto_id: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                >
                  <option value="">— Sin asignar —</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos} {c.telefono ? ` · ${c.telefono}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Total</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Dirección (opcional) — JSON o texto libre</label>
                <input
                  type="text"
                  value={form.direccion?.direccion || ''}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: { ...f.direccion, direccion: e.target.value } }))}
                  placeholder="Calle, ciudad"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
                  Crear pedido
                </button>
                <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">
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
