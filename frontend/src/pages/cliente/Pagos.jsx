import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { extrasPlanPorCodigo, precioAproxPorDia } from '../../lib/planPresentacion';

function textoLimitesPlan(p) {
  const u =
    p.max_usuarios != null
      ? `${Number(p.max_usuarios)} usuario${Number(p.max_usuarios) === 1 ? '' : 's'}`
      : 'Usuarios ilimitados';
  const c =
    p.max_contactos != null
      ? `hasta ${Number(p.max_contactos).toLocaleString('es-CO')} contactos`
      : 'Contactos ilimitados';
  return `${u} · ${c}`;
}

function getWidgetCheckoutClass() {
  if (typeof window === 'undefined') return null;
  return window.WidgetCheckout || window.widgetCheckout || null;
}

export default function Pagos() {
  const [planes, setPlanes] = useState([]);
  const [pagosManual, setPagosManual] = useState([]);
  const [wompiTx, setWompiTx] = useState([]);
  const [wompiCfg, setWompiCfg] = useState(null);
  const [wompiSub, setWompiSub] = useState(null);
  const [wompiLoading, setWompiLoading] = useState(false);
  const [wompiMsg, setWompiMsg] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planResaltado, setPlanResaltado] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/pagos/planes').then((r) => setPlanes(r.planes || [])),
      api.get('/pagos').then((r) => setPagosManual(r.pagos || [])).catch(() => setPagosManual([])),
      api.get('/wompi/transactions').then((r) => setWompiTx(r.transactions || [])).catch(() => setWompiTx([])),
      api.get('/wompi/config').then((r) => setWompiCfg(r)).catch(() => setWompiCfg(null)),
      api.get('/wompi/subscription/status').then((r) => setWompiSub(r.subscription || null)).catch(() => setWompiSub(null)),
      api.get('/auth/me').then((r) => setPayerEmail((r.usuario && r.usuario.email) || '')).catch(() => {}),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const historialUnificado = useMemo(() => {
    const manual = (pagosManual || []).map((p) => ({
      key: `m-${p.id}`,
      fecha: p.created_at,
      origen: 'Comprobante manual',
      plan: p.plan,
      montoCop: Number(p.monto) || 0,
      estado: String(p.estado || '').toLowerCase(),
      estadoLabel: p.estado,
    }));
    const w = (wompiTx || []).map((t) => {
      const st = String(t.status || '—');
      const stLower = st.toLowerCase();
      return {
        key: `w-${t.id}`,
        fecha: t.created_at,
        origen: 'Wompi',
        plan: t.plan_codigo || '—',
        montoCop: (Number(t.amount_cents) || 0) / 100,
        estado: stLower,
        estadoLabel: st,
      };
    });
    return [...manual, ...w].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pagosManual, wompiTx]);

  const ensureWidgetScript = () =>
    new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Solo en navegador'));
      if (getWidgetCheckoutClass()) return resolve();
      const existing = document.querySelector('script[data-wompi-widget="1"]');
      if (existing) {
        const t0 = Date.now();
        const poll = () => {
          if (getWidgetCheckoutClass()) return resolve();
          if (Date.now() - t0 > 12000) return reject(new Error('No se cargó el widget de Wompi. Recarga la página e inténtalo de nuevo.'));
          setTimeout(poll, 50);
        };
        poll();
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.wompi.co/widget.js';
      s.async = true;
      s.dataset.wompiWidget = '1';
      s.onload = () => {
        if (getWidgetCheckoutClass()) resolve();
        else reject(new Error('Script de Wompi cargado sin WidgetCheckout'));
      };
      s.onerror = () => reject(new Error('No se pudo cargar checkout.wompi.co (red o bloqueo).'));
      document.body.appendChild(s);
    });

  const abrirCheckoutWompi = async (plan) => {
    if (!plan?.codigo || plan.codigo === 'demo') return;
    if (!wompiCfg?.publicKey) {
      setError('Wompi no está configurado en el servidor.');
      return;
    }
    if (!wompiCfg?.widgetCheckoutEnabled) {
      setError(
        'Falta WOMPI_INTEGRITY_SECRET en el servidor. Configura el secreto de integridad en Wompi y en el .env del backend.'
      );
      return;
    }
    const email = (payerEmail || '').trim();
    if (!email) {
      setError('Indica tu email abajo para el recibo de Wompi (o actualízalo en Mi cuenta).');
      return;
    }
    setWompiLoading(true);
    setWompiMsg('');
    setError('');
    setPlanResaltado(plan);
    try {
      await ensureWidgetScript();
      const WC = getWidgetCheckoutClass();
      if (!WC) throw new Error('WidgetCheckout no está disponible.');

      const { widget } = await api.post('/wompi/subscription/widget-checkout', {
        plan_codigo: plan.codigo,
        customer_email: email,
      });

      const checkout = new WC({
        currency: widget.currency,
        amountInCents: widget.amountInCents,
        reference: widget.reference,
        publicKey: widget.publicKey,
        signature: widget.signature,
        redirectUrl: widget.redirectUrl || undefined,
        customerData: widget.customerData || { email },
      });

      checkout.open((result) => {
        if (result?.transaction?.id) {
          setWompiMsg(
            'Pago enviado. Si Wompi lo aprueba, tu plan se activará en breve (puedes actualizar esta página).'
          );
          Promise.all([
            api.get('/wompi/subscription/status').then((st) => setWompiSub(st.subscription || null)),
            api.get('/wompi/transactions').then((r) => setWompiTx(r.transactions || [])),
          ]).catch(() => {});
        }
      });
    } catch (e) {
      setError(e.message || 'Error al iniciar el pago');
    } finally {
      setWompiLoading(false);
    }
  };

  const handleWompiCancel = async () => {
    setWompiLoading(true);
    setWompiMsg('');
    setError('');
    try {
      const r = await api.post('/wompi/subscription/cancel', {});
      setWompiMsg(r.message || 'Cancelada.');
      const st = await api.get('/wompi/subscription/status').catch(() => ({}));
      setWompiSub(st.subscription || null);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setWompiLoading(false);
    }
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

  const wompiListo = !!(wompiCfg?.publicKey && wompiCfg?.widgetCheckoutEnabled);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Pagos</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Elige un plan: se abre el checkout seguro de Wompi. Aquí solo verás el historial de tus cobros.
      </p>

      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      {wompiMsg && <p className="text-sm text-[#00c896] mb-4">{wompiMsg}</p>}

      <div className="mb-6 max-w-xl">
        <label className="block text-xs text-[#8b9cad] mb-1">Email para recibo y Wompi</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="correo@ejemplo.com"
          value={payerEmail}
          onChange={(e) => setPayerEmail(e.target.value)}
          className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2.5 text-white placeholder-[#6b7a8a]"
        />
        <p className="text-[11px] text-[#6b7a8a] mt-1">
          Debe coincidir con un correo válido. Puedes editarlo también en{' '}
          <Link to="/dashboard/mi-cuenta" className="text-[#00c896] hover:underline">
            Mi cuenta
          </Link>
          .
        </p>
      </div>

      {!wompiCfg?.widgetCheckoutEnabled && wompiCfg?.publicKey ? (
        <p className="text-xs text-[#fbbf24] mb-6 max-w-xl">
          El administrador debe configurar <span className="font-mono">WOMPI_INTEGRITY_SECRET</span> en el backend para activar
          el pago con tarjeta.
        </p>
      ) : null}

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Planes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planes.length === 0 ? (
            <p className="text-[#8b9cad] col-span-full">No hay planes cargados. Contacta al administrador.</p>
          ) : (
            planes
              .filter((p) => p.codigo !== 'demo')
              .sort((a, b) => {
                const ua = !!a.es_pago_unico;
                const ub = !!b.es_pago_unico;
                if (ua !== ub) return ua ? 1 : -1;
                return Number(a.precio_mensual || 0) - Number(b.precio_mensual || 0);
              })
              .map((p) => {
                const ex = extrasPlanPorCodigo(p.codigo);
                const dia = p.es_pago_unico ? null : precioAproxPorDia(p.precio_mensual);
                const resaltado = planResaltado?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-xl border p-5 transition ${
                      ex.destacado ? 'bg-[#00c896]/5' : 'bg-[#1a2129]'
                    } ${resaltado ? 'border-[#00c896] shadow-[0_0_0_1px_rgba(0,200,150,0.4)]' : 'border-[#2d3a47]'}`}
                  >
                    {ex.destacado ? (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-[#00c896] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f1419]">
                        Popular
                      </span>
                    ) : ex.badge ? (
                      <span className="mb-1 inline-flex w-fit rounded-full border border-[#3d4f63] px-2 py-0.5 text-[10px] font-medium text-[#b8c5d6]">
                        {ex.badge}
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold text-white">{p.nombre}</h3>
                    {ex.tagline ? <p className="mt-0.5 text-xs text-[#8b9cad]">{ex.tagline}</p> : null}
                    <p className="mt-2 text-xs text-[#6b7a8a]">{textoLimitesPlan(p)}</p>
                    <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-xs text-[#c5d0dc]">
                      {(ex.features.length ? ex.features : [p.descripcion]).slice(0, 5).map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className="shrink-0 text-[#00c896]" aria-hidden>
                            ✓
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-lg font-bold text-[#00c896]">
                      ${Number(p.precio_mensual || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}{' '}
                      <span className="text-xs font-normal text-[#8b9cad]">
                        COP {p.es_pago_unico ? '(pago único)' : '/ mes'}
                      </span>
                    </p>
                    {dia ? <p className="text-[11px] text-[#6b7a8a]">~ ${dia} COP / día</p> : null}
                    {p.es_pago_unico ? (
                      <p className="text-[11px] text-[#6b7a8a] mt-1">Sin cobro recurrente automático tras la compra.</p>
                    ) : null}
                    <button
                      type="button"
                      disabled={wompiLoading || !wompiListo}
                      onClick={() => void abrirCheckoutWompi(p)}
                      className="mt-4 w-full rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-3 text-sm hover:bg-[#00e0a8] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {wompiLoading ? 'Abriendo pago…' : p.es_pago_unico ? 'Pagar con Wompi (único)' : 'Pagar con Wompi'}
                    </button>
                    {!wompiListo ? (
                      <p className="text-[10px] text-[#6b7a8a] mt-2 text-center">Configuración Wompi incompleta</p>
                    ) : null}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {wompiSub ? (
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-8 max-w-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Tu suscripción Wompi</h2>
          <p className="text-[#8b9cad] text-sm mb-3">
            Estado:{' '}
            <span className="text-white font-mono">
              {wompiSub.status === 'pending_checkout' ? 'Esperando pago' : wompiSub.status}
            </span>
          </p>
          <p className="text-[#8b9cad] text-sm">
            Próximo cobro:{' '}
            <span className="text-white font-mono">
              {wompiSub.next_charge_at
                ? new Date(wompiSub.next_charge_at).toLocaleString()
                : wompiSub.plan_codigo === 'MARCA_BLANCA_USD'
                  ? 'No aplica (plan de pago único)'
                  : '—'}
            </span>
          </p>
          <p className="text-[#8b9cad] text-sm mt-1">
            Última transacción: <span className="text-white font-mono">{wompiSub.last_transaction_status || '—'}</span>
          </p>
          {wompiSub.last_error ? <p className="text-[#f87171] text-xs mt-2">{wompiSub.last_error}</p> : null}
          <button
            type="button"
            onClick={handleWompiCancel}
            disabled={wompiLoading}
            className="mt-4 rounded-lg bg-[#2d3a47] text-[#cbd5e0] px-3 py-2 text-sm hover:bg-[#3d4a57] disabled:opacity-50"
          >
            {wompiLoading ? 'Procesando...' : 'Cancelar suscripción en el CRM'}
          </button>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Historial de pagos</h2>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2d3a47]">
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Fecha</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Origen</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Plan</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Monto</th>
                <th className="px-4 py-3 text-[#8b9cad] font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historialUnificado.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">
                    Aún no hay pagos registrados.
                  </td>
                </tr>
              ) : (
                historialUnificado.map((row) => (
                  <tr key={row.key} className="border-b border-[#2d3a47]">
                    <td className="px-4 py-3 text-[#8b9cad] whitespace-nowrap">
                      {row.fecha ? new Date(row.fecha).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#cbd5e0]">{row.origen}</td>
                    <td className="px-4 py-3 text-white font-mono text-xs">{row.plan}</td>
                    <td className="px-4 py-3 text-[#8b9cad]">
                      ${Number(row.montoCop).toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          row.estado === 'aprobado' || row.estado === 'approved'
                            ? 'bg-[#00c896]/20 text-[#00c896]'
                            : row.estado === 'rechazado' || row.estado === 'declined'
                              ? 'bg-[#f87171]/20 text-[#f87171]'
                              : 'bg-[#8b9cad]/20 text-[#8b9cad]'
                        }`}
                      >
                        {row.estadoLabel || row.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
