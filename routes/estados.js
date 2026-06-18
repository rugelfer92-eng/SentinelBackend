const express = require('express');
const router = express.Router();
const Estado = require('../models/estado');

// GET: Para que la App y el ESP32 consulten el estado actual
router.get('/relay', async (req, res) => {
    try {
        let estado = await Estado.findOne({ nombre: 'control_principal' });
        if (!estado) {
            // Si no existe, creamos el estado inicial
            estado = await Estado.create({ relayStatus: true });
        }
        res.json({ status: estado.relayStatus });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener estado' });
    }
});

// POST: Para que la App cambie el estado (ON/OFF)
router.post('/relay', async (req, res) => {
    const { status } = req.body;
    try {
        const estado = await Estado.findOneAndUpdate(
            { nombre: 'control_principal' },
            { 
                relayStatus: status, 
                lastChange: Date.now() 
            },
            { new: true, upsert: true }
        );
        res.json({ mensaje: 'Estado actualizado', status: estado.relayStatus });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar estado' });
    }
});

module.exports = router;