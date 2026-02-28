import { NEQUI_PAGO, formatearNequiTelefono } from '../lib/nequi';

export default function ModalNequi({ open, onClose, titulo = 'Pago por Nequi' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      <div
        className="relative bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">{titulo}</h3>
        <div className="space-y-3 text-[#8b9cad]">
          <p className="text-sm">Realiza tu pago a:</p>
          <div className="bg-[#0f1419] rounded-xl p-4 border border-[#2d3a47]">
            <p className="text-white font-semibold text-lg">{formatearNequiTelefono()}</p>
            <p className="text-[#00c896] font-medium mt-1">{NEQUI_PAGO.nombre}</p>
          </div>
          <p className="text-xs">Sube el comprobante en la sección Pagos para activar tu plan en 24 h.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#00c896] text-[#0f1419] font-semibold py-2 hover:bg-[#00e0a8]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
