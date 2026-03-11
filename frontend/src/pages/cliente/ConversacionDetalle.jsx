import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';

function Avatar({ nombre }) {
  const inicial = (nombre || '').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-sm font-semibold text-white">
      {inicial}
    </div>
  );
}

export default function ConversacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversacion, setConversacion] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const load = () => {
    api.get(`/crm/conversaciones/${id}/historial`).then((r) => {
      setConversacion(r.conversacion);
      setMensajes(r.mensajes || []);
      if (r.conversacion?.contacto_id) {
        api.get(`/crm/contactos/${r.conversacion.contacto_id}/appointments`).then((res) => {
          setCitas(Array.isArray(res?.appointments) ? res.appointments : []);
        }).catch(() => setCitas([]));
      } else {
        setCitas([]);
      }
    }).catch((e) => setError(e?.message || (e && String(e)) || 'Error al cargar la conversación')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError('');
    api.post(`/crm/conversaciones/${id}/mensajes`, { contenido: texto.trim() })
      .then((r) => {
        setTexto('');
        load();
        if (r && r.enviadoWhatsApp === false && r.error) {
          setError(`Mensaje guardado en el CRM, pero no se pudo enviar por WhatsApp: ${r.error}`);
        }
      })
      .catch((e) => setError(e?.message || e.message || 'Error al enviar'))
      .finally(() => setEnviando(false));
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center rounded-xl border border-[#2d3a47] bg-[#1a2129]">
        <p className="text-[#8b9cad]">Cargando conversación...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-xl border border-[#2d3a47] bg-[#1a2129] p-6">
        <p className="text-[#f87171] text-center">{error}</p>
        <button type="button" onClick={() => { setError(''); setLoading(true); load(); }} className="text-sm text-[#00c896] hover:text-[#00e0a8]">
          Reintentar
        </button>
      </div>
    );
  }
  if (!conversacion) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-xl border border-[#2d3a47] bg-[#1a2129] p-6">
        <p className="text-[#8b9cad]">Conversación no encontrada.</p>
        <button type="button" onClick={() => navigate('/dashboard/conversaciones')} className="text-sm text-[#00c896] hover:text-[#00e0a8]">
          Volver a conversaciones
        </button>
      </div>
    );
  }

  /** URL absoluta para reproducir audio/imagen (rutas /uploads/...). */
  const mediaSrc = (url) => {
    if (!url || !String(url).trim()) return null;
    const u = String(url).trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    const base = import.meta.env.VITE_UPLOADS_BASE || window.location.origin;
    return u.startsWith('/') ? base + u : base + '/' + u;
  };

  const nombreContacto = useMemo(
    () =>
      [conversacion.contacto_nombre, conversacion.contacto_apellidos].filter(Boolean).join(' ').trim() ||
      'Contacto',
    [conversacion.contacto_nombre, conversacion.contacto_apellidos]
  );
  const telefono = conversacion.contacto_telefono;

  return (
    <div className="flex flex-col min-h-[500px] bg-[#0b141a] rounded-xl border border-[#2d3a47] overflow-hidden shadow-lg">
      {/* Header tipo WhatsApp */}
      <div className="h-14 px-4 flex items-center justify-between bg-[#202c33] border-b border-[#202c33]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard/conversaciones')}
            className="text-[#8696a0] hover:text-white text-sm mr-1"
          >
            ←
          </button>
          <Avatar nombre={nombreContacto} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nombreContacto}</p>
            {telefono && (
              <p className="text-xs text-[#8696a0] truncate">
                {telefono}
              </p>
            )}
          </div>
        </div>
        {telefono && (
          <a
            href={`https://wa.me/${String(telefono).replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00a884] hover:text-[#25d366] font-medium"
          >
            Abrir en WhatsApp
          </a>
        )}
      </div>

      {/* Citas arriba del chat */}
      {citas.length > 0 && (
        <div className="px-4 py-2 bg-[#202c33] border-b border-[#202c33]">
          <p className="text-xs text-[#8696a0] mb-1">Citas de este contacto</p>
          <div className="flex flex-wrap gap-2">
            {citas.slice(0, 3).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center rounded-full bg-[#0b141a] border border-[#2d3a47] px-3 py-1 text-xs text-[#e9edef]"
              >
                {c.date ? new Date(c.date).toLocaleDateString() : ''} {c.time || ''}{' '}
                {c.notes ? `· ${c.notes}` : ''}
              </span>
            ))}
            <Link
              to="/dashboard/agenda"
              className="text-[11px] text-[#00a884] hover:underline ml-auto self-center"
            >
              Ver toda la agenda
            </Link>
          </div>
        </div>
      )}

      {/* Área de mensajes con fondo tipo WhatsApp */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-[radial-gradient(circle_at_top,_#202c33_0,_#0b141a_55%,_#0b141a_100%)]">
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#8696a0] text-sm text-center px-4">
              No hay mensajes aún. Cuando el cliente escriba por WhatsApp verás la conversación aquí.
            </p>
          </div>
        ) : (
          mensajes.map((m) => {
            const esEntrada = m.es_entrada;
            const fecha = new Date(m.created_at);
            const hora = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={m.id}
                className={`flex mb-1 ${esEntrada ? 'justify-start pr-10' : 'justify-end pl-10'}`}
              >
                <div
                  className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    esEntrada ? 'bg-[#202c33] text-[#e9edef]' : 'bg-[#005c4b] text-[#e9edef]'
                  }`}
                >
                  {(m.message_type === 'audio' && m.media_url) ? (
                    <div className="space-y-2">
                      <audio
                        controls
                        src={mediaSrc(m.media_url)}
                        className="w-full max-w-[240px] h-9"
                        preload="metadata"
                      >
                        Tu navegador no soporta audio.
                      </audio>
                      {m.contenido && m.contenido !== '[audio no transcrito]' && (
                        <p className="text-xs text-[#8696a0] italic">Transcripción: {m.contenido}</p>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                  )}
                  <span className="block text-[11px] text-[#8696a0] text-right mt-1">{hora}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Caja de texto */}
      <form onSubmit={enviar} className="border-t border-[#202c33] bg-[#202c33] px-3 py-2 flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full bg-[#2a3942] border border-transparent px-4 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-full bg-[#00a884] text-[#0b141a] font-semibold px-5 py-2 text-sm hover:bg-[#25d366] disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
