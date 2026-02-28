const http = require('http');
const app = require('./app');
const config = require('./config/env');

const port = config.port || 4000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`API ChatProBusiness escuchando en puerto ${port}`);
});
