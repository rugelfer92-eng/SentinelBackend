const express   = require('express');
const router    = express.Router();
const Auditoria = require('../models/auditoria');

// GET /api/auditoria?fecha=2024-01-15&accion=CREAR_EMPLEADO&limite=100
router.get('/', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 100;
    const filtro = {};

    if (req.query.accion) filtro.accion = req.query.accion;

    if (req.query.fecha) {
      const inicio = new Date(req.query.fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(req.query.fecha);
      fin.setHours(23, 59, 59, 999);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const registros = await Auditoria.find(filtro).sort({ fecha: -1 }).limit(limite);
    res.json(registros);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener auditoría' });
  }
});

module.exports = router;