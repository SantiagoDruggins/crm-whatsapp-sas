/** Mismas claves que el backend (`crmPermissions.js`). */
export const CRM_PERM_LABELS = {
  panel: 'Panel / inicio',
  contactos: 'Contactos',
  conversaciones: 'Conversaciones',
  pide_agente: 'Pide agente humano',
  whatsapp: 'WhatsApp Cloud API',
  bot_ia: 'Bot IA',
  catalogo: 'Catálogo',
  pedidos: 'Pedidos',
  agenda: 'Agenda',
  automatizaciones: 'Automatizaciones',
  integraciones: 'Integraciones',
  pagos: 'Pagos y suscripción',
  branding: 'Marca / logo',
  sugerencias: 'Sugerencias',
};

/** Orden para elegir la primera pantalla si no hay acceso al panel. */
export const DASHBOARD_FALLBACK_ORDER = [
  ['/dashboard/conversaciones', 'conversaciones'],
  ['/dashboard/pide-agente', 'pide_agente'],
  ['/dashboard/pedidos', 'pedidos'],
  ['/dashboard/auditoria-ia', 'pedidos'],
  ['/dashboard/agenda', 'agenda'],
  ['/dashboard/contactos', 'contactos'],
  ['/dashboard/whatsapp', 'whatsapp'],
  ['/dashboard/ia', 'bot_ia'],
  ['/dashboard/catalogo', 'catalogo'],
  ['/dashboard/automatizaciones', 'automatizaciones'],
  ['/dashboard/integraciones', 'integraciones'],
  ['/dashboard/pagos', 'pagos'],
  ['/dashboard/branding', 'branding'],
  ['/dashboard/sugerencias', 'sugerencias'],
  ['/dashboard/ayuda', null],
  ['/dashboard/mi-cuenta', null],
];

export function canAccess(usuario, key) {
  if (!usuario) return false;
  if (usuario.rol === 'super_admin') return true;
  if (usuario.es_admin_crm) return true;
  // Sesiones antiguas: admin sin objeto permisos del API (evita menú vacío / bloqueos)
  if (usuario.rol === 'admin' && (!usuario.permisos || typeof usuario.permisos !== 'object')) return true;
  if (!key) return true;
  return !!(usuario.permisos && usuario.permisos[key]);
}

export function firstDashboardPath(usuario) {
  if (canAccess(usuario, 'panel')) return '/dashboard';
  for (const [path, key] of DASHBOARD_FALLBACK_ORDER) {
    if (key == null || canAccess(usuario, key)) return path;
  }
  return '/dashboard/mi-cuenta';
}

/** Prefijos más largos primero para que coincida la ruta más específica. */
export const DASHBOARD_ROUTE_PERM = [
  ['/dashboard/pide-agente', 'pide_agente'],
  ['/dashboard/conversaciones', 'conversaciones'],
  ['/dashboard/automatizaciones', 'automatizaciones'],
  ['/dashboard/integraciones', 'integraciones'],
  ['/dashboard/contactos', 'contactos'],
  ['/dashboard/whatsapp', 'whatsapp'],
  ['/dashboard/catalogo', 'catalogo'],
  ['/dashboard/auditoria-ia', 'pedidos'],
  ['/dashboard/pedidos', 'pedidos'],
  ['/dashboard/agenda', 'agenda'],
  ['/dashboard/branding', 'branding'],
  ['/dashboard/sugerencias', 'sugerencias'],
  ['/dashboard/pagos', 'pagos'],
  ['/dashboard/ia', 'bot_ia'],
];
