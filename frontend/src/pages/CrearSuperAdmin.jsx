import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CrearSuperAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nombre: 'Super Admin' });

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
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/crear-super-admin', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        nombre: (form.nombre || 'Super Admin').trim(),
      });
      setOk(true);
    } catch (err) {
      setError(err.message || 'No se pudo crear el super admin.');
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a2129] border border-[#00c896] rounded-2xl p-8 text-center">
            <p className="text-[#00c896] font-semibold mb-4">Super admin creado correctamente.</p>
            <p className="text-[#8b9cad] text-sm mb-6">Ya puedes iniciar sesión con ese email y contraseña.</p>
            <Link to="/login" className="inline-block rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-6 py-3 hover:bg-[#00e0a8]">
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#8b9cad] hover:text-white text-sm font-medium mb-8">
          Volver al login
        </Link>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Crear super admin</h1>
          <p className="text-[#8b9cad] text-sm mb-6">Solo para el dueño del sistema. Crea la cuenta con la que accederás al panel de administración.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Nombre</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Super Admin" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896]" autoComplete="name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="admin@tudominio.com" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896]" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9cad] mb-1">Contraseña</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Minimo 6 caracteres" className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-3 text-white placeholder-[#6b7a8a] focus:outline-none focus:ring-2 focus:ring-[#00c896]" required minLength={6} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-[#f87171] bg-[#f87171]/10 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#00c896] text-[#0f1419] font-semibold py-3 hover:bg-[#00e0a8] disabled:opacity-50">
              {loading ? 'Creando...' : 'Crear super admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
