import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const cardBase = 'rounded-xl border border-[#2d3a47] bg-[#1a2129] p-5 transition-colors';
const cardLink = cardBase + ' hover:border-[#00c896]/50 block';
const label = 'text-[#8b9cad] text-sm mb-1';
const value = 'text-white font-medium';
const cta = 'text-[#00c896] text-xs mt-2';

function StepCard({ to, labelText, valueText, ctaText }) {
  return (
    <Link to={to} className={cardLink}>
      <p className={label}>{labelText}</p>
      <p className={value}>{valueText}</p>
      <p className={cta}>{ctaText}</p>
    </Link>
  );
}

export default function DashboardResumen() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState({ conversaciones: [], citas_proximas: [], pedidos_recientes: [], pide_agente_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/crm/actividad-reciente')])
      .then(([dash, act]) => {
        setData(dash);
        setActivity(act || {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;
  if (error) return <p className="text-[#f87171]">{error}</p>;

  const integraciones = data?.integraciones || {};
  const hasIntegraciones = integraciones.shopify_activo || integraciones.dropi_activo || integraciones.mastershop_activo;
  const whatsappOk = data?.estadoWhatsapp === 'conectado';
  const botOk = data?.estadoBot === 'activo';
  const catalogOk = (data?.catalogoItemsActivos ?? 0) > 0;
  const firstValueOk = whatsappOk && botOk && catalogOk;
  const pideAgente = Number(activity?.pide_agente_count || 0);
  const pedidosRecientes = Array.isArray(activity?.pedidos_recientes) ? activity.pedidos_recientes : [];
  const citasProximas = Array.isArray(activity?.citas_proximas) ? activity.citas_proximas : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Tu panel</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Resumen de tu cuenta y acceso rápido a todo el sistema: canal, IA, conversaciones, CRM, pedidos e integraciones.
      </p>

      {/* Activación rápida */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className={cardBase + ' lg:col-span-2'}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold">Empieza aquí (10 minutos)</h2>
              <p className="text-[#8b9cad] text-sm mt-1">Completa esto y ya puedes atender y vender por WhatsApp con IA.</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${firstValueOk ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
              {firstValueOk ? 'Listo para vender' : 'Pendiente'}
            </span>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Link to="/dashboard/whatsapp" className="rounded-xl border border-[#2d3a47] p-4 hover:border-[#00c896]/50">
              <p className="text-sm text-white font-medium">1) WhatsApp</p>
              <p className="text-xs text-[#8b9cad] mt-1">{whatsappOk ? 'Conectado' : 'Configura Cloud API y webhook'}</p>
              <p className={cta}>{whatsappOk ? 'Ver estado →' : 'Configurar →'}</p>
            </Link>
            <Link to="/dashboard/ia" className="rounded-xl border border-[#2d3a47] p-4 hover:border-[#00c896]/50">
              <p className="text-sm text-white font-medium">2) Bot IA</p>
              <p className="text-xs text-[#8b9cad] mt-1">{botOk ? 'Activo' : 'Crea/activa tu bot'}</p>
              <p className={cta}>{botOk ? 'Ajustar →' : 'Configurar →'}</p>
            </Link>
            <Link to="/dashboard/catalogo" className="rounded-xl border border-[#2d3a47] p-4 hover:border-[#00c896]/50">
              <p className="text-sm text-white font-medium">3) Catálogo</p>
              <p className="text-xs text-[#8b9cad] mt-1">{catalogOk ? `${data?.catalogoItemsActivos || 0} ítems activos` : 'Crea 2–3 productos/servicios'}</p>
              <p className={cta}>Abrir →</p>
            </Link>
          </div>
        </div>
        <div className={cardBase}>
          <h2 className="text-white font-semibold">Resultados (últimos 7 días)</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-[#8b9cad]">Leads</span><span className="text-white font-medium">{data?.leadsNuevos7Dias ?? 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-[#8b9cad]">Pedidos</span><span className="text-white font-medium">{data?.pedidos7Dias ?? 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-[#8b9cad]">Citas</span><span className="text-white font-medium">{data?.citas7Dias ?? 0}</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/dashboard/conversaciones" className="text-xs text-[#00c896] hover:text-[#00e0a8]">Ver chats →</Link>
            <Link to="/dashboard/pedidos" className="text-xs text-[#00c896] hover:text-[#00e0a8]">Ver pedidos →</Link>
            <Link to="/dashboard/agenda" className="text-xs text-[#00c896] hover:text-[#00e0a8]">Ver agenda →</Link>
          </div>
        </div>
      </div>

      {/* Prioridades */}
      <h2 className="text-lg font-semibold text-white mb-3">Qué hacer hoy</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link to="/dashboard/pide-agente" className={cardLink}>
          <p className={label}>Piden humano</p>
          <p className={value}>{pideAgente > 0 ? `${pideAgente} sin atender` : '0'}</p>
          <p className={cta}>Abrir bandeja →</p>
        </Link>
        <Link to="/dashboard/pedidos" className={cardLink}>
          <p className={label}>Pedidos recientes</p>
          <p className={value}>{pedidosRecientes.length ? `${pedidosRecientes.length} recientes` : 'Sin pedidos'}</p>
          <p className={cta}>Revisar →</p>
        </Link>
        <Link to="/dashboard/agenda" className={cardLink}>
          <p className={label}>Citas próximas</p>
          <p className={value}>{citasProximas.length ? `${citasProximas.length} próximas` : 'Sin citas'}</p>
          <p className={cta}>Ver agenda →</p>
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={cardBase}>
          <p className={label}>Estado cuenta</p>
          <p className={value}>{data?.estadoCuenta || '—'}</p>
        </div>
        <div className={cardBase}>
          <p className={label}>Días demo restantes</p>
          <p className={value}>{data?.diasDemoRestantes ?? data?.diasRestantes ?? '—'}</p>
        </div>
        <div className={cardBase}>
          <p className={label}>Conversaciones abiertas</p>
          <p className={value}>{data?.conversaciones?.abiertas ?? 0}</p>
        </div>
        <div className={cardBase}>
          <p className={label}>Leads últimos 7 días</p>
          <p className={value}>{data?.leadsNuevos7Dias ?? 0}</p>
        </div>
      </div>

      {/* Embudo / Flujo de ventas */}
      <h2 className="text-lg font-semibold text-white mb-3">Tu flujo de ventas</h2>
      <p className="text-[#8b9cad] text-sm mb-4">
        Canal → IA → Conversaciones → Contactos y catálogo → Pedidos (manual o por integraciones) → Pagos.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StepCard
          to="/dashboard/whatsapp"
          labelText="1. Canal"
          valueText={data?.estadoWhatsapp === 'conectado' ? 'WhatsApp conectado' : 'WhatsApp sin configurar'}
          ctaText="Configurar →"
        />
        <StepCard
          to="/dashboard/ia"
          labelText="2. Bot IA"
          valueText={data?.estadoBot === 'activo' ? 'Activo' : (data?.estadoBot || 'Deshabilitado')}
          ctaText="Configurar →"
        />
        <StepCard
          to="/dashboard/conversaciones"
          labelText="3. Conversaciones"
          valueText="Ver y atender chats"
          ctaText="Abrir →"
        />
        <StepCard
          to="/dashboard/contactos"
          labelText="4. Contactos"
          valueText="CRM"
          ctaText="Ver lista →"
        />
        <StepCard
          to="/dashboard/catalogo"
          labelText="5. Catálogo"
          valueText="Productos para el bot y pedidos"
          ctaText="Gestionar →"
        />
        <StepCard
          to="/dashboard/pedidos"
          labelText="6. Pedidos"
          valueText="Manual + Shopify, Dropi, Mastershop"
          ctaText="Ver pedidos →"
        />
        <StepCard
          to="/dashboard/agenda"
          labelText="Agenda"
          valueText="Recordatorios y citas"
          ctaText="Ver agenda →"
        />
        <StepCard
          to="/dashboard/pagos"
          labelText="Plan y pagos"
          valueText={data?.planActual || '—'}
          ctaText="Pagos →"
        />
      </div>

      {/* Integraciones */}
      <h2 className="text-lg font-semibold text-white mb-3">Integraciones</h2>
      <p className="text-[#8b9cad] text-sm mb-4">
        Conecta tu tienda o proveedores para que los pedidos lleguen solos al CRM. Cada una es opcional.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className={cardBase + ' flex flex-col'}>
          <p className={label}>Shopify</p>
          <p className={value}>{integraciones.shopify_activo ? 'Activo' : 'No configurado'}</p>
          <p className="text-[#8b9cad] text-xs mt-1">Pedidos de tu tienda por webhook.</p>
          <Link to="/dashboard/integraciones" className={cta + ' mt-auto pt-2'}>Configurar →</Link>
        </div>
        <div className={cardBase + ' flex flex-col'}>
          <p className={label}>Dropi</p>
          <p className={value}>{integraciones.dropi_activo ? 'Activo' : 'No configurado'}</p>
          <p className="text-[#8b9cad] text-xs mt-1">Dropshipping con API configurable.</p>
          <Link to="/dashboard/integraciones" className={cta + ' mt-auto pt-2'}>Configurar →</Link>
        </div>
        <div className={cardBase + ' flex flex-col'}>
          <p className={label}>Mastershop</p>
          <p className={value}>{integraciones.mastershop_activo ? 'Activo' : 'No configurado'}</p>
          <p className="text-[#8b9cad] text-xs mt-1">Pedidos desde Mastershop.</p>
          <Link to="/dashboard/integraciones" className={cta + ' mt-auto pt-2'}>Configurar →</Link>
        </div>
      </div>
      {hasIntegraciones && (
        <p className="text-[#00c896] text-sm">
          Tienes {[integraciones.shopify_activo && 'Shopify', integraciones.dropi_activo && 'Dropi', integraciones.mastershop_activo && 'Mastershop'].filter(Boolean).join(', ')} activo(s). Los pedidos se crean automáticamente en Pedidos.
        </p>
      )}

      {/* Accesos rápidos extra */}
      <div className="mt-8 pt-6 border-t border-[#2d3a47] flex flex-wrap gap-3">
        <Link to="/dashboard/automatizaciones" className="text-[#8b9cad] hover:text-[#00c896] text-sm">Automatizaciones</Link>
        <Link to="/dashboard/branding" className="text-[#8b9cad] hover:text-[#00c896] text-sm">Marca / logo</Link>
        <Link to="/dashboard/ayuda" className="text-[#8b9cad] hover:text-[#00c896] text-sm">Ayuda</Link>
        <Link to="/dashboard/mi-cuenta" className="text-[#8b9cad] hover:text-[#00c896] text-sm">Mi cuenta</Link>
      </div>
    </div>
  );
}
