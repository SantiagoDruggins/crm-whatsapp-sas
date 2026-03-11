const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { iniciarCronSuscripciones } = require('./jobs/subscriptionCron');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const crmRoutes = require('./routes/crmRoutes');
const iaRoutes = require('./routes/iaRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const adminRoutes = require('./routes/adminRoutes');
const integracionesRoutes = require('./routes/integracionesRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const integracionesWebhookRoutes = require('./routes/integracionesWebhookRoutes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.env === 'production' ? config.corsOrigin || '*' : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Para despliegues donde Nginx solo proxya /api, también servimos uploads bajo /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integraciones', integracionesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/integraciones-webhook', integracionesWebhookRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', env: config.env }));

app.use((err, req, res, next) => {
  // Body demasiado grande (JSON)
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request Entity Too Large: el contenido excede el límite permitido.' });
  }
  // Multer: archivo demasiado grande
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message === 'File too large')) {
    return res.status(413).json({ message: 'La imagen es demasiado pesada. Prueba con una más liviana (o comprímela).' });
  }
  console.error('Error no capturado:', err);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: config.env === 'development' ? err.message : undefined
  });
});

iniciarCronSuscripciones();
module.exports = app;
