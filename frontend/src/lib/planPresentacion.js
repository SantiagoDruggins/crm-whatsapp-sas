/**
 * Textos de valor por plan (alineados con límites en DB: migración 010_plan_limits).
 * Un solo lugar para landing + panel Pagos.
 */

export function extrasPlanPorCodigo(codigo) {
  const c = String(codigo || '').trim();
  const map = {
    BASICO_MENSUAL: {
      badge: 'Ideal para empezar',
      tagline: 'Lanza tu atención por WhatsApp con IA sin fricción',
      destacado: false,
      features: [
        '1 usuario con acceso completo al panel',
        'Hasta 500 contactos en el CRM',
        'Bot IA + WhatsApp (historial y conversaciones centralizadas)',
        'Indicaciones y conocimiento del bot a tu medida',
        'Renovación mensual simple por Nequi',
      ],
    },
    PROFESIONAL_MENSUAL: {
      badge: 'Más elegido',
      tagline: 'Cuando ya no basta con una sola persona al chat',
      destacado: true,
      features: [
        'Hasta 3 usuarios: equipo atendiendo en paralelo',
        'Hasta 2.000 contactos para crecer sin saltar de plan pronto',
        'Todo lo del plan Básico incluido',
        'Mejor para negocios con volumen medio o turnos',
        'Mismo flujo de pago y activación por comprobante',
      ],
    },
    EMPRESARIAL_MENSUAL: {
      badge: 'Escala sin techos',
      tagline: 'Volumen alto, varias áreas o varias marcas bajo una cuenta',
      destacado: false,
      features: [
        'Usuarios ilimitados en tu empresa',
        'Contactos ilimitados (sin tope en el CRM)',
        'Todo lo del plan Profesional, sin restricciones de cupos',
        'Soporte prioritario y acompañamiento cuando más lo necesitas',
        'La opción cuando el chat es canal principal de ventas',
      ],
    },
  };
  return map[c] || { badge: null, tagline: '', destacado: false, features: [] };
}

/** Tarjetas de precios en la landing (precios COP; deben coincidir con la API / DB). */
export const LANDING_PLANES = [
  {
    codigo: 'BASICO_MENSUAL',
    nombre: 'Básico',
    precio: 39900,
    cta: 'Probar con demo gratis',
    ctaDestacado: false,
  },
  {
    codigo: 'PROFESIONAL_MENSUAL',
    nombre: 'Profesional',
    precio: 89900,
    cta: 'Empezar con demo',
    ctaDestacado: true,
  },
  {
    codigo: 'EMPRESARIAL_MENSUAL',
    nombre: 'Empresarial',
    precio: 149900,
    cta: 'Probar con demo gratis',
    ctaDestacado: false,
  },
];

/** Filas para tabla comparativa rápida en landing */
export const COMPARATIVA_PLANES = [
  { label: 'Usuarios en el panel', basico: '1', pro: 'Hasta 3', empresarial: 'Ilimitados' },
  { label: 'Contactos en CRM', basico: 'Hasta 500', pro: 'Hasta 2.000', empresarial: 'Ilimitados' },
  { label: 'Bot IA + WhatsApp', basico: true, pro: true, empresarial: true },
  { label: 'Historial y conversaciones', basico: true, pro: true, empresarial: true },
  { label: 'Soporte', basico: 'Estándar', pro: 'Estándar', empresarial: 'Prioritario' },
];

export function precioAproxPorDia(precioMensual) {
  const n = Number(precioMensual);
  if (!Number.isFinite(n) || n <= 0) return null;
  const dia = Math.round(n / 30);
  return dia.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function cellCheck(v) {
  if (v === true) return '✓';
  if (v === false) return '—';
  return v;
}

export function filasComparativaConCeldas() {
  return COMPARATIVA_PLANES.map((row) => ({
    label: row.label,
    basico: cellCheck(row.basico),
    pro: cellCheck(row.pro),
    empresarial: cellCheck(row.empresarial),
  }));
}
