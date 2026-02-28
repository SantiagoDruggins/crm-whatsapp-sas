import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function AdminMetricas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/metricas').then((r) => setData(r.metricas)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando métricas...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  const porEstado = data?.porEstado || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Métricas globales</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Total empresas</p>
          <p className="text-white font-semibold text-2xl">{data?.totalEmpresas ?? 0}</p>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Pagos pendientes</p>
          <p className="text-white font-semibold text-2xl">{data?.pagosPendientes ?? 0}</p>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Conversaciones abiertas</p>
          <p className="text-white font-semibold text-2xl">{data?.conversacionesAbiertas ?? 0}</p>
        </div>
      </div>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Empresas por estado</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(porEstado).map(([estado, total]) => (
            <div key={estado} className="bg-[#232d38] rounded-lg px-4 py-2">
              <span className="text-[#8b9cad] text-sm">{estado}: </span>
              <span className="text-white font-medium">{total}</span>
            </div>
          ))}
          {Object.keys(porEstado).length === 0 && <p className="text-[#8b9cad]">Sin datos</p>}
        </div>
      </div>
    </div>
  );
}
