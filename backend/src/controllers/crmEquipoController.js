const bcrypt = require('bcrypt');
const {
  listarPorEmpresa: listRoles,
  crear: crearRol,
  actualizar: actualizarRol,
  eliminar: eliminarRol,
  obtenerPorId: obtenerRol,
} = require('../models/crmRoleModel');
const {
  listarPorEmpresa: listUsers,
  crearUsuarioEmpresa,
  contarActivosPorEmpresa,
  obtenerPorIdEmpresa,
  actualizarUsuarioEmpresa,
  establecerPassword,
  obtenerUsuarioPorEmailGlobal,
} = require('../models/usuarioModel');
const { getLimitsForEmpresa } = require('../models/planModel');
const { normalizePermisos, CRM_PERMISSION_KEYS } = require('../lib/crmPermissions');

const SALT_ROUNDS = 10;

function permisosKeysDoc() {
  return CRM_PERMISSION_KEYS;
}

async function getRoles(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const roles = await listRoles(empresaId);
    const rolesOut = roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      is_full_access: r.is_full_access,
      permisos: r.is_full_access ? null : normalizePermisos(r.permisos),
    }));
    return res.json({ ok: true, roles: rolesOut, permisos_disponibles: permisosKeysDoc() });
  } catch (err) {
    console.error('getRoles', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function postRol(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { nombre, permisos, is_full_access } = req.body;
    const row = await crearRol(empresaId, { nombre, permisos, is_full_access });
    return res.status(201).json({
      ok: true,
      rol: {
        id: row.id,
        nombre: row.nombre,
        is_full_access: row.is_full_access,
        permisos: row.is_full_access ? null : normalizePermisos(row.permisos),
      },
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
    console.error('postRol', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function patchRol(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { id } = req.params;
    const { nombre, permisos, is_full_access } = req.body;
    const prev = await obtenerRol(id, empresaId);
    if (!prev) return res.status(404).json({ message: 'Rol no encontrado' });
    if (prev.is_full_access && is_full_access === false) {
      return res.status(400).json({ message: 'No puedes quitar el acceso total a un rol de administrador.' });
    }
    const row = await actualizarRol(id, empresaId, { nombre, permisos, is_full_access });
    if (!row) return res.status(404).json({ message: 'Rol no encontrado' });
    return res.json({
      ok: true,
      rol: {
        id: row.id,
        nombre: row.nombre,
        is_full_access: row.is_full_access,
        permisos: row.is_full_access ? null : normalizePermisos(row.permisos),
      },
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
    console.error('patchRol', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function deleteRol(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { id } = req.params;
    const result = await eliminarRol(id, empresaId);
    if (!result.ok) return res.status(400).json({ message: result.error || 'No se pudo eliminar' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteRol', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function getUsuarios(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const usuarios = await listUsers(empresaId);
    const out = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      is_active: u.is_active,
      crm_role_id: u.crm_role_id,
      crm_rol_nombre: u.crm_rol_nombre,
      crm_rol_full_access: u.crm_rol_full_access,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
    }));
    const limits = await getLimitsForEmpresa(empresaId);
    const activos = await contarActivosPorEmpresa(empresaId);
    return res.json({
      ok: true,
      usuarios: out,
      limite_usuarios: limits.max_usuarios,
      usuarios_activos: activos,
    });
  } catch (err) {
    console.error('getUsuarios', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function postUsuario(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { nombre, email, password, crm_role_id } = req.body;
    if (!nombre?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'nombre, email y password son requeridos' });
    }
    if (String(password).length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    if (!crm_role_id) return res.status(400).json({ message: 'crm_role_id es requerido' });

    const limits = await getLimitsForEmpresa(empresaId);
    const activos = await contarActivosPorEmpresa(empresaId);
    if (limits.max_usuarios != null && activos >= limits.max_usuarios) {
      return res.status(403).json({
        message: `Has alcanzado el límite de usuarios de tu plan (${limits.max_usuarios}). Actualiza el plan para añadir más.`,
        code: 'LIMITE_USUARIOS',
      });
    }

    const rolRow = await obtenerRol(crm_role_id, empresaId);
    if (!rolRow) return res.status(400).json({ message: 'Rol no válido para esta empresa' });

    const existente = await obtenerUsuarioPorEmailGlobal(String(email).trim().toLowerCase());
    if (existente) return res.status(409).json({ message: 'Ya existe un usuario con ese email' });

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const u = await crearUsuarioEmpresa({
      empresaId,
      nombre: String(nombre).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      rol: 'agente',
      crmRoleId: rolRow.id,
    });
    return res.status(201).json({
      ok: true,
      usuario: {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        crm_role_id: u.crm_role_id,
      },
    });
  } catch (err) {
    console.error('postUsuario', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function patchUsuario(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { id } = req.params;
    const { nombre, email, crm_role_id, is_active, password_nueva } = req.body;

    if (req.user.id === id) {
      if (is_active === false) return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
      if (crm_role_id != null && String(crm_role_id) !== String(req.user.crmRoleId || '')) {
        return res.status(400).json({ message: 'No puedes cambiar tu propio rol desde aquí; usa otro administrador.' });
      }
    }

    if (crm_role_id != null) {
      const rolRow = await obtenerRol(crm_role_id, empresaId);
      if (!rolRow) return res.status(400).json({ message: 'Rol no válido' });
    }

    if (password_nueva) {
      if (String(password_nueva).length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      const target = await obtenerPorIdEmpresa(id, empresaId);
      if (!target) return res.status(404).json({ message: 'Usuario no encontrado' });
      const passwordHash = await bcrypt.hash(String(password_nueva), SALT_ROUNDS);
      await establecerPassword(id, passwordHash);
    }

    const result = await actualizarUsuarioEmpresa(id, empresaId, { nombre, email, crm_role_id, is_active });
    if (result.error) return res.status(400).json({ message: result.error });
    const row = result.row;
    return res.json({
      ok: true,
      usuario: {
        id: row.id,
        nombre: row.nombre,
        email: row.email,
        rol: row.rol,
        crm_role_id: row.crm_role_id,
      },
    });
  } catch (err) {
    console.error('patchUsuario', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  getRoles,
  postRol,
  patchRol,
  deleteRol,
  getUsuarios,
  postUsuario,
  patchUsuario,
};
