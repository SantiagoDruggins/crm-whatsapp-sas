/** Datos de pago Nequi para planes (visible en Landing, Pagos y al vencer). */
export const NEQUI_PAGO = {
  telefono: '3185421192',
  nombre: 'Santiago Rubiano',
};

export function formatearNequiTelefono() {
  return NEQUI_PAGO.telefono.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
}
