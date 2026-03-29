import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { CRM_PERM_LABELS } from '../../lib/crmPermissions';

export default function Equipo() {
  const [roles, setRoles] = useState([]);
  const [permKeys, setPermKeys] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [limiteUsuarios, setLimiteUsuarios] = useState(null);
  const [usuariosActivos, setUsuariosActivos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nuevoRol, setNuevoRol] = useState({ nombre: '', permisos: {} });
  const [editRol, setEditRol] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '', crm_role_id: '' });
  const [editUser, setEditUser] = useState(null);

  const load = useCallback(() => {
    setError('');
    Promise.all([api.get('/crm/equipo/roles'), api.get('/crm/equipo/usuarios')])
      .then(([r, u]) => {
        setRoles(r.roles || []);
        setPermKeys(r.permisos_disponibles || []);
        setUsuarios(u.usuarios || []);
        setLimiteUsuarios(u.limite_usuarios ?? null);
        setUsuariosActivos(u.usuarios_activos ?? 0);
      })
      .catch((e) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePermiso = (permisos, key) => ({ ...permisos, [key]: !permisos[key] });

  const guardarNuevoRol = (e) => {
    e.preventDefault();
    if (!nuevoRol.nombre?.trim()) return setError('Nombre del rol requerido');
    api
      .post('/crm/equipo/roles', { nombre: nuevoRol.nombre.trim(), permisos: nuevoRol.permisos, is_full_access: false })
      .then(() => {
        setNuevoRol({ nombre: '', permisos: {} });
        load();
      })
      .catch((err) => setError(err.message));
  };

  const guardarEdicionRol = (e) => {
    e.preventDefault();
    if (!editRol) return;
    api
      .patch(`/crm/equipo/roles/${editRol.id}`, {
        nombre: editRol.nombre,
        permisos: editRol.is_full_access ? undefined : editRol.permisos,
        is_full_access: editRol.is_full_access,
      })
      .then(() => {
        setEditRol(null);
        load();
      })
      .catch((err) => setError(err.message));
  };

  const borrarRol = (id) => {
    if (!window.confirm('¿Eliminar este rol? Solo si ningún usuario lo usa.')) return;
    api
      .delete(`/crm/equipo/roles/${id}`)
      .then(() => load())
      .catch((err) => setError(err.message));
  };

  const crearUsuario = (e) => {
    e.preventDefault();
    if (!nuevoUsuario.crm_role_id) return setError('Elige un rol');
    api
      .post('/crm/equipo/usuarios', {
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
        crm_role_id: nuevoUsuario.crm_role_id,
      })
      .then(() => {
        setNuevoUsuario({ nombre: '', email: '', password: '', crm_role_id: '' });
        load();
      })
      .catch((err) => setError(err.message));
  };

  const guardarUsuario = (e) => {
    e.preventDefault();
    if (!editUser) return;
    const body = {
      nombre: editUser.nombre,
      email: editUser.email,
      crm_role_id: editUser.crm_role_id,
      is_active: editUser.is_active,
    };
    if (editUser.password_nueva?.trim()) body.password_nueva = editUser.password_nueva.trim();
    api
      .patch(`/crm/equipo/usuarios/${editUser.id}`, body)
      .then(() => {
        setEditUser(null);
        load();
      })
      .catch((err) => setError(err.message));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando equipo…</p>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-2">Equipo y roles</h1>
      <p className="text-[#8b9cad] text-sm mb-6">
        Crea roles con permisos por módulo y añade empleados con su correo y contraseña. Solo los administradores de la empresa ven esta
        página.
        {limiteUsuarios != null && (
          <span className="block mt-1 text-[#00c896]">
            Usuarios activos: {usuariosActivos} / {limiteUsuarios} (según tu plan).
          </span>
        )}
      </p>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-3">Roles</h2>
        <div className="space-y-3 mb-6">
          {roles.map((r) => (
            <div key={r.id} className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-white font-medium">{r.nombre}</p>
                {r.is_full_access ? (
                  <p className="text-xs text-[#00c896] mt-1">Acceso total a todos los módulos</p>
                ) : (
                  <ul className="text-xs text-[#8b9cad] mt-2 space-y-0.5">
                    {permKeys
                      .filter((k) => r.permisos && r.permisos[k])
                      .map((k) => (
                        <li key={k}>✓ {CRM_PERM_LABELS[k] || k}</li>
                      ))}
                    {permKeys.every((k) => !r.permisos?.[k]) && <li>Sin permisos marcados</li>}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditRol({
                      id: r.id,
                      nombre: r.nombre,
                      is_full_access: r.is_full_access,
                      permisos: r.permisos || {},
                    })
                  }
                  className="text-xs text-[#00c896] hover:underline"
                >
                  Editar
                </button>
                {!r.is_full_access && (
                  <button type="button" onClick={() => borrarRol(r.id)} className="text-xs text-[#f87171] hover:underline">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={guardarNuevoRol} className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-white mb-3">Nuevo rol (empleado)</p>
          <div className="flex flex-wrap gap-3 mb-3">
            <input
              value={nuevoRol.nombre}
              onChange={(e) => setNuevoRol((x) => ({ ...x, nombre: e.target.value }))}
              placeholder="Nombre del rol (ej. Soporte, Ventas)"
              className="flex-1 min-w-[200px] rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            />
            <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 text-sm">
              Crear rol
            </button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {permKeys.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-[#c5d0dc] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!nuevoRol.permisos[k]}
                  onChange={() => setNuevoRol((x) => ({ ...x, permisos: togglePermiso(x.permisos, k) }))}
                />
                {CRM_PERM_LABELS[k] || k}
              </label>
            ))}
          </div>
        </form>
      </section>

      {editRol && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditRol(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-3">Editar rol</h3>
            <form onSubmit={guardarEdicionRol} className="space-y-3">
              <input
                value={editRol.nombre}
                onChange={(e) => setEditRol((x) => ({ ...x, nombre: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              />
              {editRol.is_full_access ? (
                <p className="text-xs text-[#8b9cad]">Este rol tiene acceso total; no se pueden quitar módulos individuales.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {permKeys.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm text-[#c5d0dc]">
                      <input
                        type="checkbox"
                        checked={!!editRol.permisos[k]}
                        onChange={() => setEditRol((x) => ({ ...x, permisos: togglePermiso(x.permisos, k) }))}
                      />
                      {CRM_PERM_LABELS[k] || k}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditRol(null)} className="px-4 py-2 text-sm text-[#8b9cad]">
                  Cancelar
                </button>
                <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 text-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Usuarios</h2>
        <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2d3a47] text-[#8b9cad]">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rol CRM</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="text-[#e9edef]">
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-[#2d3a47]/80">
                  <td className="px-4 py-2">{u.nombre}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.crm_rol_nombre || '—'}</td>
                  <td className="px-4 py-2">{u.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-2">
                    <button type="button" className="text-[#00c896] text-xs hover:underline" onClick={() => setEditUser({ ...u, password_nueva: '' })}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={crearUsuario} className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-4 space-y-3 max-w-md">
          <p className="text-sm font-medium text-white">Nuevo usuario</p>
          <input
            value={nuevoUsuario.nombre}
            onChange={(e) => setNuevoUsuario((x) => ({ ...x, nombre: e.target.value }))}
            placeholder="Nombre"
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            required
          />
          <input
            type="email"
            value={nuevoUsuario.email}
            onChange={(e) => setNuevoUsuario((x) => ({ ...x, email: e.target.value }))}
            placeholder="Email (inicio de sesión)"
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            required
          />
          <input
            type="password"
            value={nuevoUsuario.password}
            onChange={(e) => setNuevoUsuario((x) => ({ ...x, password: e.target.value }))}
            placeholder="Contraseña inicial (mín. 6 caracteres)"
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            required
            minLength={6}
          />
          <select
            value={nuevoUsuario.crm_role_id}
            onChange={(e) => setNuevoUsuario((x) => ({ ...x, crm_role_id: e.target.value }))}
            className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
            required
          >
            <option value="">— Rol —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 text-sm">
            Crear usuario
          </button>
        </form>
      </section>

      {editUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditUser(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-3">Editar usuario</h3>
            <form onSubmit={guardarUsuario} className="space-y-3">
              <input
                value={editUser.nombre}
                onChange={(e) => setEditUser((x) => ({ ...x, nombre: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              />
              <input
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser((x) => ({ ...x, email: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              />
              <select
                value={editUser.crm_role_id || ''}
                onChange={(e) => setEditUser((x) => ({ ...x, crm_role_id: e.target.value }))}
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-[#c5d0dc]">
                <input
                  type="checkbox"
                  checked={!!editUser.is_active}
                  onChange={(e) => setEditUser((x) => ({ ...x, is_active: e.target.checked }))}
                />
                Activo
              </label>
              <input
                type="password"
                value={editUser.password_nueva || ''}
                onChange={(e) => setEditUser((x) => ({ ...x, password_nueva: e.target.value }))}
                placeholder="Nueva contraseña (opcional)"
                className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-[#8b9cad]">
                  Cancelar
                </button>
                <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 text-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
