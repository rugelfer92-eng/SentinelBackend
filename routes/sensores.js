const express = require('express');
const router = express.Router();
const Sensor = require('../models/sensor');

// Último estado
router.get('/ultimo', async (req, res) => {
  try {
    const ultimoDato = await Sensor.findOne().sort({ fecha: -1 });
    res.json(ultimoDato || { temperatura: 0, voltaje: 0, humedad: 0 });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// Historial 50 registros
router.get('/historial', async (req, res) => {
  try {
    const historial = await Sensor.find().sort({ fecha: -1 }).limit(50);
    res.json(historial.reverse());
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// Ventana de 10 minutos (Buscador)
router.get('/ventana', async (req, res) => {
  try {
    const { hora } = req.query;
    if (!hora) return res.status(400).json({ message: "Hora requerida" });
    const [h, m] = hora.split(':').map(Number);
    const fechaBase = new Date();
    fechaBase.setHours(h, m, 0, 0);
    const cincoAntes = new Date(fechaBase.getTime() - 5 * 60000);
    const cincoDespues = new Date(fechaBase.getTime() + 5 * 60000);

    const registros = await Sensor.find({ fecha: { $gte: cincoAntes, $lte: cincoDespues } })
      .sort({ fecha: 1 }).limit(10);
    res.json(registros);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// POST: Guardar datos enviados desde la App (que vienen del ESP32)
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/sensores recibido:', req.body);
    const temperatura = req.body.temperatura ?? req.body.temperature;
    const voltaje = req.body.voltaje ?? req.body.voltage;
    const humedad = req.body.humedad ?? req.body.humidity;

    if (temperatura == null && voltaje == null && humedad == null) {
      return res.status(400).json({ message: "No se recibieron datos de sensor válidos" });
    }

    const nuevoDato = new Sensor({ temperatura, voltaje, humedad });
    await nuevoDato.save();
    res.status(201).json({ mensaje: "Dato de sensor guardado" });
  } catch (error) {
    console.error('Error guardando POST /api/sensores:', error);
    res.status(500).json({ message: "Error al guardar dato" });
  }
});

module.exports = router;