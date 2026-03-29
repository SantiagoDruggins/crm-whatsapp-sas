/** URL para servir /uploads/... vía /api/uploads en el mismo origen. */
export function contactAssetUrl(url) {
  if (!url || !String(url).trim()) return '';
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = import.meta.env.VITE_UPLOADS_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = u.startsWith('/') ? u : `/${u}`;
  if (path.startsWith('/uploads/')) return `${base}/api${path}`;
  return `${base}${path}`;
}

export function hueFromPhone(phone) {
  const s = String(phone || '0').replace(/\D/g, '') || '0';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Iniciales para avatar (nombre legible o últimos dígitos del teléfono). */
export function contactInitials({ nombre, apellidos, telefono, nombreCompleto }) {
  const full = nombreCompleto != null ? String(nombreCompleto).trim() : [nombre, apellidos].filter(Boolean).join(' ').trim();
  const phone = String(telefono || '').replace(/\D/g, '');
  const soloDigitosNombre = full && /^[\d\s+\-]{8,}$/.test(full.trim());
  if (full && !soloDigitosNombre) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return full.slice(0, 2).toUpperCase();
  }
  if (phone.length >= 2) return phone.slice(-2);
  return full ? full.charAt(0).toUpperCase() : '?';
}
