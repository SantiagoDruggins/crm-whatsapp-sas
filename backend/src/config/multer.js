const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dirComprobantes = path.join(process.cwd(), 'uploads', 'comprobantes');
const dirBotConocimiento = path.join(process.cwd(), 'uploads', 'bot-conocimiento');
const dirProductos = path.join(process.cwd(), 'uploads', 'productos');
try { fs.mkdirSync(dirComprobantes, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirBotConocimiento, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirProductos, { recursive: true }); } catch (e) {}

const storageComprobantes = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirComprobantes); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safe = /\.(jpe?g|png|gif|webp)$/.test(ext) ? ext : '.jpg';
    cb(null, uuidv4() + safe);
  }
});

const storageBotConocimiento = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirBotConocimiento); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 6);
    const safe = ext || '.bin';
    cb(null, uuidv4() + safe);
  }
});

const storageProductos = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirProductos); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safe = /\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.jpg';
    cb(null, uuidv4() + safe);
  }
});

const uploadComprobante = multer({
  storage: storageComprobantes,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
    if (ok) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, gif, webp)'));
  }
});

const uploadBotConocimiento = multer({
  storage: storageBotConocimiento,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(pdf|txt|doc|docx|jpe?g|png|gif|webp)$/i.test(file.originalname) ||
      (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('text') || file.mimetype.includes('document')));
    if (ok) cb(null, true);
    else cb(new Error('Solo PDF, TXT, DOC o imágenes'));
  }
});

const uploadProductoImagen = multer({
  storage: storageProductos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
    if (ok) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, gif, webp)'));
  }
});

module.exports = { uploadComprobante, uploadBotConocimiento, uploadProductoImagen, dirComprobantes, dirBotConocimiento, dirProductos };
