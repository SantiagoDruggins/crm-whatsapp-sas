import { Link } from 'react-router-dom';

export default function NotificationPopup({ open, onClose, type, title, detail, linkTo, linkLabel }) {
  if (!open) return null;
  const icon = type === 'cita' ? '📅' : type === 'pedido' ? '📦' : '🔔';
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        className="relative bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        {detail && <p className="text-[#8b9cad] text-sm mb-4">{detail}</p>}
        <div className="flex gap-2">
          {linkTo && (
            <Link
              to={linkTo}
              className="flex-1 text-center rounded-xl bg-[#00c896] text-[#0f1419] font-semibold py-2.5 hover:bg-[#00e0a8]"
              onClick={onClose}
            >
              {linkLabel || 'Ver'}
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 rounded-xl border border-[#2d3a47] text-[#8b9cad] font-medium py-2.5 hover:bg-[#232d38]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
