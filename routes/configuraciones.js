const express    = require('express');
const router     = express.Router();
const Config     = require('../models/configuracion');
const Auditoria  = require('../models/auditoria');

// GET /api/config
router.get('/', async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) config = await Config.create({});
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener configuración', error: err.message });
  }
});

// POST /api/config
router.post('/', async (req, res) => {
  try {
    const { _auditUser, ...datosNuevos } = req.body;
    datosNuevos.actualizadoEn = Date.now();

    const anterior = await Config.findOne().lean();

    const config = await Config.findOneAndUpdate(
      {},
      datosNuevos,
      { new: true, upsert: true }
    );

    // ── Auditoría ──
    if (_auditUser?.id) {
      try {
        const Auditoria = require('../models/auditoria');
        await Auditoria.create({
          accion: 'CAMBIAR_CONFIG',
          realizadoPor: { id: _auditUser.id, nombre: _auditUser.nombre, role: _auditUser.role },
          entidad: { tipo: 'config', id: 'principal', nombre: 'Configuración del Sistema' },
          detalle: { anterior, nuevo: datosNuevos },
        });
      } catch (e) {
        console.error('⚠️  Error al guardar auditoría de config:', e.message);
      }
    }

    res.json({ message: 'Parámetros actualizados con éxito', config });
  } catch (err) {
    res.status(500).json({ message: 'Error al guardar configuración', error: err.message });
  }
});

module.exports = router;
