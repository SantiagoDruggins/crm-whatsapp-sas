const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis
});

pool.on('error', (err) => console.error('Error en pool PostgreSQL', err));

const query = (text, params) => pool.query(text, params);
module.exports = { pool, query };
