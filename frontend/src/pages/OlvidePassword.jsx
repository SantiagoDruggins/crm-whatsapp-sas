import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Indica tu email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/olvide-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el enlace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#8b9cad] hover:text-white text-sm font-medium mb-8">
          ← Volver a iniciar sesión
        </Link>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">¿Olvidaste tu contraseña?</h1>
          <p className="text-[#8b9cad] text-sm mb-6">
            Escribe el email de tu cuenta y te enviaremos un enlace para restablecerla.
          </p>
          {sent ? (
            <div className="rounded-xl bg-[#00c896]/10 border border-[#00c896]/30 p-4 text-[#00c896] text-sm">
              Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja y spam.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                  required
                  autoComplete="email"
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
                {loading ? 'Enviando...' : 'Enviar enlace'}
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
