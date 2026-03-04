import { useState } from 'react';
import { api } from '../../lib/api';

const TIPOS = [
  { value: 'sugerencia', label: 'Sugerencia', desc: 'Una idea para mejorar el panel' },
  { value: 'mejora', label: 'Mejora', desc: 'Algo que te gustaría que cambiara' },
  { value: 'bug', label: 'Problema / bug', desc: 'Algo que no funciona bien' },
  { value: 'otro', label: 'Otro', desc: 'Comentario general' },
];

export default function Sugerencias() {
  const [tipo, setTipo] = useState('sugerencia');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = (mensaje || '').trim();
    if (!texto) {
      setError('Escribe tu mensaje.');
      return;
    }
    setEnviando(true);
    setError('');
    setEnviado(false);
    api
      .post('/crm/feedback', { tipo, mensaje: texto })
      .then(() => {
        setMensaje('');
        setEnviado(true);
      })
      .catch((e) => setError(e.message || 'Error al enviar'))
      .finally(() => setEnviando(false));
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Sugerencias y feedback</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Tu opinión nos ayuda a mejorar el panel. Cuéntanos qué te gustaría cambiar, qué echas en falta o si algo no te funciona. Leemos todo y lo tenemos en cuenta.
      </p>

      {enviado && (
        <div className="mb-6 rounded-xl border border-[#00c896]/50 bg-[#00c896]/10 p-4 text-[#00c896]">
          Gracias por tu mensaje. Lo revisaremos y lo tendremos en cuenta para seguir mejorando.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Tipo de mensaje</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  tipo === t.value
                    ? 'border-[#00c896] bg-[#00c896]/10 text-white'
                    : 'border-[#2d3a47] bg-[#1a2129] text-[#8b9cad] hover:border-[#2d3a47] hover:bg-[#232d38]'
                }`}
              >
                <span className="font-medium block">{t.label}</span>
                <span className="text-xs opacity-90">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Tu mensaje *</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej: Me gustaría poder exportar contactos. O: En la agenda no me deja elegir hora."
            rows={5}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:border-[#00c896]/50"
            required
          />
        </div>

        {error && <p className="text-sm text-[#f87171]">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-6 py-3 hover:bg-[#00e0a8] disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'Enviar sugerencia'}
        </button>
      </form>

      <p className="text-xs text-[#6b7a8a] mt-6">
        Enviamos tu mensaje junto con el nombre de tu empresa para poder contextualizar. No publicamos tu feedback sin permiso.
      </p>
    </div>
  );
}
