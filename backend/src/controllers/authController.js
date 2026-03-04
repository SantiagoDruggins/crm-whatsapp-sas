const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { signToken } = require('../utils/jwt');
const config = require('../config/env');
const { crearEmpresaConDemo, obtenerEmpresaPorEmail } = require('../models/empresaModel');
const { crearUsuarioEmpresa, obtenerUsuarioPorEmailGlobal, actualizarLastLogin, getById, actualizarPerfil, actualizarPassword } = require('../models/usuarioModel');
const { query } = require('../config/db');
const { sendMail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;

async function getMe(req, res) {
  try {
    const user = await getById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ ok: true, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, empresa_id: user.empresa_id, last_login_at: user.last_login_at } });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarMiPerfil(req, res) {
  try {
    const { nombre, email } = req.body;
    const result = await actualizarPerfil(req.user.id, { nombre, email });
    if (result.error) return res.status(409).json({ message: result.error });
    if (!result.row) return res.status(400).json({ message: 'Nada que actualizar' });
    return res.json({ ok: true, usuario: { id: result.row.id, nombre: result.row.nombre, email: result.row.email, rol: result.row.rol } });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function cambiarPassword(req, res) {
  try {
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva) return res.status(400).json({ message: 'password_actual y password_nueva son requeridos' });
    const user = await query(`SELECT password_hash FROM usuarios WHERE id = $1`, [req.user.id]);
    if (!user.rows[0]) return res.status(404).json({ message: 'Usuario no encontrado' });
    const match = await bcrypt.compare(password_actual, user.rows[0].password_hash);
    if (!match) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    if (String(password_nueva).length < 6) return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    const passwordHash = await bcrypt.hash(password_nueva, SALT_ROUNDS);
    await actualizarPassword(req.user.id, passwordHash);
    return res.json({ ok: true, message: 'Contraseña actualizada' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

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

async function olvidePassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) return res.status(400).json({ message: 'El email es requerido' });
    const emailNorm = String(email).trim().toLowerCase();
    const usuario = await obtenerUsuarioPorEmailGlobal(emailNorm);
    if (!usuario) {
      return res.json({ ok: true, message: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    await query(
      `INSERT INTO password_reset_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)`,
      [usuario.id, token, expiresAt]
    );
    const baseUrl = (config.publicBaseUrl || '').replace(/\/$/, '') || 'https://dsgchatbot.pro';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const html = `
      <p>Hola${usuario.nombre ? ' ' + usuario.nombre : ''},</p>
      <p>Has solicitado restablecer la contraseña de tu cuenta en ChatProBusiness.</p>
      <p><a href="${resetLink}" style="display:inline-block;background:#00c896;color:#0f1419;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:600;">Restablecer contraseña</a></p>
      <p>Si no solicitaste esto, ignora este correo. El enlace caduca en ${RESET_TOKEN_EXPIRY_HOURS} hora(s).</p>
      <p>Si el botón no funciona, copia y pega en el navegador:</p>
      <p style="word-break:break-all;color:#6b7a8a;">${resetLink}</p>
    `;
    const sent = await sendMail({ to: usuario.email, subject: 'Restablecer contraseña - ChatProBusiness', html });
    if (!sent.ok) {
      console.warn('[Auth] No se pudo enviar email de recuperación:', sent.error);
    }
    return res.json({ ok: true, message: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.' });
  } catch (err) {
    console.error('olvidePassword', err);
    return res.status(500).json({ message: err.message || 'Error al procesar la solicitud' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password_nueva } = req.body;
    if (!token || !password_nueva) return res.status(400).json({ message: 'token y password_nueva son requeridos' });
    if (String(password_nueva).length < 6) return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    const row = await query(
      `SELECT id, usuario_id FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [String(token).trim()]
    );
    if (!row.rows[0]) return res.status(400).json({ message: 'Enlace inválido o expirado. Solicita uno nuevo desde "Olvidé mi contraseña".' });
    const { id: tokenId, usuario_id: userId } = row.rows[0];
    const passwordHash = await bcrypt.hash(password_nueva, SALT_ROUNDS);
    await query(`UPDATE usuarios SET password_hash = $1, updated_at = now() WHERE id = $2`, [passwordHash, userId]);
    await query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [tokenId]);
    return res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('resetPassword', err);
    return res.status(500).json({ message: err.message || 'Error al restablecer contraseña' });
  }
}

module.exports = { registrarEmpresa, login, generarSuperAdmin, getMe, actualizarMiPerfil, cambiarPassword, olvidePassword, resetPassword };
