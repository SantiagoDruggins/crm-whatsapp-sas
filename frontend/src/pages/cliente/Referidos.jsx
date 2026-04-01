import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const estadoLabel = {
  registrado: 'Registrado',
  pagado: 'Pagado',
  recompensado: 'Recompensado',
};

export default function Referidos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ affiliate: null, referrals: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/referrals/me')
      .then((r) => {
        if (!active) return;
        setData({ affiliate: r.affiliate || null, referrals: r.referrals || [] });
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'No se pudieron cargar los referidos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalDias = useMemo(
    () => (data.referrals || []).reduce((acc, r) => acc + Number(r.reward_days || 0), 0),
    [data.referrals]
  );

  const copyLink = async () => {
    try {
      const url = data.affiliate?.invite_url || '';
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  if (loading) return <div className="text-[#8b9cad]">Cargando referidos...</div>;
  if (error) return <div className="text-[#f87171]">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-5">
        <h1 className="text-xl font-semibold text-white">Programa de referidos</h1>
        <p className="text-[#8b9cad] text-sm mt-1">
          Comparte tu enlace. Cuando una empresa referida pague su primer plan, ganas d&iacute;as extra.
        </p>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#2d3a47] bg-[#0f1419] p-3">
            <p className="text-xs text-[#8b9cad]">Tu c&oacute;digo</p>
            <p className="text-[#7be6c8] font-semibold tracking-wide mt-1">{data.affiliate?.code || '-'}</p>
          </div>
          <div className="rounded-xl border border-[#2d3a47] bg-[#0f1419] p-3">
            <p className="text-xs text-[#8b9cad]">Referidos</p>
            <p className="text-white font-semibold mt-1">{(data.referrals || []).length}</p>
          </div>
          <div className="rounded-xl border border-[#2d3a47] bg-[#0f1419] p-3">
            <p className="text-xs text-[#8b9cad]">D&iacute;as ganados</p>
            <p className="text-white font-semibold mt-1">+{totalDias}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={data.affiliate?.invite_url || ''}
            className="flex-1 rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-sm text-[#c6d2de]"
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-xl px-4 py-2 bg-[#00c896] text-[#0f1419] font-semibold hover:bg-[#00e0a8]"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-3">Invitaciones</h2>
        {(data.referrals || []).length === 0 ? (
          <p className="text-[#8b9cad] text-sm">A&uacute;n no tienes referidos registrados.</p>
        ) : (
          <div className="space-y-2">
            {data.referrals.map((r) => (
              <div key={r.id} className="rounded-xl border border-[#2d3a47] bg-[#0f1419] p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{r.empresa_referida_nombre || r.empresa_referida_email || 'Empresa referida'}</p>
                  <p className="text-xs text-[#8b9cad]">{r.empresa_referida_email || 'Sin email'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8b9cad]">{estadoLabel[r.estado] || r.estado}</p>
                  <p className="text-sm text-[#7be6c8] font-semibold">{Number(r.reward_days || 0) > 0 ? `+${r.reward_days} d` : '-'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
