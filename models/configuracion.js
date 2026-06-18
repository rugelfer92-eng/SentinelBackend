const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    temp_max: { type: Number, default: 9.0 }, // tempDeseada + intervalo
    temp_min: { type: Number, default: 1.0 }, // tempDeseada - intervalo
    volt_max: { type: Number, default: 130 }, // Coincide con ESP32
    volt_min: { type: Number, default: 90 },  // Coincide con ESP32
    hum_max: { type: Number, default: 80 },
    hum_min: { type: Number, default: 40 },
    actualizadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', ConfigSchema);