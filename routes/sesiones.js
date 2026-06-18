const express = require('express');
const router  = express.Router();
const Sesion  = require('../models/sesion');

// POST /api/sesiones  — registrar login o logout
router.post('/', async (req, res) => {
  try {
    const { usuario, accion, ip, dispositivo } = req.body;
    const sesion = await Sesion.create({ usuario, accion, ip, dispositivo });
    res.status(201).json(sesion);
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar sesión', error: err.message });
  }
});

// GET /api/sesiones?fecha=2024-01-15&limite=100
router.get('/', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 100;
    const filtro = {};

    if (req.query.fecha) {
      const inicio = new Date(req.query.fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(req.query.fecha);
      fin.setHours(23, 59, 59, 999);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const sesiones = await Sesion.find(filtro).sort({ fecha: -1 }).limit(limite);
    res.json(sesiones);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener sesiones' });
  }
});

module.exports = router;