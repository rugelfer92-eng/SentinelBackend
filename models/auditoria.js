const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
  realizadoPor: {
    id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Personal' },
    nombre: { type: String },
    role:   { type: String },
  },
  accion: {
    type: String,
    enum: ['CREAR_EMPLEADO', 'EDITAR_EMPLEADO', 'ELIMINAR_EMPLEADO', 'CAMBIAR_CONFIG'],
    required: true,
  },
  entidad: {
    tipo:   { type: String },
    id:     { type: String },
    nombre: { type: String },
  },
  detalle: { type: mongoose.Schema.Types.Mixed },
  fecha:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Auditoria', auditoriaSchema);