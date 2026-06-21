const mongoose = require('mongoose');
const cors     = require('cors');
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const os       = require('os');

// ── Modelos ────────────────────────────────────────────────────────
require('./models/sensor');
require('./models/personal');
require('./models/configuracion');
require('./models/estado');
require('./models/auditoria');
require('./models/sesion');

// ── Rutas ──────────────────────────────────────────────────────────
const rutasSensores      = require('./routes/sensores');
const rutasEmpleados     = require('./routes/empleados');
const rutasConfiguracion = require('./routes/configuraciones');
const rutasEstados       = require('./routes/estados');
const rutasAuditoria     = require('./routes/auditorias');
const rutasSesiones      = require('./routes/sesiones');
const rutasPdf           = require('./routes/pdf');  

const app    = express();
const server = http.createServer(app);

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada (el servidor sigue corriendo):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada sin manejar (el servidor sigue corriendo):', reason);
});

// ── Socket.IO (tiempo real ESP32 → App vía WiFi) ──────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('sensor_data', async (data) => {
    try {
      const Sensor = mongoose.model('Sensor');
      const nuevo  = new Sensor({
        temperatura: data.temp ?? data.temperatura,
        voltaje:     data.volt ?? data.voltaje,
        humedad:     data.hum  ?? data.humedad,
      });
      await nuevo.save();
      io.emit('sensor_update', nuevo);
      console.log(`Sensor guardado y emitido: ${nuevo.temperatura}°C`);
    } catch (err) {
      console.error('Error guardando sensor:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// ── Middlewares ────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// ── Rutas API ──────────────────────────────────────────────────────
app.use('/api/sensores',    rutasSensores);
app.use('/api/empleados',   rutasEmpleados);
app.use('/api/config',      rutasConfiguracion);
app.use('/api/estados',     rutasEstados);
app.use('/api/auditoria',   rutasAuditoria);
app.use('/api/sesiones',    rutasSesiones);
app.use('/api/pdf',         rutasPdf);

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Obtener IP local (para mostrar al iniciar) ─────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ── Conexión y arranque ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://0.0.0.0:27017/sentinelDB')
  .then(() => {
    console.log('🟢 Sentinel-Cold: Conectado a MongoDB');
    server.listen(PORT, '0.0.0.0', () => {
      const ip = getLocalIP();
      console.log('');
      console.log('🚀 ══════════════════════════════════════════');
      console.log(`   SENTINEL COLD — SERVIDOR ACTIVO`);
      console.log(`   Puerto  : ${PORT}`);
      console.log(`   Red WiFi: http://${ip}:${PORT}`);
      console.log(`   Local   : http://localhost:${PORT}`);
      console.log('   ─────────────────────────────────────────');
      console.log(`   Configura la app con IP: ${ip}`);
      console.log('🚀 ══════════════════════════════════════════');
      console.log('');
    });
  })
  .catch(err => console.error('Error MongoDB:', err));