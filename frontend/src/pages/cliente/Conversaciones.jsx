import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { contactAssetUrl, contactInitials, hueFromPhone } from '../../lib/contactVisual';

const LEAD_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interested: 'Interesado',
  warm: 'Cálido',
  hot: 'Caliente',
  scheduled: 'Agendado',
  buyer: 'Comprador',
  converted: 'Convertido',
  lost: 'Perdido',
};

function tiempoRelativo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return d.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function snippetTexto(text, max = 56) {
  if (!text || typeof text !== 'string') return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function ListaAvatar({ conversacion: c }) {
  const [imgErr, setImgErr] = useState(false);
  const nombreCompleto = [c.contacto_nombre, c.contacto_apellidos].filter(Boolean).join(' ').trim();
  const displayName = nombreCompleto || c.contacto_telefono || 'Contacto';
  const telefono = c.contacto_telefono || '';
  const initials = contactInitials({
    nombreCompleto: displayName,
    telefono,
  });
  const hue = hueFromPhone(telefono);
  const src = c.contacto_avatar_url && !imgErr ? contactAssetUrl(c.contacto_avatar_url) : '';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-11 h-11 rounded-full object-cover border border-[#2d3a47] shrink-0 bg-[#232d38]"
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 border border-[#2d3a47]/50"
      style={{ background: `linear-gradient(145deg, hsl(${hue}, 48%, 36%), hsl(${hue}, 42%, 24%))` }}
      title={displayName}
    >
      {initials}
    </div>
  );
}

export default function Conversaciones() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [waStatus, setWaStatus] = useState(null);

  const fetchLista = useCallback(() => {
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

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  useEffect(() => {
    const LISTA_POLL_MS = 5000;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      api
        .get('/crm/conversaciones')
        .then((r) => setConversaciones(r.conversaciones || []))
        .catch(() => {});
    };
    const interval = setInterval(tick, LISTA_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando conversaciones...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Conversaciones</h1>
      <p className="text-sm text-[#6b7a8a] mb-4 max-w-2xl">
        Cada fila muestra foto (si la subes en Contactos) o un avatar con color único por número. WhatsApp Cloud no envía la foto de perfil del cliente por privacidad; puedes asignar foto desde{' '}
        <Link to="/dashboard/contactos" className="text-[#00c896] hover:underline">
          Contactos
        </Link>
        .
      </p>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="border-b border-[#2d3a47]">
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Contacto</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Lead</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium">Última actividad</th>
                <th className="px-4 py-3 text-[#8b9cad] text-sm font-medium w-28">Acción</th>
              </tr>
            </thead>
            <tbody>
              {conversaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[#8b9cad] text-center">
                    <p className="mb-3">No hay conversaciones aún.</p>
                    {!waStatus?.configurado ? (
                      <p>
                        Conecta WhatsApp en{' '}
                        <Link to="/dashboard/whatsapp" className="text-[#00c896] hover:underline">
                          WhatsApp Cloud API
                        </Link>{' '}
                        para recibir mensajes.
                      </p>
                    ) : null}
                  </td>
                </tr>
              ) : (
                conversaciones.map((c) => {
                  const nombreCompleto = [c.contacto_nombre, c.contacto_apellidos].filter(Boolean).join(' ').trim();
                  const titulo = nombreCompleto || c.contacto_telefono || 'Contacto';
                  const leadKey = (c.contacto_lead_status || 'new').toLowerCase();
                  const preview = snippetTexto(c.contacto_last_message);

                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-[#2d3a47] hover:bg-[#232d38]/50 ${c.pide_agente_humano ? 'bg-amber-500/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <ListaAvatar conversacion={c} />
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{titulo}</p>
                            {c.contacto_telefono ? (
                              <a
                                href={`https://wa.me/${c.contacto_telefono.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#00c896] hover:text-[#00e0a8] font-mono truncate block"
                              >
                                {c.contacto_telefono}
                              </a>
                            ) : null}
                            {c.pide_agente_humano ? (
                              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                                Pide asesor
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#232d38] text-[#9fb0c1] whitespace-nowrap">
                          {LEAD_LABELS[leadKey] || LEAD_LABELS.new}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8b9cad] capitalize">{c.estado || '—'}</td>
                      <td className="px-4 py-3 text-[#8b9cad] text-sm max-w-[220px]">
                        <span className="text-[#cbd5e0]">{tiempoRelativo(c.ultimo_mensaje_at)}</span>
                        {preview ? <p className="text-xs text-[#6b7a8a] mt-1 line-clamp-2">{preview}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dashboard/conversaciones/${c.id}`}
                          className="text-[#00c896] hover:text-[#00e0a8] text-sm font-medium whitespace-nowrap"
                        >
                          Ver chat
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
