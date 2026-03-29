const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dirComprobantes = path.join(process.cwd(), 'uploads', 'comprobantes');
const dirBotConocimiento = path.join(process.cwd(), 'uploads', 'bot-conocimiento');
const dirProductos = path.join(process.cwd(), 'uploads', 'productos');
const dirEmpresas = path.join(process.cwd(), 'uploads', 'empresas');
const dirFlowsMedia = path.join(process.cwd(), 'uploads', 'flows-media');
const dirConversaciones = path.join(process.cwd(), 'uploads', 'conversaciones');
const dirContactosAvatars = path.join(process.cwd(), 'uploads', 'contactos-avatars');
try { fs.mkdirSync(dirComprobantes, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirBotConocimiento, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirProductos, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirEmpresas, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirFlowsMedia, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirConversaciones, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(dirContactosAvatars, { recursive: true }); } catch (e) {}

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

const storageContactoAvatar = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirContactosAvatars); },
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

const uploadContactoAvatar = multer({
  storage: storageContactoAvatar,
  limits: { fileSize: 2 * 1024 * 1024 },
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

const storageFlowMedia = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirFlowsMedia); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10);
    cb(null, `${uuidv4()}${ext || '.bin'}`);
  }
});

const storageConversacionImagen = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirConversaciones); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safe = /\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.jpg';
    cb(null, uuidv4() + safe);
  }
});

const storageConversacionDocumento = multer.diskStorage({
  destination(req, file, cb) { cb(null, dirConversaciones); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 12);
    cb(null, `${uuidv4()}${ext || '.pdf'}`);
  }
});

const uploadFlowMedia = multer({
  storage: storageFlowMedia,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const isAudio = mime.startsWith('audio/') || /\.(ogg|oga|opus|mp3|mpeg|m4a|aac|amr|wav|webm)$/i.test(name);
    const isDoc = /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv)$/i.test(name) ||
      /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument|text\/plain|text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation)/i.test(mime);
    if (isAudio || isDoc) cb(null, true);
    else cb(new Error('Solo audio o documentos compatibles'));
  }
});

const uploadConversacionImagen = multer({
  storage: storageConversacionImagen,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
    if (ok) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, gif, webp)'));
  }
});

const uploadConversacionDocumento = multer({
  storage: storageConversacionDocumento,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const isDoc = /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv|zip)$/i.test(name) ||
      /(application\/pdf|application\/msword|application\/vnd\.openxmlformats|text\/plain|text\/csv|application\/vnd\.ms-excel|application\/zip)/i.test(mime);
    if (isDoc) cb(null, true);
    else cb(new Error('Solo documentos (pdf, office, txt, csv, zip)'));
  }
});

module.exports = {
  uploadComprobante,
  uploadBotConocimiento,
  uploadProductoImagen,
  uploadEmpresaLogo,
  uploadContactoAvatar,
  uploadConversacionAudio,
  uploadConversacionImagen,
  uploadConversacionDocumento,
  uploadFlowMedia,
  dirComprobantes,
  dirBotConocimiento,
  dirProductos,
  dirEmpresas,
  dirContactosAvatars,
  dirFlowsMedia,
  dirConversaciones,
};

