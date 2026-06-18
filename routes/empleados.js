const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const Personal   = require('../models/personal');
const Auditoria  = require('../models/auditoria');
const Sesion     = require('../models/sesion');

async function registrarAuditoria({ accion, realizadoPor, entidad, detalle }) {
  try {
    await Auditoria.create({ accion, realizadoPor, entidad, detalle });
  } catch (e) {
    console.error('⚠️  Auditoría:', e.message);
  }
}

function puedeGestionar(callerRole, targetRole) {
  if (callerRole === 'admin')  return true;
  if (callerRole === 'editor') return targetRole === 'viewer';
  return false;
}

// ── POST /api/empleados/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { cedula, password, dispositivo } = req.body;
  if (!cedula || !password)
    return res.status(400).json({ message: 'Cédula y contraseña son requeridos' });

  try {
    const empleado = await Personal.findOne({ cedula }).lean();
    if (!empleado)
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    const isMatch = await bcrypt.compare(password, empleado.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    // ── Registrar sesión ──
    await Sesion.create({
      usuario: {
        id:     empleado._id,
        nombre: empleado.nombreApellido,
        cedula: empleado.cedula,
        role:   empleado.role,
      },
      accion:      'LOGIN',
      ip:          req.ip || req.headers['x-forwarded-for'] || '',
      dispositivo: dispositivo || req.headers['user-agent'] || '',
    });

    res.json({
      user: {
        _id:            empleado._id,
        cedula:         empleado.cedula,
        nombreApellido: empleado.nombreApellido,
        cargo:          empleado.cargo,
        role:           empleado.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// ── POST /api/empleados/logout ─────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const { usuario } = req.body;
    await Sesion.create({
      usuario,
      accion: 'LOGOUT',
      ip:     req.ip || '',
    });
    res.json({ message: 'Logout registrado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar logout' });
  }
});

// ── GET /api/empleados?callerRole= ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const callerRole = req.query.callerRole || 'viewer';
    const filtro = callerRole === 'admin' ? {} : { role: { $ne: 'admin' } };
    const lista  = await Personal.find(filtro).sort({ createdAt: -1 });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

// ── POST /api/empleados ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { cedula, nombreApellido, telefono, cargo,
            diasLaborales, turno, password, role, _auditUser } = req.body;

    if (!password?.trim())
      return res.status(400).json({ message: 'La contraseña es obligatoria' });

    if (!puedeGestionar(_auditUser?.role, role || 'viewer'))
      return res.status(403).json({ message: 'Sin permiso para asignar ese nivel' });

    const hash  = await bcrypt.hash(password, 10);
    const nuevo = new Personal({
      cedula, nombreApellido, telefono, cargo,
      diasLaborales, turno,
      password: hash,
      role: role || 'viewer',
    });
    await nuevo.save();

    await registrarAuditoria({
      accion: 'CREAR_EMPLEADO',
      realizadoPor: { id: _auditUser?.id, nombre: _auditUser?.nombre, role: _auditUser?.role },
      entidad: { tipo: 'empleado', id: nuevo._id.toString(), nombre: nuevo.nombreApellido },
      detalle: { cedula, role: role || 'viewer' },
    });

    res.status(201).json(nuevo);
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: 'Ya existe un empleado con esa cédula' });
    res.status(500).json({ message: 'Error al crear empleado' });
  }
});

// ── PUT /api/empleados/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { password, _auditUser, ...rest } = req.body;
    const actual = await Personal.findById(req.params.id).lean();
    if (!actual) return res.status(404).json({ message: 'Empleado no encontrado' });

    if (!puedeGestionar(_auditUser?.role, actual.role))
      return res.status(403).json({ message: 'Sin permiso para editar este usuario' });
    if (rest.role && !puedeGestionar(_auditUser?.role, rest.role))
      return res.status(403).json({ message: 'Sin permiso para asignar ese nivel' });

    if (password?.trim()) rest.password = await bcrypt.hash(password, 10);

    const actualizado = await Personal.findByIdAndUpdate(req.params.id, rest, { new: true });

    await registrarAuditoria({
      accion: 'EDITAR_EMPLEADO',
      realizadoPor: { id: _auditUser?.id, nombre: _auditUser?.nombre, role: _auditUser?.role },
      entidad: { tipo: 'empleado', id: actual._id.toString(), nombre: actual.nombreApellido },
      detalle: {
        camposModificados: Object.keys(rest).filter(k => k !== 'password'),
        passwordCambiado:  !!(password?.trim()),
        rolAnterior: actual.role,
        rolNuevo:    rest.role || actual.role,
      },
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar empleado' });
  }
});

// ── DELETE /api/empleados/:id ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { _auditUser } = req.body;
    const actual = await Personal.findById(req.params.id).lean();
    if (!actual) return res.status(404).json({ message: 'Empleado no encontrado' });

    if (!puedeGestionar(_auditUser?.role, actual.role))
      return res.status(403).json({ message: 'Sin permiso para eliminar este usuario' });

    await Personal.findByIdAndDelete(req.params.id);

    await registrarAuditoria({
      accion: 'ELIMINAR_EMPLEADO',
      realizadoPor: { id: _auditUser?.id, nombre: _auditUser?.nombre, role: _auditUser?.role },
      entidad: { tipo: 'empleado', id: actual._id.toString(), nombre: actual.nombreApellido },
      detalle: { cedula: actual.cedula, role: actual.role },
    });

    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar empleado' });
  }
});

module.exports = router;