const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

client.connect().then(async () => {
    const db = client.db('CargaAcademica');
    
    const contadores = await db.collection('personas')
                               .find({ "profesion": "Contador Público" })
                               .toArray();

    console.log("Profesionales encontrados:", contadores);
    client.close();
});