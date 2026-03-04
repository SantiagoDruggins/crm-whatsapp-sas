import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState({ nueva: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Falta el enlace de restablecimiento. Solicita uno nuevo desde "Olvidé mi contraseña".');
      return;
    }
    if (password.nueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password.nueva !== password.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password_nueva: password.nueva });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (!token.trim()) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Enlace inválido</h1>
            <p className="text-[#8b9cad] text-sm mb-6">
              Falta el token de restablecimiento. Entra desde el enlace que te enviamos por email o solicita uno nuevo.
            </p>
            <Link to="/olvide-password" className="inline-block rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
              Solicitar enlace
            </Link>
            <p className="mt-6">
              <Link to="/login" className="text-[#00c896] hover:text-[#00e0a8] text-sm">Volver al login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#8b9cad] hover:text-white text-sm font-medium mb-8">
          ← Volver a iniciar sesión
        </Link>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Nueva contraseña</h1>
          <p className="text-[#8b9cad] text-sm mb-6">
            Elige una contraseña de al menos 6 caracteres.
          </p>
          {done ? (
            <div className="rounded-xl bg-[#00c896]/10 border border-[#00c896]/30 p-4 text-[#00c896] text-sm">
              Contraseña actualizada. Redirigiendo al login...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={password.nueva}
                  onChange={(e) => setPassword((p) => ({ ...p, nueva: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={password.confirmar}
                  onChange={(e) => setPassword((p) => ({ ...p, confirmar: e.target.value }))}
                  placeholder="Repite la contraseña"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p className="text-sm text-[#f87171] bg-[#f87171]/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00c896] text-[#0f1419] font-semibold py-3 hover:bg-[#00e0a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
          )}
          <p className="text-center text-[#8b9cad] text-sm mt-6">
            <Link to="/login" className="text-[#00c896] hover:text-[#00e0a8] font-medium">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
