import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Conversaciones() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [waStatus, setWaStatus] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/crm/conversaciones'),
      api.get('/whatsapp/status').catch(() => ({})),
    ])
      .then(([r, s]) => {
        setConversaciones(r.conversaciones || []);
        setWaStatus(s && typeof s === 'object' ? s : null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Aviso</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Último mensaje</th>
              <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {conversaciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[#8b9cad] text-center">
                  <p className="mb-3">No hay conversaciones aún.</p>
                  {!waStatus?.configurado ? (
                    <p>
                      Conecta WhatsApp en{' '}
                      <Link to="/dashboard/whatsapp" className="text-[#00c896] hover:underline">
                        WhatsApp Cloud API
                      </Link>{' '}
                      para recibir mensajes.
                    </p>
                  ) : (
                    <div className="max-w-xl mx-auto text-left text-sm space-y-2">
                      <p>
                        El envío de prueba puede funcionar aunque <strong className="text-[#cbd5e0]">no entren</strong> los mensajes: hace falta que Meta llame al{' '}
                        <strong className="text-[#cbd5e0]">webhook</strong> y que el <strong className="text-[#cbd5e0]">Phone number ID</strong> guardado sea el mismo que Meta envía.
                      </p>
                      {waStatus.whatsappPhoneNumberId ? (
                        <p className="font-mono text-xs text-[#cbd5e0] break-all">
                          Phone number ID en el CRM: {waStatus.whatsappPhoneNumberId}
                        </p>
                      ) : null}
                      {waStatus.whatsappWabaId ? (
                        <p className="font-mono text-xs text-[#6b7a8a] break-all">
                          WABA (cuenta WhatsApp Business en Meta): {waStatus.whatsappWabaId}
                        </p>
                      ) : null}
                      <p>
                        Comprueba en Meta (WhatsApp → Configuración → webhook) que <code className="text-[#8b9cad]">messages</code> esté suscrito. En el número de WhatsApp, el ID debe coincidir con el de arriba. Si no, vuelve a conectar o pide en{' '}
                        <Link to="/dashboard/whatsapp" className="text-[#00c896] hover:underline">
                          WhatsApp Cloud API
                        </Link>
                        .
                      </p>
                      <p className="text-xs text-[#6b7a8a]">
                        Si el número de la línea está en datos de la empresa (<code className="text-[#8b9cad]">telefono_whatsapp</code>), el servidor puede enlazar el webhook aunque el ID estuviera desfasado. Si tienes varios números en la misma cuenta, vuelve a conectar WhatsApp para guardar el WABA o revisa que el Phone number ID coincida con el número en WhatsApp → API de la nube.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              conversaciones.map((c) => (
                <tr key={c.id} className={`border-b border-[#2d3a47] hover:bg-[#232d38]/50 ${c.pide_agente_humano ? 'bg-amber-500/10' : ''}`}>
                  <td className="px-4 py-3 text-white">{c.contacto_nombre || '—'} {c.contacto_apellidos || ''}</td>
                  <td className="px-4 py-3 text-[#8b9cad] font-mono">
                    {c.contacto_telefono ? (
                      <a href={`https://wa.me/${c.contacto_telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:text-[#00e0a8]">
                        {c.contacto_telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#8b9cad]">{c.estado || '—'}</td>
                  <td className="px-4 py-3">
                    {c.pide_agente_humano ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-xs font-medium" title="El cliente pidió hablar con una persona">
                        Pide agente
                      </span>
                    ) : '—'}
                  </td>
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
