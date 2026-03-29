import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';

const initialForm = () => ({
  contacto_id: '',
  total: '',
  datos: { items: [], nota: '' },
  direccion: { nombre: '', telefono: '', direccion: '', ciudad: '' },
});

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initialForm());
  // Para añadir línea desde catálogo
  const [addProductId, setAddProductId] = useState('');
  const [addCantidad, setAddCantidad] = useState(1);
  // Para línea manual
  const [manualNombre, setManualNombre] = useState('');
  const [manualPrecio, setManualPrecio] = useState('');
  const [manualCantidad, setManualCantidad] = useState(1);

  const load = () => {
    api.get('/pedidos').then((r) => setPedidos(r.pedidos || [])).catch((e) => setError(e.message));
    api.get('/crm/contactos').then((r) => setContactos(r.contactos || [])).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    load();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (modal !== null) {
      api.get('/crm/productos').then((r) => setProductos(r.productos || [])).catch(() => setProductos([]));
    }
  }, [modal]);

  const items = Array.isArray(form.datos?.items) ? form.datos.items : [];
  const totalCalculado = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.subtotal) || Number(it.precio_unitario) * (Number(it.cantidad) || 0) || 0), 0);
  }, [items]);

  const addFromCatalog = () => {
    const prod = productos.find((p) => p.id === addProductId);
    if (!prod) return;
    const cantidad = Math.max(1, Number(addCantidad) || 1);
    const precio = Number(prod.precio) || 0;
    const nuevo = {
      product_id: prod.id,
      nombre: prod.nombre,
      precio_unitario: precio,
      cantidad,
      subtotal: precio * cantidad,
    };
    setForm((f) => ({
      ...f,
      datos: { ...f.datos, items: [...(f.datos?.items || []), nuevo] },
    }));
    setAddProductId('');
    setAddCantidad(1);
  };

  const addManualLine = () => {
    const nombre = (manualNombre || '').trim();
    if (!nombre) return;
    const cantidad = Math.max(1, Number(manualCantidad) || 1);
    const precio = Number(manualPrecio) || 0;
    const nuevo = {
      nombre,
      precio_unitario: precio,
      cantidad,
      subtotal: precio * cantidad,
    };
    setForm((f) => ({
      ...f,
      datos: { ...f.datos, items: [...(f.datos?.items || []), nuevo] },
    }));
    setManualNombre('');
    setManualPrecio('');
    setManualCantidad(1);
  };

  const removeItem = (idx) => {
    setForm((f) => ({
      ...f,
      datos: { ...f.datos, items: (f.datos?.items || []).filter((_, i) => i !== idx) },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const totalFinal = items.length ? totalCalculado : Number(form.total) || 0;
    const payload = {
      contacto_id: form.contacto_id || undefined,
      total: totalFinal,
      datos: { ...form.datos, items },
      direccion: form.direccion,
    };
    api
      .post('/pedidos', payload)
      .then((r) => {
        setModal(null);
        setForm(initialForm());
        setPedidos((prev) => [r.pedido, ...prev]);
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando pedidos...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <button
          onClick={() => {
            setModal({});
            setForm(initialForm());
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
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Líneas</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Shopify</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">
                  No hay pedidos. Crea uno manualmente o conecta Shopify en Integraciones para que lleguen automáticamente.
                </td>
              </tr>
            ) : (
              pedidos.map((p) => {
                const itemsPedido = Array.isArray(p.datos?.items) ? p.datos.items : [];
                const resumen =
                  itemsPedido.length > 0
                    ? itemsPedido
                        .slice(0, 6)
                        .map((it) => `${it.nombre || 'Ítem'} × ${it.cantidad || 1}`)
                        .join('\n')
                    : '';
                return (
                  <tr key={p.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                    <td className="px-4 py-3 text-white">
                      {p.contacto_nombre || '—'} {p.contacto_telefono ? ` · ${p.contacto_telefono}` : ''}
                    </td>
                    <td className="px-4 py-3 text-[#8b9cad]">${Number(p.total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#8b9cad] text-xs">
                      {itemsPedido.length === 0 ? (
                        '—'
                      ) : (
                        <span title={resumen}>
                          {itemsPedido.length} {itemsPedido.length === 1 ? 'línea' : 'líneas'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#8b9cad]">{p.estado}</span>
                    </td>
                    <td className="px-4 py-3 text-[#8b9cad] text-xs font-mono">
                      {p.shopify_order_id ? `#${p.shopify_order_id}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDetalle(p)}
                          className="text-xs rounded border border-[#2d3a47] text-[#8b9cad] px-2 py-1 hover:bg-[#232d38]"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Nuevo pedido</h2>
            <p className="text-xs text-[#8b9cad] mb-4">
              Añade líneas desde tu catálogo o manualmente. Los pedidos desde Shopify llegan por webhook cuando está configurado.
            </p>
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

              <div className="border-t border-[#2d3a47] pt-4">
                <label className="block text-sm font-medium text-white mb-2">Líneas del pedido</label>
                {productos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select
                      value={addProductId}
                      onChange={(e) => setAddProductId(e.target.value)}
                      className="rounded-lg bg-[#0f1419] border border-[#2d3a47] px-3 py-2 text-white text-sm min-w-[140px]"
                    >
                      <option value="">— Desde catálogo —</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio || 0).toLocaleString()}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={addCantidad}
                      onChange={(e) => setAddCantidad(e.target.value)}
                      className="w-16 rounded-lg bg-[#0f1419] border border-[#2d3a47] px-2 py-2 text-white text-sm"
                    />
                    <button type="button" onClick={addFromCatalog} disabled={!addProductId} className="rounded-lg bg-[#00c896]/20 text-[#00c896] px-3 py-2 text-sm font-medium hover:bg-[#00c896]/30 disabled:opacity-50">
                      Añadir
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  <input
                    type="text"
                    value={manualNombre}
                    onChange={(e) => setManualNombre(e.target.value)}
                    placeholder="Producto o descripción"
                    className="rounded-lg bg-[#0f1419] border border-[#2d3a47] px-3 py-2 text-white text-sm flex-1 min-w-[120px]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={manualPrecio}
                    onChange={(e) => setManualPrecio(e.target.value)}
                    placeholder="Precio unit."
                    className="w-24 rounded-lg bg-[#0f1419] border border-[#2d3a47] px-2 py-2 text-white text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={manualCantidad}
                    onChange={(e) => setManualCantidad(e.target.value)}
                    className="w-14 rounded-lg bg-[#0f1419] border border-[#2d3a47] px-2 py-2 text-white text-sm"
                  />
                  <button type="button" onClick={addManualLine} disabled={!manualNombre?.trim()} className="rounded-lg border border-[#2d3a47] text-[#8b9cad] px-3 py-2 text-sm hover:bg-[#232d38] disabled:opacity-50">
                    Añadir línea manual
                  </button>
                </div>
                {items.length > 0 && (
                  <ul className="space-y-1 mb-2 max-h-32 overflow-y-auto rounded-lg bg-[#0f1419] border border-[#2d3a47] p-2">
                    {items.map((it, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm text-[#e9edef] py-1">
                        <span className="truncate flex-1">{it.nombre} × {it.cantidad}</span>
                        <span className="text-[#00c896] ml-2">${Number(it.subtotal || 0).toLocaleString()}</span>
                        <button type="button" onClick={() => removeItem(idx)} className="text-[#f87171] hover:text-red-300 ml-1 text-xs">Quitar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Total</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={items.length ? totalCalculado : form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                  readOnly={items.length > 0}
                  placeholder="0"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  required
                />
                {items.length > 0 ? <p className="text-xs text-[#8b9cad] mt-0.5">Total calculado desde las líneas.</p> : <p className="text-xs text-[#8b9cad] mt-0.5">Introduce el total o añade líneas desde el catálogo / manual.</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#8b9cad] mb-1">Nombre (envío)</label>
                  <input
                    type="text"
                    value={form.direccion?.nombre || ''}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: { ...f.direccion, nombre: e.target.value } }))}
                    placeholder="Nombre"
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8b9cad] mb-1">Teléfono (envío)</label>
                  <input
                    type="text"
                    value={form.direccion?.telefono || ''}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: { ...f.direccion, telefono: e.target.value } }))}
                    placeholder="Teléfono"
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Dirección</label>
                <input
                  type="text"
                  value={form.direccion?.direccion || ''}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: { ...f.direccion, direccion: e.target.value } }))}
                  placeholder="Calle, número"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.direccion?.ciudad || ''}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: { ...f.direccion, ciudad: e.target.value } }))}
                  placeholder="Ciudad"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b9cad] mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={form.datos?.nota || ''}
                  onChange={(e) => setForm((f) => ({ ...f, datos: { ...f.datos, nota: e.target.value } }))}
                  placeholder="Referencia o comentario"
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

      {detalle && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4 overflow-y-auto"
          onClick={() => setDetalle(null)}
        >
          <div
            className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Detalle del pedido #{detalle.id}</h2>
                <p className="text-xs text-[#8b9cad] mt-1">
                  Cliente: {detalle.contacto_nombre || '—'}
                  {detalle.contacto_telefono ? ` · ${detalle.contacto_telefono}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="text-[#8b9cad] hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-[#e9edef]">
              <div>
                <p className="text-[#8b9cad] text-xs uppercase mb-1">Total</p>
                <p>${Number(detalle.total || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#8b9cad] text-xs uppercase mb-1">Estado</p>
                <p>{detalle.estado}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[#8b9cad] text-xs uppercase mb-1">Shopify</p>
                <p className="text-xs">
                  {detalle.shopify_order_id
                    ? `Pedido de tienda · ID ${detalle.shopify_order_id}`
                    : 'Pedido manual o sin enlace a Shopify'}
                </p>
              </div>
            </div>

            {Array.isArray(detalle.datos?.items) && detalle.datos.items.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-white mb-2">Líneas del pedido</p>
                <table className="w-full text-left text-xs border border-[#2d3a47] rounded-lg overflow-hidden">
                  <thead className="bg-[#0f1419]">
                    <tr>
                      <th className="px-3 py-2 text-[#8b9cad] font-medium">Producto</th>
                      <th className="px-3 py-2 text-[#8b9cad] font-medium">Cant.</th>
                      <th className="px-3 py-2 text-[#8b9cad] font-medium">Precio unit.</th>
                      <th className="px-3 py-2 text-[#8b9cad] font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.datos.items.map((it, idx) => (
                      <tr key={idx} className="border-t border-[#2d3a47]">
                        <td className="px-3 py-1.5 text-[#e9edef]">{it.nombre || 'Ítem'}</td>
                        <td className="px-3 py-1.5 text-[#e9edef] text-xs">{it.cantidad || 1}</td>
                        <td className="px-3 py-1.5 text-[#8b9cad] text-xs">
                          ${Number(it.precio_unitario || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-[#e9edef] text-xs text-right">
                          ${Number(it.subtotal || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mb-3 text-sm text-[#e9edef]">
              <p className="text-sm font-semibold text-white mb-1">Dirección de envío</p>
              <p className="text-xs text-[#8b9cad]">
                {detalle.direccion?.nombre || ''}
                {detalle.direccion?.telefono ? ` · ${detalle.direccion.telefono}` : ''}
              </p>
              <p className="text-xs text-[#e9edef] mt-1">
                {detalle.direccion?.direccion || 'Sin dirección'}
                {detalle.direccion?.ciudad ? ` — ${detalle.direccion.ciudad}` : ''}
              </p>
            </div>

            {detalle.datos?.nota && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-white mb-1">Nota</p>
                <p className="text-xs text-[#e9edef]">{detalle.datos.nota}</p>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 text-sm hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
