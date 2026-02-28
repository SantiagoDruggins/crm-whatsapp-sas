import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ConversacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversacion, setConversacion] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const load = () => {
    api.get(`/crm/conversaciones/${id}/historial`).then((r) => { setConversacion(r.conversacion); setMensajes(r.mensajes || []); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    api.post(`/crm/conversaciones/${id}/mensajes`, { contenido: texto.trim() }).then(() => { setTexto(''); load(); }).catch((e) => setError(e.message)).finally(() => setEnviando(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;
  if (!conversacion) return <p className="text-[#8b9cad]">Conversación no encontrada.</p>;

  const contacto = conversacion.contacto_nombre || conversacion.contacto_telefono || 'Contacto';

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/dashboard/conversaciones')} className="text-[#8b9cad] hover:text-white text-sm">← Volver</button>
        <h1 className="text-2xl font-bold text-white">Conversación con {contacto}</h1>
      </div>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-4 mb-4 min-h-[300px] max-h-[50vh] overflow-y-auto space-y-3">
        {mensajes.length === 0 ? (
          <p className="text-[#8b9cad] text-center py-8">No hay mensajes aún.</p>
        ) : (
          mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.es_entrada ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 ${m.es_entrada ? 'bg-[#232d38] text-white' : 'bg-[#00c896]/20 text-white'}`}>
                <p className="text-xs text-[#8b9cad] mb-1">{m.origen} · {new Date(m.created_at).toLocaleString()}</p>
                <p className="whitespace-pre-wrap">{m.contenido}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={enviar} className="flex gap-2">
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 rounded-xl bg-[#1a2129] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a]" />
        <button type="submit" disabled={enviando || !texto.trim()} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-6 py-3 hover:bg-[#00e0a8] disabled:opacity-50">
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
