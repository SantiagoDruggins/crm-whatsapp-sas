import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function AuditoriaIA() {
  const [auditorias, setAuditorias] = useState([]);
  const [conversaciones, setConversaciones] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/crm/auditoria-ia').then((r) => setAuditorias(r.auditorias || [])),
      api.get('/crm/conversaciones?limit=50').then((r) => setConversaciones(r.conversaciones || [])),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const auditar = async () => {
    if (!selected) return;
    setBusy('audit');
    setError('');
    try {
      await api.post(`/crm/auditoria-ia/conversaciones/${selected}`, {});
      setSelected('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const crearPedido = async (id) => {
    setBusy(id);
    setError('');
    try {
      await api.post(`/crm/auditoria-ia/${id}/crear-pedido`, {});
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando auditoria...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Ventas Perdidas / Auditoria IA</h1>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1 rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white">
            <option value="">Selecciona una conversacion reciente</option>
            {conversaciones.map((c) => <option key={c.id} value={c.id}>{c.contacto_nombre || c.contacto_telefono || c.id}</option>)}
          </select>
          <button disabled={!selected || busy === 'audit'} onClick={auditar} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
            {busy === 'audit' ? 'Auditando...' : 'Auditar'}
          </button>
        </div>
      </div>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Chat</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Cierre</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-52">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {auditorias.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8b9cad]">Aun no hay auditorias.</td></tr>
            ) : auditorias.map((a) => {
              const r = a.resultado_ia || {};
              return (
                <tr key={a.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{a.contacto_nombre || a.contacto_telefono || 'Chat'}</div>
                    <div className="text-xs text-[#8b9cad]">{new Date(a.created_at).toLocaleString('es-CO')}</div>
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">
                    <div>{Number(r.probabilidad_cierre || 0)}%</div>
                    <div className="text-xs">Compra: {r.intencion_compra ? 'si' : 'no'} · Datos: {r.datos_completos ? 'si' : 'no'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.alerta_generada && !a.existe_pedido ? <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300">Alerta sin pedido</span> : <span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#8b9cad]">{a.existe_pedido || a.pedido_creado ? 'Con pedido' : 'Sin alerta'}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {a.conversacion_id && <Link to={`/dashboard/conversaciones/${a.conversacion_id}`} className="text-xs rounded border border-[#2d3a47] text-[#8b9cad] px-2 py-1 hover:bg-[#232d38]">Contactar</Link>}
                      <button disabled={!r.datos_completos || a.pedido_creado || a.existe_pedido || busy === a.id} onClick={() => crearPedido(a.id)} className="text-xs rounded bg-[#00c896]/20 text-[#00c896] px-2 py-1 hover:bg-[#00c896]/30 disabled:opacity-40">Crear pedido</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
