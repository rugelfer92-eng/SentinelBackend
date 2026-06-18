const mongoose = require('mongoose');

const EstadoSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        default: 'control_principal' 
    },
    relayStatus: { 
        type: Boolean, 
        default: true 
    },
    lastChange: { 
        type: Date, 
        default: Date.now 
    }
});

const Estado = mongoose.models.Estado || mongoose.model('Estado', EstadoSchema);
module.exports = Estado;