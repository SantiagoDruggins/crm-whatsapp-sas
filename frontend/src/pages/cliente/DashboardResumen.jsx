import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function DashboardResumen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Tu panel</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Estado cuenta</p>
          <p className="text-white font-semibold">{data?.estadoCuenta || '—'}</p>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Días demo restantes</p>
          <p className="text-white font-semibold">{data?.diasDemoRestantes ?? data?.diasRestantes ?? '—'}</p>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Conversaciones abiertas</p>
          <p className="text-white font-semibold">{data?.conversaciones?.abiertas ?? 0}</p>
        </div>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <p className="text-[#8b9cad] text-sm mb-1">Leads últimos 7 días</p>
          <p className="text-white font-semibold">{data?.leadsNuevos7Dias ?? 0}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/dashboard/whatsapp" className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5 hover:border-[#00c896]/50 transition-colors block">
          <p className="text-[#8b9cad] text-sm mb-1">WhatsApp Cloud API</p>
          <p className="text-white font-medium">{data?.estadoWhatsapp === 'conectado' ? 'Conectado' : 'No configurado'}</p>
          <p className="text-[#00c896] text-xs mt-2">Configurar →</p>
        </Link>
        <Link to="/dashboard/ia" className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5 hover:border-[#00c896]/50 transition-colors block">
          <p className="text-[#8b9cad] text-sm mb-1">Bot IA</p>
          <p className="text-white font-medium">{data?.estadoBot || 'deshabilitado'}</p>
          <p className="text-[#00c896] text-xs mt-2">Configurar →</p>
        </Link>
        <Link to="/dashboard/contactos" className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5 hover:border-[#00c896]/50 transition-colors block">
          <p className="text-[#8b9cad] text-sm mb-1">Contactos</p>
          <p className="text-white font-medium">CRM</p>
          <p className="text-[#00c896] text-xs mt-2">Ver lista →</p>
        </Link>
        <Link to="/dashboard/pagos" className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5 hover:border-[#00c896]/50 transition-colors block">
          <p className="text-[#8b9cad] text-sm mb-1">Plan actual</p>
          <p className="text-white font-medium">{data?.planActual || '—'}</p>
          <p className="text-[#00c896] text-xs mt-2">Pagos →</p>
        </Link>
      </div>
    </div>
  );
}
