const mongoose = require('mongoose');

/**
 * Modelo de Sesión
 * Registra cada login/logout de usuarios.
 */
const sesionSchema = new mongoose.Schema({
  usuario: {
    id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Personal' },
    nombre: { type: String },
    cedula: { type: String },
    role:   { type: String },
  },
  accion:      { type: String, enum: ['LOGIN', 'LOGOUT'], required: true },
  ip:          { type: String, default: '' },
  dispositivo: { type: String, default: '' },
  fecha:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sesion', sesionSchema);