import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STATUS_LABELS = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};

export default function Agenda() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setLoading(true);
    api
      .get('/crm/appointments')
      .then((r) => {
        setAppointments(Array.isArray(r?.appointments) ? r.appointments : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando agenda...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Agenda / Citas</h1>
      <p className="text-[#8b9cad] text-sm mb-4">
        Citas agendadas con tus contactos. Si el bot agenda una cita en el chat, aparecerá aquí cuando se registre en el sistema.
      </p>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2d3a47]">
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Contacto</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Teléfono</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Fecha</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Hora</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">
                  No hay citas. Crea una desde Contactos (editar contacto) o cuando el bot registre una cita en la conversación.
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a.id} className="border-b border-[#2d3a47] hover:bg-[#232d38]/50">
                  <td className="px-4 py-3 text-white">
                    {[a.contacto_nombre, a.contacto_apellidos].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] font-mono">
                    {a.contacto_telefono ? (
                      <a
                        href={`https://wa.me/${String(a.contacto_telefono).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00c896] hover:text-[#00e0a8]"
                      >
                        {a.contacto_telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-[#8b9cad]">{a.time || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#232d38] text-[#8b9cad]">
                      {STATUS_LABELS[a.status] || a.status || 'Programada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad] max-w-[200px] truncate" title={a.notes}>
                    {a.notes || '—'}
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
