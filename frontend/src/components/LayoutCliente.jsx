import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import ModalNequi from './ModalNequi';
import { ToastContainer } from './Toast';
import NotificationPopup from './NotificationPopup';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 25000;
let toastId = 0;
function nextToastId() {
  return `toast-${++toastId}-${Date.now()}`;
}

const nav = [
  { path: '/dashboard', label: 'Panel' },
  { path: '/dashboard/contactos', label: 'Contactos' },
  { path: '/dashboard/conversaciones', label: 'Conversaciones' },
  { path: '/dashboard/whatsapp', label: 'WhatsApp Cloud API' },
  { path: '/dashboard/ia', label: 'Bot IA' },
  { path: '/dashboard/catalogo', label: 'Catálogo' },
  { path: '/dashboard/pedidos', label: 'Pedidos' },
  { path: '/dashboard/agenda', label: 'Agenda' },
  { path: '/dashboard/automatizaciones', label: 'Automatizaciones' },
  { path: '/dashboard/integraciones', label: 'Integraciones' },
  { path: '/dashboard/pagos', label: 'Pagos' },
  { path: '/dashboard/branding', label: 'Marca / logo' },
  { path: '/dashboard/sugerencias', label: 'Sugerencias' },
  { path: '/dashboard/ayuda', label: 'Ayuda' },
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

  const [toasts, setToasts] = useState([]);
  const [popup, setPopup] = useState({ open: false, type: '', title: '', detail: '', linkTo: '', linkLabel: '' });
  const [pideAgenteCount, setPideAgenteCount] = useState(0);
  const lastActivityRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item) => {
    setToasts((prev) => [...prev, { ...item, id: item.id || nextToastId() }]);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/dashboard').then((r) => {
      const estado = r?.estadoCuenta;
      const prev = JSON.parse(localStorage.getItem('empresa') || '{}');
      const empApi = r?.empresa || {};
      const next = { ...prev, ...empApi, estado, plan: r?.planActual };
      localStorage.setItem('empresa', JSON.stringify(next));
      setEmpresa(next);
      if (estado === 'vencida' && !sessionStorage.getItem('nequi-vencida-shown')) {
        setModalVencida(true);
        sessionStorage.setItem('nequi-vencida-shown', '1');
      }
    }).catch(() => {});
  }, []);

  // Poll actividad reciente para notificaciones (nuevos mensajes, citas, pedidos)
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const fetchActivity = () => {
      api.get('/crm/actividad-reciente').then((r) => {
        const prev = lastActivityRef.current;
        const { conversaciones = [], citas_proximas = [], pedidos_recientes = [] } = r || {};

        if (prev) {
          const prevConvMap = new Map((prev.conversaciones || []).map((c) => [c.id, c]));
          for (const c of conversaciones) {
            const p = prevConvMap.get(c.id);
            const isNewer = !p || (c.ultimo_mensaje_at && new Date(c.ultimo_mensaje_at) > new Date(p.ultimo_mensaje_at || 0));
            if (isNewer && c.ultimo_mensaje_at) {
              addToast({
                type: 'mensaje',
                title: 'Nuevo mensaje',
                message: `${c.contacto_nombre || c.contacto_telefono || 'Alguien'} te escribió`,
                linkTo: `/dashboard/conversaciones/${c.id}`,
                linkLabel: 'Ver conversación',
              });
            }
          }
          const prevCitaIds = new Set((prev.citas_proximas || []).map((a) => a.id));
          let popupCitaShown = false;
          for (const a of citas_proximas) {
            if (!prevCitaIds.has(a.id)) {
              const fecha = a.date ? new Date(a.date).toLocaleDateString('es') : '';
              const hora = (a.time || '').toString().substring(0, 5);
              addToast({
                type: 'cita',
                title: 'Nueva cita agendada',
                message: `${a.contacto_nombre || 'Contacto'} — ${fecha} ${hora ? hora : ''}`.trim(),
                linkTo: '/dashboard/agenda',
                linkLabel: 'Ver agenda',
              });
              if (!popupCitaShown) {
                popupCitaShown = true;
                setPopup({
                  open: true,
                  type: 'cita',
                  title: 'Nueva cita agendada',
                  detail: `${a.contacto_nombre || 'Contacto'} — ${fecha} ${hora ? hora : ''}`.trim(),
                  linkTo: '/dashboard/agenda',
                  linkLabel: 'Ver agenda',
                });
              }
            }
          }
          const prevPedidoIds = new Set((prev.pedidos_recientes || []).map((p) => p.id));
          let popupPedidoShown = false;
          for (const p of pedidos_recientes) {
            if (!prevPedidoIds.has(p.id)) {
              addToast({
                type: 'pedido',
                title: 'Nuevo pedido',
                message: `Pedido #${p.id}${p.contacto_nombre ? ` — ${p.contacto_nombre}` : ''}`,
                linkTo: '/dashboard/pedidos',
                linkLabel: 'Ver pedidos',
              });
              if (!popupPedidoShown) {
                popupPedidoShown = true;
                setPopup({
                  open: true,
                  type: 'pedido',
                  title: 'Nuevo pedido',
                  detail: `Pedido #${p.id}${p.contacto_nombre ? ` — ${p.contacto_nombre}` : ''}`,
                  linkTo: '/dashboard/pedidos',
                  linkLabel: 'Ver pedidos',
                });
              }
            }
          }
        }
        const newCount = r.pide_agente_count ?? 0;
        const prevCount = lastActivityRef.current?.pide_agente_count ?? 0;
        if (newCount > prevCount && newCount > 0) {
          const n = newCount - prevCount;
          addToast({
            type: 'mensaje',
            title: 'Cliente pide agente',
            message: n === 1 ? 'Un cliente quiere hablar con una persona' : `${n} clientes quieren hablar con una persona`,
            linkTo: '/dashboard/conversaciones',
            linkLabel: 'Ver conversaciones',
          });
        }
        lastActivityRef.current = { conversaciones, citas_proximas, pedidos_recientes, pide_agente_count: newCount };
        setPideAgenteCount(newCount);
      }).catch(() => {});
    };
    fetchActivity();
    const interval = setInterval(fetchActivity, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [addToast]);

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
          <Link to="/dashboard" className="flex items-center gap-2">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={empresa.nombre || 'Logo'}
                className="h-9 w-9 rounded-lg bg-[#020617] object-contain border border-[#2d3a47]"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-[#00c896]/15 border border-[#00c896]/40 flex items-center justify-center text-[#00c896] font-bold text-sm">
                {(empresa.nombre || 'CRM').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate max-w-[9rem]">
                {empresa.nombre || 'ChatProBusiness'}
              </p>
              <p className="text-[11px] text-[#6b7a8a] truncate max-w-[9rem]">
                Panel de WhatsApp + IA
              </p>
            </div>
          </Link>
        </div>
        <nav className="p-2 flex-1">
          {nav.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const showPideAgente = item.path === '/dashboard/conversaciones' && pideAgenteCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-[#00c896]/20 text-[#00c896]' : 'text-[#8b9cad] hover:text-white hover:bg-[#232d38]'
                }`}
              >
                <span>{item.label}</span>
                {showPideAgente && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500/90 text-[#0f1419] text-xs font-bold" title="Clientes piden hablar con un agente">
                    {pideAgenteCount > 99 ? '99+' : pideAgenteCount}
                  </span>
                )}
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
        <header className="h-14 border-b border-[#2d3a47] bg-[#1a2129]/80 backdrop-blur flex items-center justify-between px-6 shrink-0">
          <span className="text-[#8b9cad] text-sm">
            {nav.find((n) => location.pathname === n.path || (n.path !== '/dashboard' && location.pathname.startsWith(n.path)))?.label || 'Panel'}
          </span>
          <div className="relative flex items-center" title="Notificaciones">
            <svg className="w-5 h-5 text-[#8b9cad] hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {toasts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#00c896] text-[#0f1419] text-xs font-bold">
                {toasts.length > 99 ? '99+' : toasts.length}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <NotificationPopup
        open={popup.open}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
        type={popup.type}
        title={popup.title}
        detail={popup.detail}
        linkTo={popup.linkTo}
        linkLabel={popup.linkLabel}
      />
      <ModalNequi
        open={modalVencida}
        onClose={() => setModalVencida(false)}
        titulo="Tu plan ha vencido — Renueva por Nequi"
      />
    </div>
  );
}
