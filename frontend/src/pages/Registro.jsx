import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Registro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre_empresa: '',
    email_empresa: '',
    password: '',
    password_confirm: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password_confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!form.nombre_empresa?.trim() || !form.email_empresa?.trim()) {
      setError('Nombre de empresa y email son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/registro-empresa', {
        nombre_empresa: form.nombre_empresa.trim(),
        email_empresa: form.email_empresa.trim().toLowerCase(),
        password: form.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      localStorage.setItem('empresa', JSON.stringify(data.empresa));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.');
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
          <h1 className="text-2xl font-bold text-white mb-1">Crear tu demo gratis</h1>
          <p className="text-[#8b9cad] text-sm mb-6">3 días de prueba. Sin tarjeta.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nombre de la empresa</label>
              <input
                type="text"
                name="nombre_empresa"
                value={form.nombre_empresa}
                onChange={handleChange}
                placeholder="Mi Negocio"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896] focus:border-transparent"
                required
                autoComplete="organization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Email (será tu usuario admin)</label>
              <input
                type="email"
                name="email_empresa"
                value={form.email_empresa}
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
                name="password_confirm"
                value={form.password_confirm}
                onChange={handleChange}
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
              {loading ? 'Creando cuenta...' : 'Crear mi demo gratis'}
            </button>
          </form>
          <p className="text-center text-[#8b9cad] text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#00c896] hover:text-[#00e0a8] font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
