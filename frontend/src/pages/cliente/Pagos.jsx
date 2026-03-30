import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ModalNequi from '../../components/ModalNequi';
import { NEQUI_PAGO, formatearNequiTelefono } from '../../lib/nequi';
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

const API_BASE = '/api';

async function postFormData(endpoint, formData) {
  const token = localStorage.getItem('token');
  const res = await fetch(endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

export default function Pagos() {
  const [planes, setPlanes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [wompiCfg, setWompiCfg] = useState(null);
  const [wompiSub, setWompiSub] = useState(null);
  const [wompiLoading, setWompiLoading] = useState(false);
  const [wompiMsg, setWompiMsg] = useState('');
  const [cardForm, setCardForm] = useState({ email: '', number: '', exp_month: '', exp_year: '', cvc: '', card_holder: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [form, setForm] = useState({ plan: '', monto: '', referencia: '' });
  const [archivo, setArchivo] = useState(null);
  const [modalNequi, setModalNequi] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/pagos/planes').then((r) => setPlanes(r.planes || [])),
      api.get('/pagos').then((r) => setPagos(r.pagos || [])),
      api.get('/wompi/config').then((r) => setWompiCfg(r)).catch(() => setWompiCfg(null)),
      api.get('/wompi/subscription/status').then((r) => setWompiSub(r.subscription || null)).catch(() => setWompiSub(null)),
    ]).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.plan?.trim() || !form.monto || Number(form.monto) < 0) return setError('Plan y monto son requeridos');
    if (!archivo) return setError('Debes subir la imagen del comprobante');
    setSubiendo(true);
    setError('');
    const fd = new FormData();
    fd.append('comprobante', archivo);
    fd.append('plan', form.plan.trim());
    fd.append('monto', String(form.monto));
    if (form.referencia?.trim()) fd.append('referencia', form.referencia.trim());
    postFormData('/pagos', fd)
      .then(() => { setForm({ plan: '', monto: '', referencia: '' }); setArchivo(null); load(); })
      .catch((e) => setError(e.message))
      .finally(() => setSubiendo(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

  const planExSeleccionado = planSeleccionado ? extrasPlanPorCodigo(planSeleccionado.codigo) : null;

  const planWompi = planSeleccionado && planSeleccionado.codigo !== 'demo' ? planSeleccionado : null;

  const ensureWompiJs = async (publicKey) => {
    if (typeof window === 'undefined') return '';
    if (window.$wompi && typeof window.$wompi.initialize === 'function') {
      return new Promise((resolve) => {
        window.$wompi.initialize((data, err) => resolve(err ? '' : (data?.sessionId || '')));
      });
    }
    const existing = document.querySelector('script[data-wompi-js="v1"]');
    if (existing) {
      return new Promise((resolve) => {
        const check = () => {
          if (window.$wompi && typeof window.$wompi.initialize === 'function') {
            window.$wompi.initialize((data, err) => resolve(err ? '' : (data?.sessionId || '')));
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    }
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.wompi.co/libs/js/v1.js';
      s.async = true;
      s.dataset.publicKey = publicKey;
      s.dataset.wompiJs = 'v1';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }).catch(() => {});
    if (window.$wompi && typeof window.$wompi.initialize === 'function') {
      return new Promise((resolve) => {
        window.$wompi.initialize((data, err) => resolve(err ? '' : (data?.sessionId || '')));
      });
    }
    return '';
  };

  const tokenizarTarjeta = async ({ publicKey, env }, card) => {
    const base = env === 'sandbox' ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
    const res = await fetch(`${base}/v1/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: String(card.number || '').replace(/\s+/g, ''),
        exp_month: String(card.exp_month || '').trim(),
        exp_year: String(card.exp_year || '').trim(),
        cvc: String(card.cvc || '').trim(),
        card_holder: String(card.card_holder || '').trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.reason || data?.error?.messages?.[0] || data?.error?.message || 'Error tokenizando tarjeta';
      throw new Error(msg);
    }
    const token = data?.data?.id;
    const status = data?.data?.status;
    if (!token || status !== 'CREATED') throw new Error('No se pudo tokenizar la tarjeta (estado inválido).');
    return token;
  };

  const handleWompiSubscribe = async () => {
    if (!planWompi?.codigo) return setError('Elige un plan primero.');
    if (!wompiCfg?.publicKey) return setError('Wompi no está configurado en el servidor.');
    setWompiLoading(true);
    setWompiMsg('');
    setError('');
    try {
      const sessionId = await ensureWompiJs(wompiCfg.publicKey);
      const token = await tokenizarTarjeta(
        { publicKey: wompiCfg.publicKey, env: wompiCfg.env },
        cardForm
      );
      const r = await api.post('/wompi/subscription/start', {
        plan_codigo: planWompi.codigo,
        payment_method_type: 'CARD',
        payment_method_token: token,
        customer_email: (cardForm.email || '').trim() || undefined,
        session_id: sessionId || undefined,
      });
      setWompiMsg(r.message || 'Listo. Esperando confirmación de pago.');
      const st = await api.get('/wompi/subscription/status').catch(() => ({}));
      setWompiSub(st.subscription || null);
    } catch (e) {
      setError(e.message || 'Error');
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pagos</h1>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      {wompiMsg && <p className="text-sm text-[#00c896] mb-4">{wompiMsg}</p>}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Planes disponibles</h2>
        <p className="text-[#8b9cad] text-sm mb-2">
          Compara cupos y elige el que encaje con tu equipo. Precios en COP; pago por Nequi.
        </p>
        <p className="text-white font-medium mb-1">Nequi: {formatearNequiTelefono()} — {NEQUI_PAGO.nombre}</p>
        <button
          type="button"
          onClick={() => setModalNequi(true)}
          className="text-[#00c896] text-sm hover:underline mb-4"
        >
          Ver datos de pago Nequi
        </button>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planes.length === 0 ? (
            <p className="text-[#8b9cad] col-span-full">No hay planes cargados. Contacta al administrador.</p>
          ) : (
            planes
              .filter((p) => p.codigo !== 'demo')
              .map((p) => {
                const ex = extrasPlanPorCodigo(p.codigo);
                const dia = precioAproxPorDia(p.precio_mensual);
                const selected = planSeleccionado?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanSeleccionado(p)}
                    className={`relative flex flex-col text-left rounded-xl border p-5 transition ${
                      ex.destacado ? 'bg-[#00c896]/5' : 'bg-[#1a2129]'
                    } ${
                      selected
                        ? 'border-[#00c896] shadow-[0_0_0_1px_rgba(0,200,150,0.4)]'
                        : 'border-[#2d3a47] hover:border-[#00c896]/60'
                    }`}
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
                      <span className="text-xs font-normal text-[#8b9cad]">COP / mes</span>
                    </p>
                    {dia ? <p className="text-[11px] text-[#6b7a8a]">~ ${dia} COP / día</p> : null}
                    <p className="mt-2 text-[10px] text-[#6b7a8a]">Código: {p.codigo}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#00c896]">
                      Elegir plan
                      <span className="inline-block h-2 w-2 rounded-full bg-[#00c896]/40 ring-1 ring-[#00c896]" />
                    </p>
                  </button>
                );
              })
          )}
        </div>
      </div>

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-8 max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Suscripción automática (Wompi)</h2>
        <p className="text-[#8b9cad] text-sm mb-3">
          Guarda tu tarjeta una sola vez y el plan se renueva automáticamente. El plan se activa cuando Wompi confirme el pago.
        </p>

        {planWompi ? (
          <div className="mb-3 text-sm text-[#cbd5e0]">
            Plan seleccionado: <span className="font-mono">{planWompi.codigo}</span> —{' '}
            <span className="text-white font-semibold">{planWompi.nombre}</span>
          </div>
        ) : (
          <p className="text-xs text-[#6b7a8a] mb-3">Primero elige un plan arriba para suscribirte.</p>
        )}

        {wompiSub ? (
          <div className="mb-4 rounded-xl border border-[#2d3a47] bg-[#0f1419] p-4 text-sm">
            <p className="text-[#8b9cad]">
              Estado: <span className="text-white font-mono">{wompiSub.status}</span>
            </p>
            <p className="text-[#8b9cad]">
              Próximo cobro: <span className="text-white font-mono">{wompiSub.next_charge_at ? new Date(wompiSub.next_charge_at).toLocaleString() : '—'}</span>
            </p>
            <p className="text-[#8b9cad]">
              Última transacción: <span className="text-white font-mono">{wompiSub.last_transaction_status || '—'}</span>
            </p>
            {wompiSub.last_error ? <p className="text-[#f87171] text-xs mt-2">{wompiSub.last_error}</p> : null}
            <button
              type="button"
              onClick={handleWompiCancel}
              disabled={wompiLoading}
              className="mt-3 rounded-lg bg-[#2d3a47] text-[#cbd5e0] px-3 py-2 text-sm hover:bg-[#3d4a57] disabled:opacity-50"
            >
              {wompiLoading ? 'Procesando...' : 'Cancelar suscripción'}
            </button>
          </div>
        ) : null}

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email del pagador (opcional)"
            value={cardForm.email}
            onChange={(e) => setCardForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
          />
          <input
            type="text"
            placeholder="Número de tarjeta"
            value={cardForm.number}
            onChange={(e) => setCardForm((f) => ({ ...f, number: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="MM"
              value={cardForm.exp_month}
              onChange={(e) => setCardForm((f) => ({ ...f, exp_month: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <input
              type="text"
              placeholder="YY"
              value={cardForm.exp_year}
              onChange={(e) => setCardForm((f) => ({ ...f, exp_year: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
            <input
              type="password"
              placeholder="CVC"
              value={cardForm.cvc}
              onChange={(e) => setCardForm((f) => ({ ...f, cvc: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            />
          </div>
          <input
            type="text"
            placeholder="Titular (como aparece en la tarjeta)"
            value={cardForm.card_holder}
            onChange={(e) => setCardForm((f) => ({ ...f, card_holder: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
          />
          <button
            type="button"
            onClick={handleWompiSubscribe}
            disabled={wompiLoading || !planWompi}
            className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50"
          >
            {wompiLoading ? 'Creando suscripción…' : 'Suscribirme con tarjeta (Wompi)'}
          </button>
          <p className="text-xs text-[#6b7a8a]">
            Importante: este formulario tokeniza tu tarjeta con Wompi (no se guarda en el CRM). En producción se recomienda usar el flujo más moderno de Wompi JS.
          </p>
        </div>

        <h2 className="text-lg font-semibold text-white mb-2">Subir comprobante (Nequi)</h2>
        <p className="text-[#8b9cad] text-sm mb-3">
          Paga a Nequi {formatearNequiTelefono()} — {NEQUI_PAGO.nombre}. Luego sube aquí la captura.
        </p>
        <button
          type="button"
          onClick={() => setModalNequi(true)}
          className="text-[#00c896] text-sm hover:underline mb-4"
        >
          Ver datos en popup
        </button>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Código del plan (ej: BASICO_MENSUAL)"
            value={form.plan}
            onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            required
          />
          <input
            type="number"
            placeholder="Monto pagado"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
            min="0"
            step="0.01"
            required
          />
          <input type="text" placeholder="Referencia (opcional)" value={form.referencia} onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
          <div>
            <label className="block text-sm text-[#8b9cad] mb-1">Comprobante (imagen) *</label>
            <input type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="w-full text-[#8b9cad] text-sm" />
          </div>
          <button type="submit" disabled={subiendo} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
            {subiendo ? 'Enviando...' : 'Enviar a revisión'}
          </button>
        </form>
        <p className="text-xs text-[#8b9cad] mt-3">Tu cuenta pasará a &quot;Pago en revisión&quot; hasta que el administrador apruebe.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Mis pagos</h2>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2d3a47]">
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Plan</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Monto</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-[#8b9cad] text-center">No hay pagos registrados.</td></tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id} className="border-b border-[#2d3a47]">
                    <td className="px-4 py-3 text-white">{p.plan}</td>
                    <td className="px-4 py-3 text-[#8b9cad]">${Number(p.monto).toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${p.estado === 'aprobado' ? 'bg-[#00c896]/20 text-[#00c896]' : p.estado === 'rechazado' ? 'bg-[#f87171]/20 text-[#f87171]' : 'bg-[#8b9cad]/20 text-[#8b9cad]'}`}>{p.estado}</span></td>
                    <td className="px-4 py-3 text-[#8b9cad]">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalNequi open={modalNequi} onClose={() => setModalNequi(false)} titulo="Datos para pagar por Nequi" />

      {planSeleccionado && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPlanSeleccionado(null)}
        >
          <div
            className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Confirmar plan</h2>
                <p className="text-xs text-[#8b9cad] mt-1">
                  Usaremos este plan para rellenar automáticamente el código y el monto del formulario de pago.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlanSeleccionado(null)}
                className="text-[#8b9cad] hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-[#2d3a47] bg-[#0f1419] p-4">
              <p className="text-sm font-semibold text-white">{planSeleccionado.nombre}</p>
              {planExSeleccionado?.tagline ? (
                <p className="mt-1 text-xs text-[#8b9cad]">{planExSeleccionado.tagline}</p>
              ) : null}
              <p className="mt-2 text-xs text-[#6b7a8a]">{textoLimitesPlan(planSeleccionado)}</p>
              <ul className="mt-3 space-y-1 text-xs text-[#c5d0dc]">
                {(planExSeleccionado?.features?.length ? planExSeleccionado.features : [planSeleccionado.descripcion]).map(
                  (f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[#00c896]" aria-hidden>
                        ✓
                      </span>
                      {f}
                    </li>
                  )
                )}
              </ul>
              <p className="mt-3 text-lg font-bold text-[#00c896]">
                ${Number(planSeleccionado.precio_mensual || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP{' '}
                <span className="text-xs font-normal text-[#8b9cad]">/ mes</span>
              </p>
              <p className="mt-1 text-xs text-[#8b9cad]">Código del plan: {planSeleccionado.codigo}</p>
            </div>

            <p className="text-xs text-[#8b9cad] mb-4">
              Este pago se aplicará a la empresa con la que has iniciado sesión en el panel. Solo necesitas elegir el plan y subir
              el comprobante de Nequi.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlanSeleccionado(null)}
                className="rounded-xl border border-[#2d3a47] px-4 py-2 text-sm text-[#8b9cad] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    plan: planSeleccionado.codigo || f.plan,
                    monto:
                      planSeleccionado.precio_mensual != null
                        ? String(planSeleccionado.precio_mensual)
                        : f.monto,
                  }));
                  setPlanSeleccionado(null);
                }}
                className="rounded-xl bg-[#00c896] text-[#0f1419] px-4 py-2 text-sm font-semibold hover:bg-[#00e0a8]"
              >
                Usar este plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
