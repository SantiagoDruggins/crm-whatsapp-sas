import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    api
      .get('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    navigate('/', { replace: true });
  };

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <p className="text-[#8b9cad]">Cargando panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#f87171] mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-[#2d3a47] text-white px-4 py-2 hover:bg-[#3d4a57]"
          >
            Salir y volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <header className="border-b border-[#2d3a47] bg-[#1a2129]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="font-bold text-xl text-white">
            ChatProBusiness
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8b9cad]">
              {usuario.nombre || usuario.email}
            </span>
            <span className="text-xs text-[#8b9cad] bg-[#232d38] px-2 py-1 rounded">
              {empresa.estado || '—'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#8b9cad] hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
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
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
            <p className="text-[#8b9cad] text-sm mb-1">WhatsApp</p>
            <p className="text-white font-medium">{data?.estadoWhatsapp || 'desconectado'}</p>
          </div>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
            <p className="text-[#8b9cad] text-sm mb-1">Bot IA</p>
            <p className="text-white font-medium">{data?.estadoBot || 'deshabilitado'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
