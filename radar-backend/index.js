require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:9000' }));
app.use(express.json());

// Rutas
app.use('/api/dashboard', require('./routes/dashboard'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema Radar funcionando y conectada');
});

// Probar la conexión a Supabase
pool
  .query('select 1')
  .then(() => console.log('Conexión exitosa a Supabase'))
  .catch((err) => console.error('No se pudo conectar a Supabase:', err.message));

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
