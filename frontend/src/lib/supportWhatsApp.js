/** Respald: CO + teléfono Nequi del proyecto (ver `nequi.js`) si no defines env. */
const DEFAULT_WA_DIGITS = '573185421192';

/**
 * URL wa.me con dígitos internacionales (sin +).
 * @param {string} [prefill] Texto opcional para el parámetro `text`.
 */
export function getWhatsAppHelpHref(prefill = '') {
  const raw = import.meta.env.VITE_WHATSAPP_HELP_NUMBER;
  const fromEnv =
    raw != null && String(raw).trim() !== '' ? String(raw).replace(/\D/g, '') : '';
  let digits = fromEnv || DEFAULT_WA_DIGITS;
  if (!digits) digits = DEFAULT_WA_DIGITS;
  const q = prefill ? `?text=${encodeURIComponent(prefill)}` : '';
  return `https://wa.me/${digits}${q}`;
}
