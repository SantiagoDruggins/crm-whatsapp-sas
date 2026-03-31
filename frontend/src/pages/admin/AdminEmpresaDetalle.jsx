import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

function logoUrlCompleto(logoUrl) {
  if (!logoUrl || !String(logoUrl).trim()) return '';
  const u = String(logoUrl).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = import.meta.env.VITE_UPLOADS_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = u.startsWith('/') ? u : `/${u}`;
  if (path.startsWith('/uploads/')) return `${base}/api${path}`;
  return `${base}${path}`;
}

export default function AdminEmpresaDetalle() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notas, setNotas] = useState('');
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [notasMsg, setNotasMsg] = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    api
      .get(`/admin/empresas/${id}`)
      .then((r) => {
        setData(r);
        setNotas(r.empresa?.admin_notas_internas || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const guardarNotas = (e) => {
    e.preventDefault();
    if (!id) return;
    setGuardandoNotas(true);
    setNotasMsg('');
    api
      .patch(`/admin/empresas/${id}/notas`, { admin_notas_internas: notas })
      .then(() => {
        setNotasMsg('Notas guardadas.');
        load();
      })
      .catch((err) => setError(err.message))
      .finally(() => setGuardandoNotas(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando empresa...</p>;
  if (error && !data) return <p className="text-[#f87171]">{error}</p>;
  if (!data?.empresa) return <p className="text-[#8b9cad]">No encontrada.</p>;

  const { empresa, metricas, wompi_subscription, wompi_transactions, pagos_manuales } = data;
  const waOk = empresa.whatsapp_token_configurado && (empresa.whatsapp_cloud_phone_number_id || empresa.whatsapp_waba_id);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link to="/admin/empresas" className="text-sm text-[#00c896] hover:underline">
          ← Volver a empresas
        </Link>
      </div>

      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{empresa.nombre}</h1>
          <p className="text-[#8b9cad] text-sm mt-1">{empresa.email}</p>
          <p className="text-xs text-[#6b7a8a] font-mono mt-2">ID: {empresa.id}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {empresa.logo_url ? (
            <img
              src={logoUrlCompleto(empresa.logo_url)}
              alt=""
              className="h-12 w-auto max-w-[160px] object-contain rounded border border-[#2d3a47] bg-[#0f1419]"
            />
          ) : null}
          {empresa.marca_blanca ? (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-[#00c896]/20 text-[#8ff3d8] border border-[#00c896]/40">
              Marca blanca
            </span>
          ) : null}
          <span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#cbd5e0]">{empresa.estado}</span>
          <span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#8b9cad]">{empresa.plan || '—'}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Uso (aprox.)</h2>
          <ul className="space-y-2 text-sm text-[#8b9cad]">
            <li>
              Contactos: <span className="text-white font-mono">{metricas?.contactos ?? 0}</span>
            </li>
            <li>
              Usuarios activos: <span className="text-white font-mono">{metricas?.usuarios_activos ?? 0}</span>
            </li>
            <li>
              Conversaciones (7 días): <span className="text-white font-mono">{metricas?.conversaciones_7d ?? 0}</span>
            </li>
            <li>
              Pedidos (7 días): <span className="text-white font-mono">{metricas?.pedidos_7d ?? 0}</span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Plan y fechas</h2>
          <ul className="space-y-2 text-sm text-[#8b9cad]">
            <li>
              Expiración:{' '}
              <span className="text-white">
                {empresa.fecha_expiracion ? new Date(empresa.fecha_expiracion).toLocaleString() : '—'}
              </span>
            </li>
            <li>
              Demo hasta:{' '}
              <span className="text-white">
                {empresa.demo_expires_at ? new Date(empresa.demo_expires_at).toLocaleString() : '—'}
              </span>
            </li>
            {empresa.marca_blanca_pagado_at ? (
              <li>
                Marca blanca pagada:{' '}
                <span className="text-white">{new Date(empresa.marca_blanca_pagado_at).toLocaleString()}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Marca blanca / dominio</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm text-[#8b9cad]">
          <div>
            <dt className="text-[#6b7a8a]">Nombre público</dt>
            <dd className="text-white">{empresa.marca_blanca_nombre_publico || '—'}</dd>
          </div>
          <div>
            <dt className="text-[#6b7a8a]">Dominio deseado</dt>
            <dd className="text-white font-mono text-xs">{empresa.marca_blanca_dominio || '—'}</dd>
          </div>
        </dl>
        <p className="text-xs text-[#6b7a8a] mt-3">
          Edición rápida desde la tabla de empresas: botón <strong className="text-[#cbd5e0]">Marca blanca</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">WhatsApp Cloud</h2>
        <p className="text-sm text-[#8b9cad] mb-2">
          Estado:{' '}
          <span className={waOk ? 'text-[#00c896]' : 'text-[#fbbf24]'}>{waOk ? 'Configurado (token + id)' : 'Incompleto o sin token'}</span>
        </p>
        <ul className="text-xs font-mono text-[#6b7a8a] space-y-1">
          <li>phone_number_id: {empresa.whatsapp_cloud_phone_number_id || '—'}</li>
          <li>waba_id: {empresa.whatsapp_waba_id || '—'}</li>
        </ul>
      </div>

      {wompi_subscription ? (
        <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 mb-8">
          <h2 className="text-sm font-semibold text-white mb-3">Suscripción Wompi</h2>
          <pre className="text-xs text-[#8b9cad] overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(
              {
                plan_codigo: wompi_subscription.plan_codigo,
                status: wompi_subscription.status,
                next_charge_at: wompi_subscription.next_charge_at,
                last_transaction_status: wompi_subscription.last_transaction_status,
              },
              null,
              2
            )}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Últimos cobros Wompi</h2>
        {wompi_transactions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2d3a47] text-[#6b7a8a]">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {wompi_transactions.map((t) => (
                  <tr key={t.id} className="border-b border-[#2d3a47]/60 text-[#cbd5e0]">
                    <td className="py-2 pr-2 whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-2 font-mono">{t.plan_codigo || '—'}</td>
                    <td className="py-2 pr-2">
                      ${((Number(t.amount_cents) || 0) / 100).toLocaleString('es-CO')} {t.currency || 'COP'}
                    </td>
                    <td className="py-2">{t.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#6b7a8a]">Sin transacciones Wompi.</p>
        )}
      </div>

      <div className="rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Pagos manuales (legacy)</h2>
        {pagos_manuales?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2d3a47] text-[#6b7a8a]">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos_manuales.map((p) => (
                  <tr key={p.id} className="border-b border-[#2d3a47]/60 text-[#cbd5e0]">
                    <td className="py-2 pr-2 whitespace-nowrap">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-2">{p.plan || '—'}</td>
                    <td className="py-2 pr-2">${Number(p.monto || 0).toLocaleString('es-CO')}</td>
                    <td className="py-2">{p.estado || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#6b7a8a]">Sin pagos manuales.</p>
        )}
      </div>

      <div className="rounded-xl border border-[#00c896]/30 bg-[#0f1419] p-5">
        <h2 className="text-sm font-semibold text-white mb-2">Notas internas (solo super admin)</h2>
        <p className="text-xs text-[#6b7a8a] mb-3">No las ve el cliente. Úsalas para seguimiento, acuerdos de dominio, etc.</p>
        <form onSubmit={guardarNotas} className="space-y-3">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={6}
            className="w-full rounded-xl bg-[#1a2129] border border-[#2d3a47] px-4 py-3 text-sm text-white placeholder-[#6b7a8a]"
            placeholder="Escribe notas internas..."
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={guardandoNotas}
              className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 text-sm hover:bg-[#00e0a8] disabled:opacity-50"
            >
              {guardandoNotas ? 'Guardando...' : 'Guardar notas'}
            </button>
            {notasMsg ? <span className="text-xs text-[#00c896]">{notasMsg}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
