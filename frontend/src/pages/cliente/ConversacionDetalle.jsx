import { useState, useEffect, useMemo, useRef } from 'react';
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

function getGuiaContextual(motor) {
  const intencion = (motor?.intencion_actual || '').toLowerCase();
  const bloqueado = motor?.bloqueo_bot === true;
  if (bloqueado) {
    return {
      title: 'Asesor humano en control',
      detail: 'El bot está pausado. Responde de forma manual y, cuando quieras, reactiva el bot con el modo adecuado.',
      tone: 'amber',
    };
  }
  if (intencion === 'pedido') {
    return {
      title: 'Modo pedidos',
      detail: 'Siguiente paso recomendado: confirmar producto, dirección y forma de pago para cerrar la venta.',
      tone: 'emerald',
    };
  }
  if (intencion === 'agenda') {
    return {
      title: 'Modo agenda',
      detail: 'Siguiente paso recomendado: confirmar fecha/hora y verificar disponibilidad para cerrar la cita.',
      tone: 'sky',
    };
  }
  return {
    title: 'Modo soporte',
    detail: 'Siguiente paso recomendado: resolver la duda principal y, si hay intención comercial, pasar a pedidos o agenda.',
    tone: 'slate',
  };
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
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const [motor, setMotor] = useState(null);
  const [updatingMotor, setUpdatingMotor] = useState(false);
  const [modoReactivacion, setModoReactivacion] = useState('soporte');
  const [productos, setProductos] = useState([]);
  const [productoCatalogoId, setProductoCatalogoId] = useState('');
  const [enviandoImagen, setEnviandoImagen] = useState(false);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [enviandoCatalogo, setEnviandoCatalogo] = useState(false);
  const [captionImagen, setCaptionImagen] = useState('');
  const inputImagenRef = useRef(null);
  const inputDocRef = useRef(null);

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
      api.get(`/crm/conversaciones/${id}/motor`).then((m) => setMotor(m.motor || null)).catch(() => setMotor(null));
    }).catch((e) => setError(e?.message || (e && String(e)) || 'Error al cargar la conversación')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    api
      .get('/crm/productos')
      .then((r) => setProductos(Array.isArray(r.productos) ? r.productos : []))
      .catch(() => setProductos([]));
  }, []);

  const nombreContacto = useMemo(
    () =>
      conversacion
        ? ([conversacion.contacto_nombre, conversacion.contacto_apellidos].filter(Boolean).join(' ').trim() || 'Contacto')
        : 'Contacto',
    [conversacion?.contacto_nombre, conversacion?.contacto_apellidos]
  );

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

  const iniciarGrabacion = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Tu navegador no soporta grabación de audio.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMimes = [
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/mpeg',
        'audio/webm;codecs=opus',
        'audio/webm',
      ];
      const mimeType = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) setAudioBlob(blob);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };
      recorder.start();
      setAudioBlob(null);
      setGrabandoAudio(true);
    } catch (e) {
      setError('No pude iniciar la grabación. Verifica permisos de micrófono.');
    }
  };

  const detenerGrabacion = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (_) {}
    setGrabandoAudio(false);
  };

  const cancelarAudio = () => {
    setAudioBlob(null);
    setGrabandoAudio(false);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (_) {}
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const enviarImagenSeleccionada = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setEnviandoImagen(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      if (captionImagen.trim()) formData.append('caption', captionImagen.trim());
      await api.upload(`/crm/conversaciones/${id}/imagen`, formData);
      setCaptionImagen('');
      load();
    } catch (err) {
      setError(err?.message || 'No se pudo enviar la imagen');
    } finally {
      setEnviandoImagen(false);
    }
  };

  const enviarDocumentoSeleccionado = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setEnviandoDoc(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('documento', file);
      await api.upload(`/crm/conversaciones/${id}/documento`, formData);
      load();
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el archivo');
    } finally {
      setEnviandoDoc(false);
    }
  };

  const enviarProductoCatalogo = async () => {
    if (!productoCatalogoId) return;
    setEnviandoCatalogo(true);
    setError('');
    try {
      await api.post(`/crm/conversaciones/${id}/enviar-producto`, { producto_id: productoCatalogoId });
      setProductoCatalogoId('');
      load();
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el producto');
    } finally {
      setEnviandoCatalogo(false);
    }
  };

  const enviarAudio = async () => {
    if (!audioBlob) return;
    setEnviandoAudio(true);
    setError('');
    try {
      const formData = new FormData();
      const extByType = audioBlob.type.includes('ogg')
        ? 'ogg'
        : audioBlob.type.includes('mp4')
          ? 'm4a'
          : audioBlob.type.includes('mpeg')
            ? 'mp3'
            : 'webm';
      formData.append('audio', audioBlob, `nota-voz-${Date.now()}.${extByType}`);
      await api.upload(`/crm/conversaciones/${id}/audio`, formData);
      setAudioBlob(null);
      load();
    } catch (e) {
      setError(e?.message || 'No se pudo enviar la nota de voz');
    } finally {
      setEnviandoAudio(false);
    }
  };

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (_) {}
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

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

  const telefono = conversacion.contacto_telefono;
  const motorLabel = motor?.estado_operativo || 'bot_activo';
  const isBotBloqueado = motor?.bloqueo_bot === true;
  const guia = getGuiaContextual(motor);

  const actualizarMotor = (accion) => {
    setUpdatingMotor(true);
    setError('');
    const body = { accion };
    if (accion === 'reactivar_bot') body.modo_inicial = modoReactivacion;
    api.patch(`/crm/conversaciones/${id}/motor`, body)
      .then((r) => {
        if (r?.motor) setMotor(r.motor);
      })
      .catch((e) => setError(e?.message || 'No se pudo actualizar el motor de conversación'))
      .finally(() => setUpdatingMotor(false));
  };

  return (
    <div className="h-full flex flex-col flex-1 min-h-0 bg-[#0b141a] rounded-xl border border-[#2d3a47] overflow-hidden shadow-lg">
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
          <span
            className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-[11px] border ${
              isBotBloqueado
                ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
            }`}
            title={`Estado operativo: ${motorLabel}`}
          >
            {isBotBloqueado ? 'Asesor / Bot pausado' : 'Bot activo'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={updatingMotor || isBotBloqueado}
            onClick={() => actualizarMotor('pasar_asesor')}
            className="hidden md:inline-flex rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2.5 py-1 text-xs hover:bg-amber-500/20 disabled:opacity-50"
          >
            Pasar a asesor
          </button>
          {isBotBloqueado && (
            <select
              value={modoReactivacion}
              onChange={(e) => setModoReactivacion(e.target.value)}
              className="hidden md:inline-flex rounded-lg border border-[#2d3a47] bg-[#0f1419] text-[#cbd5e0] px-2.5 py-1 text-xs focus:outline-none"
              title="Modo inicial al reactivar el bot"
            >
              <option value="soporte">Reactivar en Soporte</option>
              <option value="pedidos">Reactivar en Pedidos</option>
              <option value="agenda">Reactivar en Agenda</option>
            </select>
          )}
          <button
            type="button"
            disabled={updatingMotor || !isBotBloqueado}
            onClick={() => actualizarMotor('reactivar_bot')}
            className="hidden md:inline-flex rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-xs hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Reactivar bot
          </button>
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
      </div>

      <div
        className={`px-4 py-2 border-b text-xs ${
          guia.tone === 'amber'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            : guia.tone === 'emerald'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
              : guia.tone === 'sky'
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-200'
                : 'bg-[#1a2129] border-[#2d3a47] text-[#9fb0c1]'
        }`}
      >
        <span className="font-semibold">{guia.title}:</span> {guia.detail}
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

      {/* Área de mensajes con fondo tipo WhatsApp (solo esta zona hace scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 bg-[radial-gradient(circle_at_top,_#202c33_0,_#0b141a_55%,_#0b141a_100%)]">
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
                  {m.message_type === 'audio' && m.media_url ? (
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
                  ) : m.message_type === 'image' && m.media_url ? (
                    <div className="space-y-2">
                      <img
                        src={mediaSrc(m.media_url)}
                        alt=""
                        className="max-w-[220px] max-h-[220px] rounded-md object-cover border border-[#2d3a47]"
                        loading="lazy"
                      />
                      {m.contenido && m.contenido !== '[imagen enviada]' && (
                        <p className="whitespace-pre-wrap break-words text-sm">{m.contenido}</p>
                      )}
                    </div>
                  ) : m.message_type === 'document' && m.media_url ? (
                    <div className="space-y-1">
                      <a
                        href={mediaSrc(m.media_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#53bdeb] underline text-sm break-all"
                      >
                        {m.contenido || 'Descargar archivo'}
                      </a>
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
      <form onSubmit={enviar} className="border-t border-[#202c33] bg-[#202c33] px-3 py-2">
        <input ref={inputImagenRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={enviarImagenSeleccionada} />
        <input ref={inputDocRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.zip,application/pdf" className="hidden" onChange={enviarDocumentoSeleccionado} />
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => inputImagenRef.current?.click()}
            disabled={enviandoImagen || grabandoAudio || !!audioBlob}
            className="rounded-lg border border-[#2d3a47] bg-[#1a2129] text-[#cbd5e0] px-2.5 py-1 hover:bg-[#24303b] disabled:opacity-50"
          >
            {enviandoImagen ? 'Enviando foto…' : 'Adjuntar foto'}
          </button>
          <button
            type="button"
            onClick={() => inputDocRef.current?.click()}
            disabled={enviandoDoc || grabandoAudio || !!audioBlob}
            className="rounded-lg border border-[#2d3a47] bg-[#1a2129] text-[#cbd5e0] px-2.5 py-1 hover:bg-[#24303b] disabled:opacity-50"
          >
            {enviandoDoc ? 'Enviando archivo…' : 'Adjuntar archivo'}
          </button>
          {productos.length > 0 && (
            <span className="inline-flex items-center gap-1 flex-wrap">
              <select
                value={productoCatalogoId}
                onChange={(e) => setProductoCatalogoId(e.target.value)}
                disabled={enviandoCatalogo || grabandoAudio || !!audioBlob}
                className="rounded-lg border border-[#2d3a47] bg-[#0f1419] text-[#cbd5e0] px-2 py-1 text-xs max-w-[160px]"
              >
                <option value="">Catálogo…</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={enviarProductoCatalogo}
                disabled={!productoCatalogoId || enviandoCatalogo || grabandoAudio || !!audioBlob}
                className="rounded-lg border border-[#00a884]/50 bg-[#00a884]/15 text-[#25d366] px-2.5 py-1 hover:bg-[#00a884]/25 disabled:opacity-50"
              >
                {enviandoCatalogo ? '…' : 'Enviar producto'}
              </button>
            </span>
          )}
          {!grabandoAudio && !audioBlob && (
            <button
              type="button"
              onClick={iniciarGrabacion}
              className="rounded-lg border border-[#2d3a47] bg-[#1a2129] text-[#cbd5e0] px-2.5 py-1 hover:bg-[#24303b]"
            >
              Grabar audio
            </button>
          )}
          {grabandoAudio && (
            <>
              <span className="text-rose-300">Grabando...</span>
              <button
                type="button"
                onClick={detenerGrabacion}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 px-2.5 py-1 hover:bg-rose-500/25"
              >
                Detener
              </button>
            </>
          )}
          {!grabandoAudio && audioBlob && (
            <>
              <span className="text-emerald-300">Nota de voz lista</span>
              <button
                type="button"
                onClick={enviarAudio}
                disabled={enviandoAudio}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 px-2.5 py-1 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {enviandoAudio ? 'Enviando audio...' : 'Enviar audio'}
              </button>
              <button
                type="button"
                onClick={cancelarAudio}
                disabled={enviandoAudio}
                className="rounded-lg border border-[#2d3a47] bg-[#1a2129] text-[#cbd5e0] px-2.5 py-1 hover:bg-[#24303b] disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
        <div className="mb-2">
          <input
            type="text"
            value={captionImagen}
            onChange={(e) => setCaptionImagen(e.target.value)}
            placeholder="Texto opcional que irá con la próxima foto (leyenda)"
            className="w-full rounded-lg bg-[#2a3942] border border-transparent px-3 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
          />
        </div>
        <div className="flex gap-2">
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
        </div>
      </form>
    </div>
  );
}
