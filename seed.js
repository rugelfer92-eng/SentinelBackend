const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sentinelDB');

const SensorSchema = new mongoose.Schema({
  temperatura: Number,
  voltaje: Number,
  humedad: Number,
  fecha: { type: Date, default: Date.now }
});

const Sensor = mongoose.model('Sensor', SensorSchema);

const seedDatabase = async () => {
  try {
    await Sensor.deleteMany({}); // Borra lo anterior para no acumular basura
    console.log("🗑️ Base de datos limpia");

    const registrosInitiales = [];

    // Creamos 5 registros iniciales al azar
    for (let i = 0; i < 5; i++) {
      registrosInitiales.push({
        temperatura: parseFloat((Math.random() * 10).toFixed(1)),
        voltaje: Math.floor(Math.random() * (135 - 90 + 1) + 90),
        humedad: Math.floor(Math.random() * (90 - 30 + 1) + 30),
        fecha: new Date(Date.now() - i * 60000) // Un registro por minuto hacia atrás
      });
    }

    await Sensor.insertMany(registrosInitiales);
    console.log("✅ Seed finalizado: 5 registros inyectados.");
    process.exit();
  } catch (error) {
    console.error("❌ Error en el seed:", error);
    process.exit(1);
  }
};

seedDatabase();