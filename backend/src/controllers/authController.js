const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { signToken } = require('../utils/jwt');
const { crearEmpresaConDemo, obtenerEmpresaPorEmail } = require('../models/empresaModel');
const { crearUsuarioEmpresa, obtenerUsuarioPorEmailGlobal, actualizarLastLogin } = require('../models/usuarioModel');
const { query } = require('../config/db');

const SALT_ROUNDS = 10;

async function registrarEmpresa(req, res) {
  try {
    const { nombre_empresa, email_empresa, password } = req.body;
    if (!nombre_empresa || !email_empresa || !password) return res.status(400).json({ message: 'nombre_empresa, email_empresa y password son requeridos' });
    const existente = await obtenerEmpresaPorEmail(email_empresa);
    if (existente) return res.status(409).json({ message: 'Ya existe una empresa con ese email' });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const empresa = await crearEmpresaConDemo({ nombre: nombre_empresa, email: email_empresa, passwordHash });
    const adminUsuario = await crearUsuarioEmpresa({ empresaId: empresa.id, nombre: empresa.nombre, email: email_empresa, passwordHash, rol: 'admin' });
    const token = signToken({ userId: adminUsuario.id, empresaId: empresa.id, rol: adminUsuario.rol });
    return res.status(201).json({ message: 'Empresa registrada con demo de 3 días', token, empresa: { id: empresa.id, nombre: empresa.nombre, email: empresa.email, estado: empresa.estado, demo_expires_at: empresa.demo_expires_at, plan: empresa.plan }, usuario: { id: adminUsuario.id, nombre: adminUsuario.nombre, email: adminUsuario.email, rol: adminUsuario.rol } });
  } catch (err) {
    console.error('registrarEmpresa', err);
    return res.status(500).json({ message: err.message || 'Error al registrar empresa' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y password son requeridos' });
    const usuario = await obtenerUsuarioPorEmailGlobal(email);
    if (!usuario) return res.status(401).json({ message: 'Credenciales inválidas' });
    const match = await bcrypt.compare(password, usuario.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = signToken({ userId: usuario.id, empresaId: usuario.empresa_id, rol: usuario.rol });
    await actualizarLastLogin(usuario.id);
    return res.json({ message: 'Login exitoso', token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, empresa_id: usuario.empresa_id } });
  } catch (err) {
    console.error('login', err);
    return res.status(500).json({ message: err.message || 'Error al iniciar sesión' });
  }
}

async function generarSuperAdmin(req, res) {
  try {
    const { email, password, nombre } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y password son requeridos' });
    const existente = await obtenerUsuarioPorEmailGlobal(email);
    if (existente) return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(`INSERT INTO usuarios (id, empresa_id, nombre, email, password_hash, rol, is_active) VALUES ($1, NULL, $2, $3, $4, 'super_admin', TRUE) RETURNING *`, [uuidv4(), nombre || 'Super Admin', email, passwordHash]);
    return res.status(201).json({ message: 'Super admin creado', usuario: { id: result.rows[0].id, nombre: result.rows[0].nombre, email: result.rows[0].email, rol: result.rows[0].rol } });
  } catch (err) {
    console.error('generarSuperAdmin', err);
    return res.status(500).json({ message: err.message || 'Error al crear super admin' });
  }
}

module.exports = { registrarEmpresa, login, generarSuperAdmin };
