import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function MiCuenta() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usuario, setUsuario] = useState({ nombre: '', email: '', rol: '', last_login_at: null });
  const [perfil, setPerfil] = useState({ nombre: '', email: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [password, setPassword] = useState({ actual: '', nueva: '', confirmar: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => {
        const u = r.usuario || {};
        setUsuario(u);
        setPerfil({ nombre: u.nombre || '', email: u.email || '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleGuardarPerfil = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingPerfil(true);
    api
      .patch('/auth/me', { nombre: perfil.nombre.trim(), email: perfil.email.trim() })
      .then((r) => {
        setUsuario((prev) => ({ ...prev, ...r.usuario }));
        try {
          const stored = JSON.parse(localStorage.getItem('usuario') || '{}');
          localStorage.setItem('usuario', JSON.stringify({ ...stored, nombre: r.usuario?.nombre, email: r.usuario?.email }));
        } catch (_) {}
        setSuccess('Datos actualizados correctamente.');
      })
      .catch((e) => setError(e.message))
      .finally(() => setSavingPerfil(false));
  };

  const handleCambiarPassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.nueva !== password.confirmar) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    if (password.nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSavingPassword(true);
    api
      .post('/auth/cambiar-password', { password_actual: password.actual, password_nueva: password.nueva })
      .then(() => {
        setSuccess('Contraseña actualizada correctamente.');
        setPassword({ actual: '', nueva: '', confirmar: '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setSavingPassword(false));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Mi cuenta</h1>
      {error && <p className="mb-4 text-sm text-[#f87171]">{error}</p>}
      {success && <p className="mb-4 text-sm text-[#00c896]">{success}</p>}

      <div className="space-y-6 max-w-xl">
        <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Datos del perfil</h2>
          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nombre</label>
              <input
                type="text"
                value={perfil.nombre}
                onChange={(e) => setPerfil((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Email</label>
              <input
                type="email"
                value={perfil.email}
                onChange={(e) => setPerfil((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                placeholder="tu@email.com"
              />
              <p className="text-xs text-[#6b7a8a] mt-1">El email es tu usuario para iniciar sesión. Si lo cambias, deberás usarlo en el próximo login.</p>
            </div>
            <p className="text-xs text-[#6b7a8a]">Rol: {usuario.rol || '—'} {usuario.last_login_at ? `· Último acceso: ${new Date(usuario.last_login_at).toLocaleString()}` : ''}</p>
            <button type="submit" disabled={savingPerfil} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
              {savingPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Contraseña actual</label>
              <input
                type="password"
                value={password.actual}
                onChange={(e) => setPassword((p) => ({ ...p, actual: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password.nueva}
                onChange={(e) => setPassword((p) => ({ ...p, nueva: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={password.confirmar}
                onChange={(e) => setPassword((p) => ({ ...p, confirmar: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]"
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={savingPassword} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] disabled:opacity-50">
              {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
