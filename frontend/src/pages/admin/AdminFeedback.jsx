import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const TIPO_LABEL = { sugerencia: 'Sugerencia', mejora: 'Mejora', bug: 'Problema', otro: 'Otro' };

export default function AdminFeedback() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const load = () => {
    setLoading(true);
    const q = filtroTipo ? `?tipo=${encodeURIComponent(filtroTipo)}` : '';
    api
      .get(`/admin/feedback${q}`)
      .then((r) => setList(r.feedback || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filtroTipo]);

  if (loading) return <p className="text-[#8b9cad]">Cargando feedback...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback de usuarios</h1>
          <p className="text-[#8b9cad] text-sm mt-1">Sugerencias y comentarios reales para mejorar el panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#8b9cad]">Tipo:</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg bg-[#1a2129] border border-[#2d3a47] px-3 py-2 text-white text-sm"
          >
            <option value="">Todos</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="mejora">Mejora</option>
            <option value="bug">Problema</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#8b9cad]">
            Aún no hay feedback. Los usuarios pueden enviarlo desde el panel en &quot;Sugerencias&quot;.
          </div>
        ) : (
          <ul className="divide-y divide-[#2d3a47]">
            {list.map((f) => (
              <li key={f.id} className="p-4 hover:bg-[#232d38]/50">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#00c896]/20 text-[#00c896]">
                    {TIPO_LABEL[f.tipo] || f.tipo}
                  </span>
                  <span className="text-xs text-[#6b7a8a]">
                    {f.created_at ? new Date(f.created_at).toLocaleString('es') : ''}
                  </span>
                </div>
                <p className="text-[#e9edef] text-sm whitespace-pre-wrap">{f.mensaje}</p>
                <p className="text-xs text-[#8b9cad] mt-2">
                  {f.empresa_nombre || '—'} {f.empresa_email ? ` · ${f.empresa_email}` : ''}
                  {f.usuario_nombre || f.usuario_email ? ` · Usuario: ${f.usuario_nombre || f.usuario_email}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
