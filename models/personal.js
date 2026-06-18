const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const personalSchema = new mongoose.Schema({
  cedula: { type: String, required: true, unique: true, trim: true },
  nombreApellido: { type: String, required: true, trim: true },
  telefono: { type: String, default: '' },
  cargo: { type: String, default: '' },
  diasLaborales: { type: [String], default: [] },
  turno: { type: String, default: '' },

  // ✅ Autenticación
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer',
  },
}, { timestamps: true });

// ✅ CORREGIDO: sin async, usando callback tradicional
personalSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();

  const doc = this;
  bcrypt.hash(doc.password, 10, function (err, hash) {
    if (err) return next(err);
    doc.password = hash;
    next();
  });
});

// Nunca enviar la contraseña al cliente
personalSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

// Método para comparar contraseña
personalSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Personal', personalSchema);
