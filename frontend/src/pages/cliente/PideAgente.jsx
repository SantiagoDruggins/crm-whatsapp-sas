import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function PideAgente() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/crm/conversaciones?pide_agente=1&limit=100')
      .then((r) => setConversaciones(r.conversaciones || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Solicitan hablar con un humano</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Conversaciones en las que el cliente pidió hablar con una persona o agente. Atiéndelas desde aquí o en Conversaciones.
      </p>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Contacto</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Teléfono</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Último mensaje</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {conversaciones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[#8b9cad] text-center">
                  Nadie está pidiendo agente en este momento. Cuando un cliente solicite hablar con una persona, aparecerá aquí.
                </td>
              </tr>
            ) : (
              conversaciones.map((c) => (
                <tr key={c.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50 bg-amber-500/5">
                  <td className="px-4 py-3 text-white">{c.contacto_nombre || '—'} {c.contacto_apellidos || ''}</td>
                  <td className="px-4 py-3 text-[#8b9cad] font-mono">
                    {c.contacto_telefono ? (
                      <a href={`https://wa.me/${c.contacto_telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:text-[#00e0a8]">
                        {c.contacto_telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.ultimo_mensaje_at ? new Date(c.ultimo_mensaje_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/conversaciones/${c.id}`} className="text-[#00c896] hover:text-[#00e0a8] text-sm">Atender</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-[#6b7a8a]">
        <Link to="/dashboard/conversaciones" className="text-[#00c896] hover:underline">Ver todas las conversaciones</Link>
      </p>
    </div>
  );
}
