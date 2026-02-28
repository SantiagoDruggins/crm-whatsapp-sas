import { Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';

const nav = [
  { path: '/admin', label: 'Métricas' },
  { path: '/admin/empresas', label: 'Empresas' },
  { path: '/admin/pagos', label: 'Pagos pendientes' },
];

export default function LayoutSuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }
  if (usuario.rol !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex">
      <aside className="w-56 border-r border-[#2d3a47] bg-[#1a2129] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d3a47]">
          <Link to="/admin" className="font-bold text-lg text-white">
            ChatProBusiness · Admin
          </Link>
        </div>
        <nav className="p-2 flex-1">
          {nav.map((item) => {
            const active = location.pathname === item.path;
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
          <p className="text-xs text-[#8b9cad] truncate">{usuario.email}</p>
          <p className="text-xs text-[#00c896] font-medium">Super Admin</p>
          <button onClick={handleLogout} className="mt-2 text-xs text-[#8b9cad] hover:text-white">
            Salir
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#2d3a47] bg-[#1a2129]/80 backdrop-blur flex items-center px-6 shrink-0">
          <span className="text-[#8b9cad] text-sm">
            {nav.find((n) => location.pathname === n.path)?.label || 'Admin'}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
