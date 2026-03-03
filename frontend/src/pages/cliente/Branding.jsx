import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Branding() {
  const [empresa, setEmpresa] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('empresa') || '{}');
    } catch {
      return {};
    }
  });
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((r) => {
        if (r.empresa) {
          setEmpresa((prev) => ({ ...prev, ...r.empresa }));
          try {
            const prev = JSON.parse(localStorage.getItem('empresa') || '{}');
            const next = { ...prev, ...r.empresa };
            localStorage.setItem('empresa', JSON.stringify(next));
          } catch {
            // ignorar
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona una imagen de logo');
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    const fd = new FormData();
    fd.append('logo', archivo);
    api
      .upload('/crm/empresa/logo', fd)
      .then((r) => {
        const logoUrl = r.logo_url || r.empresa?.logo_url;
        if (logoUrl) {
          setEmpresa((prev) => ({ ...prev, ...(r.empresa || {}), logo_url: logoUrl }));
          try {
            const prev = JSON.parse(localStorage.getItem('empresa') || '{}');
            const next = { ...prev, ...(r.empresa || {}), logo_url: logoUrl };
            localStorage.setItem('empresa', JSON.stringify(next));
          } catch {
            // ignorar
          }
        }
        setOk('Logo actualizado correctamente.');
        setArchivo(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const nombre = empresa.nombre || 'Tu empresa';
  const inicial = nombre.trim().charAt(0).toUpperCase() || 'E';

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">Marca de tu panel</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Personaliza el logo que ves en el menú lateral. Así tu equipo sentirá que está usando el CRM propio de tu empresa.
      </p>

      <div className="grid md:grid-cols-[1.4fr,1fr] gap-6 items-start">
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Vista previa</h2>
          <div className="bg-[#0f1419] rounded-xl border border-[#2d3a47] p-4 flex items-center gap-3">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={nombre}
                className="h-10 w-10 rounded-lg bg-[#020617] object-contain border border-[#2d3a47]"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-[#00c896]/15 border border-[#00c896]/40 flex items-center justify-center text-[#00c896] font-bold text-sm">
                {inicial}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-[160px]">{nombre}</p>
              <p className="text-xs text-[#6b7a8a] truncate max-w-[200px]">
                Panel de WhatsApp + CRM con IA
              </p>
            </div>
          </div>
          <p className="text-xs text-[#8b9cad] mt-3">
            Este logo se usará solo dentro de tu panel. Más adelante podrás tener también dominio propio y marca blanca en la
            landing.
          </p>
        </div>

        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Subir logo</h2>
          {error && <p className="text-xs text-[#f87171] mb-2">{error}</p>}
          {ok && <p className="text-xs text-[#4ade80] mb-2">{ok}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-[#8b9cad] mb-1">Archivo de logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#8b9cad]"
              />
              <p className="text-[11px] text-[#6b7a8a] mt-1">
                Formatos recomendados: PNG o JPG con fondo transparente. Tamaño sugerido: 256x256px.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || !archivo}
              className="rounded-xl bg-[#00c896] text-[#0f1419] text-sm font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar logo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

