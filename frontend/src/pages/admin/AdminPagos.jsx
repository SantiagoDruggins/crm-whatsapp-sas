import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function AdminPagos() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [observaciones, setObservaciones] = useState({});

  const load = () => {
    api.get('/pagos/pendientes').then((r) => setPagos(r.pagos || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const aprobar = (id) => {
    api.patch(`/pagos/${id}/aprobar`, {}).then(() => load()).catch((e) => setError(e.message));
  };

  const rechazar = (id) => {
    api.patch(`/pagos/${id}/rechazar`, { observaciones: observaciones[id] || '' }).then(() => load()).catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando pagos pendientes...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pagos pendientes</h1>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Empresa</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Plan</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Monto</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Comprobante</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Fecha</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-48">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">No hay pagos pendientes</td></tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{p.empresa_nombre}</p>
                    <p className="text-[#8b9cad] text-xs">{p.empresa_email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">{p.plan}</td>
                  <td className="px-4 py-3 text-white">${Number(p.monto).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {p.comprobante_url && (
                      <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:text-[#00e0a8] text-sm">
                        Ver imagen
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <input type="text" placeholder="Observaciones (rechazo)" value={observaciones[p.id] || ''} onChange={(e) => setObservaciones((o) => ({ ...o, [p.id]: e.target.value }))} className="rounded bg-[#0f1419] border border-[#2d3a47] px-2 py-1 text-white text-xs w-full mb-2" />
                    <div className="flex gap-2">
                      <button onClick={() => aprobar(p.id)} className="rounded bg-[#00c896] text-[#0f1419] text-xs font-semibold px-3 py-1 hover:bg-[#00e0a8]">Aprobar</button>
                      <button onClick={() => rechazar(p.id)} className="rounded bg-[#f87171]/20 text-[#f87171] text-xs font-semibold px-3 py-1 hover:bg-[#f87171]/30">Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
