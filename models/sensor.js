const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  temperatura: Number,
  voltaje: Number,
  humedad: Number,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sensor', SensorSchema);