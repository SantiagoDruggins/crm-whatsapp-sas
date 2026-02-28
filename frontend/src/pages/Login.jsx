import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email?.trim() || !form.password) {
      setError('Email y contraseña son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      if (data.usuario?.empresa_id) localStorage.setItem('empresa', JSON.stringify({ id: data.usuario.empresa_id }));
      if (data.usuario?.rol === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-[#8b9cad] hover:text-white text-sm font-medium mb-8">
          ← Volver a ChatProBusiness
        </Link>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
          <p className="text-[#8b9cad] text-sm mb-6">Accede a tu panel de ChatProBusiness.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@empresa.com"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Tu contraseña"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                required
                autoComplete="current-password"
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center text-[#8b9cad] text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-[#00c896] hover:text-[#00e0a8] font-medium">
              Crear demo gratis
            </Link>
          </p>
          <p className="text-center text-[#8b9cad] text-sm mt-2">
            ¿Eres el dueño del sistema?{' '}
            <Link to="/crear-super-admin" className="text-[#00c896] hover:text-[#00e0a8] font-medium">
              Crear super admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
