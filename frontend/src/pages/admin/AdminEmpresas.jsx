import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const ESTADOS = ['activa', 'suspendida', 'vencida', 'demo_activa', 'pago_en_revision'];
const TIPOS_DURACION = [
  { value: 'dias', label: 'Días' },
  { value: 'meses', label: 'Meses' },
  { value: 'años', label: 'Años' },
];
const PLANES = [
  { value: 'demo', label: 'Demo' },
  { value: 'BASICO_MENSUAL', label: 'Básico' },
  { value: 'PROFESIONAL_MENSUAL', label: 'Profesional' },
  { value: 'EMPRESARIAL_MENSUAL', label: 'Empresarial (Business)' },
  { value: 'MARCA_BLANCA_USD', label: 'Marca blanca (pago único)' },
];

function logoUrlCompleto(logoUrl) {
  if (!logoUrl || !String(logoUrl).trim()) return '';
  const u = String(logoUrl).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = import.meta.env.VITE_UPLOADS_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = u.startsWith('/') ? u : `/${u}`;
  if (path.startsWith('/uploads/')) return `${base}/api${path}`;
  return `${base}${path}`;
}

export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalPlan, setModalPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: '', tipo_duracion: 'meses', cantidad: 1, desde_hoy: true });
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [modalMb, setModalMb] = useState(null);
  const [mbForm, setMbForm] = useState({
    marca_blanca: false,
    marca_blanca_dominio: '',
    marca_blanca_nombre_publico: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [guardandoMb, setGuardandoMb] = useState(false);

  const load = () => {
    const q = filtroEstado ? `?estado=${filtroEstado}` : '';
    api.get(`/admin/empresas${q}`).then((r) => setEmpresas(r.empresas || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [filtroEstado]);

  const cambiarEstado = (id, estado) => {
    api.patch(`/admin/empresas/${id}/estado`, { estado }).then(() => load()).catch((e) => setError(e.message));
  };

  const abrirModalPlan = (e) => {
    const planActual = e.plan || 'demo';
    const existeEnLista = PLANES.some((p) => p.value === planActual);
    setModalPlan(e);
    setPlanForm({
      plan: existeEnLista ? planActual : 'demo',
      tipo_duracion: 'meses',
      cantidad: 1,
      desde_hoy: true,
    });
  };

  const abrirModalMb = (e) => {
    setModalMb(e);
    setLogoFile(null);
    setMbForm({
      marca_blanca: !!e.marca_blanca,
      marca_blanca_dominio: e.marca_blanca_dominio || '',
      marca_blanca_nombre_publico: e.marca_blanca_nombre_publico || '',
    });
  };

  const guardarMarcaBlanca = async (ev) => {
    ev.preventDefault();
    if (!modalMb?.id) return;
    setGuardandoMb(true);
    setError('');
    try {
      await api.patch(`/admin/empresas/${modalMb.id}/marca-blanca`, {
        marca_blanca: mbForm.marca_blanca,
        marca_blanca_dominio: mbForm.marca_blanca_dominio.trim() || null,
        marca_blanca_nombre_publico: mbForm.marca_blanca_nombre_publico.trim() || null,
      });
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await api.upload(`/admin/empresas/${modalMb.id}/logo`, fd);
      }
      setModalMb(null);
      setLogoFile(null);
      load();
    } catch (err) {
      setError(err.message || 'Error al guardar marca blanca');
    } finally {
      setGuardandoMb(false);
    }
  };

  const aplicarPlan = (ev) => {
    ev.preventDefault();
    if (!modalPlan?.id) return;
    setGuardandoPlan(true);
    api
      .patch(`/admin/empresas/${modalPlan.id}/plan`, {
        plan: planForm.plan || undefined,
        tipo_duracion: planForm.tipo_duracion,
        cantidad: Math.max(1, Number(planForm.cantidad) || 1),
        desde_hoy: !!planForm.desde_hoy,
      })
      .then(() => {
        setModalPlan(null);
        load();
      })
      .catch((err) => setError(err.message || 'Error al actualizar plan'))
      .finally(() => setGuardandoPlan(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando empresas...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Empresas</h1>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-xl bg-[#1a2129] border border-[#2d3a47] px-4 py-2 text-white text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">MB</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Plan</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Expiración</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-64">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-[#8b9cad] text-center">No hay empresas</td></tr>
            ) : (
              empresas.map((e) => (
                <tr key={e.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">{e.nombre}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{e.email}</td>
                  <td className="px-4 py-3">
                    {e.marca_blanca ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00c896]/20 text-[#8ff3d8] border border-[#00c896]/40">
                        MB
                      </span>
                    ) : (
                      <span className="text-[#5c6b7a] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-[#232d38] text-[#8b9cad]">{e.estado}</span></td>
                  <td className="px-4 py-3 text-[#8b9cad]">{e.plan || '—'}</td>
                  <td className="px-4 py-3 text-[#8b9cad] text-sm">{e.fecha_expiracion ? new Date(e.fecha_expiracion).toLocaleDateString() : (e.demo_expires_at ? new Date(e.demo_expires_at).toLocaleDateString() : '—')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={e.estado}
                        onChange={(ev) => cambiarEstado(e.id, ev.target.value)}
                        className="rounded bg-[#0f1419] border border-[#2d3a47] px-2 py-1 text-white text-xs"
                      >
                        {ESTADOS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => abrirModalPlan(e)}
                        className="rounded bg-[#00c896]/20 text-[#00c896] px-2 py-1 text-xs font-medium hover:bg-[#00c896]/30"
                      >
                        Plan / Expiración
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalMb(e)}
                        className="rounded bg-[#2d3a47] text-[#cbd5e0] px-2 py-1 text-xs font-medium hover:bg-[#3d4a57]"
                      >
                        Marca blanca
                      </button>
                      <Link
                        to={`/admin/empresas/${e.id}`}
                        className="rounded bg-[#1a2129] border border-[#2d3a47] text-[#00c896] px-2 py-1 text-xs font-medium hover:bg-[#232d38]"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMb !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !guardandoMb && setModalMb(null)}
        >
          <div
            className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-1">Marca blanca (super admin)</h2>
            <p className="text-sm text-[#8b9cad] mb-4">
              {modalMb.nombre} — {modalMb.email}
            </p>
            <form onSubmit={guardarMarcaBlanca} className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mbForm.marca_blanca}
                  onChange={(ev) => setMbForm((f) => ({ ...f, marca_blanca: ev.target.checked }))}
                  className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
                />
                <span className="text-sm text-white">Marca blanca activa</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nombre público (marca del cliente)</label>
                <input
                  type="text"
                  value={mbForm.marca_blanca_nombre_publico}
                  onChange={(ev) => setMbForm((f) => ({ ...f, marca_blanca_nombre_publico: ev.target.value }))}
                  placeholder="Ej. Mi Agencia CRM"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Dominio deseado (sin https)</label>
                <input
                  type="text"
                  value={mbForm.marca_blanca_dominio}
                  onChange={(ev) => setMbForm((f) => ({ ...f, marca_blanca_dominio: ev.target.value }))}
                  placeholder="crm.cliente.com"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white text-sm font-mono"
                />
                <p className="text-[11px] text-[#6b7a8a] mt-1">
                  Queda guardado para tu checklist. El enrutamiento por dominio propio en el mismo VPS requiere DNS + nginx (manual).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Logo (opcional)</label>
                {modalMb.logo_url ? (
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={logoUrlCompleto(modalMb.logo_url)}
                      alt=""
                      className="h-10 w-auto max-w-[140px] object-contain rounded border border-[#2d3a47] bg-[#0f1419]"
                    />
                    <span className="text-xs text-[#6b7a8a] truncate max-w-[200px]">{modalMb.logo_url}</span>
                  </div>
                ) : null}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(ev) => setLogoFile(ev.target.files?.[0] || null)}
                  className="w-full text-sm text-[#8b9cad] file:mr-3 file:rounded-lg file:border-0 file:bg-[#2d3a47] file:px-3 file:py-1.5 file:text-white"
                />
                {logoFile ? <p className="text-xs text-[#00c896] mt-1">Nuevo: {logoFile.name}</p> : null}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={guardandoMb}
                  className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50"
                >
                  {guardandoMb ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMb(null)}
                  disabled={guardandoMb}
                  className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPlan !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !guardandoPlan && setModalPlan(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-2">Cuadrar plan y expiración</h2>
            <p className="text-sm text-[#8b9cad] mb-4">{modalPlan.nombre} — {modalPlan.email}</p>
            <form onSubmit={aplicarPlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Tipo de plan</label>
                <select
                  value={planForm.plan}
                  onChange={(e) => setPlanForm((f) => ({ ...f, plan: e.target.value }))}
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                >
                  {PLANES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8b9cad] mb-1">Duración</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.cantidad}
                    onChange={(e) => setPlanForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#8b9cad] mb-1">Unidad</label>
                  <select
                    value={planForm.tipo_duracion}
                    onChange={(e) => setPlanForm((f) => ({ ...f, tipo_duracion: e.target.value }))}
                    className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
                  >
                    {TIPOS_DURACION.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.desde_hoy}
                  onChange={(e) => setPlanForm((f) => ({ ...f, desde_hoy: e.target.checked }))}
                  className="rounded border-[#2d3a47] bg-[#0f1419] text-[#00c896]"
                />
                <span className="text-sm text-[#8b9cad]">Desde hoy (si no, se suma a la fecha de expiración actual)</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardandoPlan} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
                  {guardandoPlan ? 'Guardando...' : 'Aplicar'}
                </button>
                <button type="button" onClick={() => setModalPlan(null)} disabled={guardandoPlan} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">
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
