/**
 * seed-admin.js
 * Ejecutar: node seed-admin.js
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Esquema inline para evitar cualquier problema de caché del modelo ──
const personalSchema = new mongoose.Schema({
  cedula:         { type: String, required: true, unique: true, trim: true },
  nombreApellido: { type: String, required: true },
  telefono:       { type: String, default: '' },
  cargo:          { type: String, default: '' },
  diasLaborales:  { type: [String], default: [] },
  turno:          { type: String, default: '' },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['admin','editor','viewer'], default: 'viewer' },
}, { timestamps: true });

// ── Datos del admin — cambia aquí ──
const CEDULA   = '1234567';    // ← tu cédula
const PASSWORD = 'Admin2024';  // ← tu contraseña
const NOMBRE   = 'Rugelfer Feruan';
const CARGO    = 'Administrador';

mongoose.connect('mongodb://0.0.0.0:27017/sentinelDB')
  .then(async () => {
    console.log('🟢 Conectado a MongoDB');

    // Usamos el modelo con colección fija 'personals'
    const Personal = mongoose.model('Personal', personalSchema);

    // Borrar el admin anterior si existe (para recrearlo con hash correcto)
    const borrado = await Personal.deleteOne({ cedula: CEDULA });
    if (borrado.deletedCount > 0) {
      console.log('🗑️  Usuario anterior eliminado, recreando con hash...');
    }

    // Hashear manualmente (sin depender del pre-save hook)
    const hash = await bcrypt.hash(PASSWORD, 10);
    console.log('🔐 Hash generado:', hash);

    // Insertar directamente con insertOne para evitar el hook
    await Personal.collection.insertOne({
      cedula:         CEDULA,
      nombreApellido: NOMBRE,
      cargo:          CARGO,
      telefono:       '',
      diasLaborales:  [],
      turno:          '',
      password:       hash,   // ← ya hasheado
      role:           'admin',
      createdAt:      new Date(),
      updatedAt:      new Date(),
    });

    console.log('✅ Admin creado exitosamente');
    console.log(`   Cédula:     ${CEDULA}`);
    console.log(`   Nombre:     ${NOMBRE}`);
    console.log(`   Rol:        admin`);
    console.log(`   Contraseña: ${PASSWORD}  ← guárdala en lugar seguro`);
    process.exit(0);
  })
  .catch(err => {
    console.error('🔴 Error:', err);
    process.exit(1);
  });
