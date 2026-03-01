import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import ModalNequi from './ModalNequi';
import { api } from '../lib/api';

const nav = [
  { path: '/dashboard', label: 'Panel' },
  { path: '/dashboard/contactos', label: 'Contactos' },
  { path: '/dashboard/conversaciones', label: 'Conversaciones' },
  { path: '/dashboard/whatsapp', label: 'WhatsApp Cloud API' },
  { path: '/dashboard/ia', label: 'Bot IA' },
  { path: '/dashboard/catalogo', label: 'Catálogo' },
  { path: '/dashboard/pedidos', label: 'Pedidos' },
  { path: '/dashboard/agenda', label: 'Agenda' },
  { path: '/dashboard/integraciones', label: 'Integraciones' },
  { path: '/dashboard/pagos', label: 'Pagos' },
];

export default function LayoutCliente() {
  const navigate = useNavigate();
  const location = useLocation();
  const [modalVencida, setModalVencida] = useState(false);
  const [empresa, setEmpresa] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('empresa') || '{}');
    } catch {
      return {};
    }
  });
  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/dashboard').then((r) => {
      const estado = r?.estadoCuenta;
      const prev = JSON.parse(localStorage.getItem('empresa') || '{}');
      const next = { ...prev, estado, plan: r?.planActual };
      localStorage.setItem('empresa', JSON.stringify(next));
      setEmpresa(next);
      if (estado === 'vencida' && !sessionStorage.getItem('nequi-vencida-shown')) {
        setModalVencida(true);
        sessionStorage.setItem('nequi-vencida-shown', '1');
      }
    }).catch(() => {});
  }, []);

  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#2d3a47] bg-[#1a2129] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d3a47]">
          <Link to="/dashboard" className="font-bold text-lg text-white">
            ChatProBusiness
          </Link>
        </div>
        <nav className="p-2 flex-1">
          {nav.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-[#00c896]/20 text-[#00c896]' : 'text-[#8b9cad] hover:text-white hover:bg-[#232d38]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#2d3a47]">
          <p className="text-xs text-[#8b9cad] truncate" title={usuario.email}>
            {usuario.nombre || usuario.email}
          </p>
          <p className="text-xs text-[#6b7a8a]">{empresa.estado || '—'}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-[#8b9cad] hover:text-white"
          >
            Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#2d3a47] bg-[#1a2129]/80 backdrop-blur flex items-center px-6 shrink-0">
          <span className="text-[#8b9cad] text-sm">
            {nav.find((n) => location.pathname === n.path || (n.path !== '/dashboard' && location.pathname.startsWith(n.path)))?.label || 'Panel'}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <ModalNequi
        open={modalVencida}
        onClose={() => setModalVencida(false)}
        titulo="Tu plan ha vencido — Renueva por Nequi"
      />
    </div>
  );
}
