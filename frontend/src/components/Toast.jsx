import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const ICONS = {
  mensaje: '💬',
  cita: '📅',
  pedido: '📦',
  default: '🔔',
};

export default function Toast({ id, type = 'default', title, message, linkTo, linkLabel, onDismiss, autoDismissMs = 6000 }) {
  useEffect(() => {
    if (autoDismissMs && onDismiss) {
      const t = setTimeout(() => onDismiss(id), autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [id, autoDismissMs, onDismiss]);

  const icon = ICONS[type] ?? ICONS.default;
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-[#2d3a47] bg-[#1a2129] p-4 shadow-lg shadow-black/40 min-w-[280px] max-w-[360px] transition-all duration-300"
      role="alert"
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-white text-sm">{title}</p>}
        <p className="text-[#8b9cad] text-sm mt-0.5">{message}</p>
        {linkTo && (
          <Link
            to={linkTo}
            className="inline-block mt-2 text-sm font-medium text-[#00c896] hover:text-[#00e0a8]"
            onClick={() => onDismiss?.(id)}
          >
            {linkLabel || 'Ver'}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss?.(id)}
        className="flex-shrink-0 text-[#6b7a8a] hover:text-white p-1"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-3">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
