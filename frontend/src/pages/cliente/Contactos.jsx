import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Contactos() {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '' });

  const load = () => {
    api.get('/crm/contactos').then((r) => setContactos(r.contactos || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    if (modal?.id) {
      api.patch(`/crm/contactos/${modal.id}`, { nombre: form.nombre, apellidos: form.apellidos, email: form.email || null, telefono: form.telefono || null, tags, notas: form.notas || null })
        .then(() => { setModal(null); setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '' }); load(); })
        .catch((e) => setError(e.message));
    } else {
      api.post('/crm/contactos', { nombre: form.nombre, apellidos: form.apellidos, email: form.email || null, telefono: form.telefono || null, tags, notas: form.notas || null })
        .then(() => { setModal(null); setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '' }); load(); })
        .catch((e) => setError(e.message));
    }
  };

  const openEdit = (c) => {
    setModal(c);
    setForm({ nombre: c.nombre || '', apellidos: c.apellidos || '', email: c.email || '', telefono: c.telefono || '', tags: (c.tags || []).join(', '), notas: c.notas || '' });
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando contactos...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Contactos</h1>
        <button onClick={() => { setModal({}); setForm({ nombre: '', apellidos: '', email: '', telefono: '', tags: '', notas: '' }); setError(''); }} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
          Nuevo contacto
        </button>
      </div>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Nombre</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Teléfono</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Tags</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">No hay contactos. Crea uno o conéctate a WhatsApp.</td></tr>
            ) : (
              contactos.map((c) => (
                <tr key={c.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">{c.nombre} {c.apellidos}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{(c.tags || []).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(c)} className="text-[#00c896] hover:text-[#00e0a8] text-sm">Editar</button>
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
            <h2 className="text-lg font-bold text-white mb-4">{modal.id ? 'Editar contacto' : 'Nuevo contacto'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" required />
              <input type="text" placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <input type="text" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <input type="text" placeholder="Tags (separados por coma)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <textarea placeholder="Notas" value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">Guardar</button>
                <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
