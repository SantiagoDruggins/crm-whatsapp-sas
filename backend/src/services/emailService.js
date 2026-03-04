const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { smtp } = config;
  if (!smtp?.host || !smtp?.user || !smtp?.pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass }
  });
  return transporter;
}

/**
 * Envía un correo. Retorna { ok: true } o { ok: false, error }.
 * Si SMTP no está configurado, retorna { ok: false } sin lanzar.
 */
async function sendMail({ to, subject, text, html }) {
  const trans = getTransporter();
  if (!trans) {
    console.warn('[Email] SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS). No se envió correo a', to);
    return { ok: false, error: 'Email no configurado' };
  }
  try {
    const { smtp } = config;
    await trans.sendMail({
      from: smtp.from || smtp.user,
      to,
      subject: subject || 'ChatProBusiness',
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || text
    });
    return { ok: true };
  } catch (err) {
    console.error('[Email] Error enviando a', to, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail, getTransporter };