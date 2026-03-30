import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

function badgeEstadoWompi(s) {
  const u = String(s || '').toUpperCase();
  if (u === 'APPROVED') return 'bg-[#00c896]/20 text-[#00c896]';
  if (u === 'DECLINED' || u === 'VOIDED') return 'bg-[#f87171]/20 text-[#f87171]';
  return 'bg-[#8b9cad]/20 text-[#8b9cad]';
}

export default function AdminPagos() {
  const [tab, setTab] = useState('wompi');
  const [wompiTx, setWompiTx] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [observaciones, setObservaciones] = useState({});

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/admin/wompi-transactions?limit=150'), api.get('/pagos/pendientes')])
      .then(([w, m]) => {
        setWompiTx(w.transactions || []);
        setPagos(m.pagos || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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

  if (loading) return <p className="text-[#8b9cad]">Cargando…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Pagos y cobros</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Transacciones automáticas por Wompi y, si aún existen, comprobantes manuales pendientes de revisión.
      </p>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="flex gap-2 mb-6 border-b border-[#2d3a47] pb-px">
        <button
          type="button"
          onClick={() => setTab('wompi')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            tab === 'wompi' ? 'bg-[#1a2129] text-[#00c896] border border-b-0 border-[#2d3a47]' : 'text-[#8b9cad] hover:text-white'
          }`}
        >
          Wompi ({wompiTx.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('manuales')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            tab === 'manuales' ? 'bg-[#1a2129] text-[#00c896] border border-b-0 border-[#2d3a47]' : 'text-[#8b9cad] hover:text-white'
          }`}
        >
          Comprobantes manuales ({pagos.length})
        </button>
      </div>

      {tab === 'wompi' && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2d3a47]">
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Fecha</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Empresa</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Plan</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Monto</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Estado Wompi</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Ref. / ID</th>
              </tr>
            </thead>
            <tbody>
              {wompiTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-[#8b9cad] text-center">
                    No hay transacciones Wompi registradas aún.
                  </td>
                </tr>
              ) : (
                wompiTx.map((t) => (
                  <tr key={t.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                    <td className="px-4 py-3 text-[#8b9cad] whitespace-nowrap">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{t.empresa_nombre || '—'}</p>
                      <p className="text-[#8b9cad] text-xs">{t.empresa_email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-[#cbd5e0] font-mono text-xs">{t.plan_codigo || '—'}</td>
                    <td className="px-4 py-3 text-white">
                      ${((Number(t.amount_cents) || 0) / 100).toLocaleString('es-CO')} {t.currency || 'COP'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${badgeEstadoWompi(t.status)}`}>{t.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#8b9cad] text-xs max-w-[200px] truncate" title={t.reference || t.wompi_transaction_id}>
                      {t.wompi_transaction_id || t.reference || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'manuales' && (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2d3a47]">
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Empresa</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Plan</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Monto</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Comprobante</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Fecha</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium w-48">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-[#8b9cad] text-center">
                    No hay comprobantes pendientes. El flujo principal es Wompi automático.
                  </td>
                </tr>
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
                        <a
                          href={p.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00c896] hover:text-[#00e0a8]"
                        >
                          Ver imagen
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#8b9cad]">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Observaciones (rechazo)"
                        value={observaciones[p.id] || ''}
                        onChange={(e) => setObservaciones((o) => ({ ...o, [p.id]: e.target.value }))}
                        className="rounded bg-[#0f1419] border border-[#2d3a47] px-2 py-1 text-white text-xs w-full mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => aprobar(p.id)}
                          className="rounded bg-[#00c896] text-[#0f1419] text-xs font-semibold px-3 py-1 hover:bg-[#00e0a8]"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => rechazar(p.id)}
                          className="rounded bg-[#f87171]/20 text-[#f87171] text-xs font-semibold px-3 py-1 hover:bg-[#f87171]/30"
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
