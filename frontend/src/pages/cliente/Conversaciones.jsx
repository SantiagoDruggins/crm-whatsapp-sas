import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Conversaciones() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/crm/conversaciones').then((r) => setConversaciones(r.conversaciones || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando conversaciones...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Conversaciones</h1>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Contacto</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Teléfono</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Último mensaje</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {conversaciones.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">No hay conversaciones. Conecta WhatsApp para recibir mensajes.</td></tr>
            ) : (
              conversaciones.map((c) => (
                <tr key={c.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">{c.contacto_nombre || '—'} {c.contacto_apellidos || ''}</td>
                  <td className="px-4 py-3 text-[#8b9cad] font-mono">
                    {c.contacto_telefono ? (
                      <a href={`https://wa.me/${c.contacto_telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:text-[#00e0a8]">
                        {c.contacto_telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.estado || '—'}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.ultimo_mensaje_at ? new Date(c.ultimo_mensaje_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/conversaciones/${c.id}`} className="text-[#00c896] hover:text-[#00e0a8] text-sm">Ver historial</Link>
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
