const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dirComprobantes = path.join(process.cwd(), 'uploads', 'comprobantes');
const dirBotConocimiento = path.join(process.cwd(), 'uploads', 'bot-conocimiento');
const dirProductos = path.join(process.cwd(), 'uploads', 'productos');
const dirEmpresas = path.join(process.cwd(), 'uploads', 'empresas');
try { fs.mkdirSync(dirComprobantes, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirBotConocimiento, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirProductos, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirEmpresas, { recursive: true }); } catch (e) {}

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

const storageEmpresaLogo = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirEmpresas); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    const safe = /\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.png';
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
  // 15MB para evitar 413 en fotos grandes (servicios suelen tener banners pesados)
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
    if (ok) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, gif, webp)'));
  }
});

const uploadEmpresaLogo = multer({
  storage: storageEmpresaLogo,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
    if (ok) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, gif, webp)'));
  }
});

const uploadConversacionAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const okMime = mime.startsWith('audio/');
    const okExt = /\.(ogg|oga|opus|mp3|mpeg|m4a|aac|amr|wav|webm)$/i.test(name);
    if (okMime || okExt) cb(null, true);
    else cb(new Error('Solo archivos de audio'));
  }
});

module.exports = {
  uploadComprobante,
  uploadBotConocimiento,
  uploadProductoImagen,
  uploadEmpresaLogo,
  uploadConversacionAudio,
  dirComprobantes,
  dirBotConocimiento,
  dirProductos,
  dirEmpresas,
};

