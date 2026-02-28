import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ModalNequi from '../../components/ModalNequi';
import { NEQUI_PAGO, formatearNequiTelefono } from '../../lib/nequi';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [form, setForm] = useState({ plan: '', monto: '', referencia: '' });
  const [archivo, setArchivo] = useState(null);
  const [modalNequi, setModalNequi] = useState(false);

  const load = () => {
    Promise.all([
      api.get('/pagos/planes').then((r) => setPlanes(r.planes || [])),
      api.get('/pagos').then((r) => setPagos(r.pagos || [])),
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pagos</h1>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Planes disponibles</h2>
        <p className="text-[#8b9cad] text-sm mb-2">Precios en COP (Colombia). Pago por Nequi.</p>
        <p className="text-white font-medium mb-1">Nequi: {formatearNequiTelefono()} — {NEQUI_PAGO.nombre}</p>
        <button type="button" onClick={() => setModalNequi(true)} className="text-[#00c896] text-sm hover:underline mb-4">Ver datos de pago Nequi</button>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planes.length === 0 ? (
            <p className="text-[#8b9cad] col-span-full">No hay planes cargados. Contacta al administrador.</p>
          ) : (
            planes.filter((p) => p.codigo !== 'demo').map((p) => (
              <div key={p.id} className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
                <h3 className="text-white font-semibold">{p.nombre}</h3>
                <p className="text-[#8b9cad] text-sm">{p.descripcion}</p>
                <p className="text-[#00c896] font-bold mt-2">${Number(p.precio_mensual || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP / mes</p>
                <p className="text-xs text-[#8b9cad]">Código: {p.codigo}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 mb-8 max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Subir comprobante (Nequi)</h2>
        <p className="text-[#8b9cad] text-sm mb-3">Paga a Nequi {formatearNequiTelefono()} — {NEQUI_PAGO.nombre}. Luego sube aquí la captura.</p>
        <button type="button" onClick={() => setModalNequi(true)} className="text-[#00c896] text-sm hover:underline mb-4">Ver datos en popup</button>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Código del plan (ej: BASICO_MENSUAL)" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" required />
          <input type="number" placeholder="Monto pagado" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" min="0" step="0.01" required />
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
    </div>
  );
}
