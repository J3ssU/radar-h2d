const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importar el cliente de PostgreSQL
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configurar la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Probar la conexión a la base de datos
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error adquiriendo cliente', err.stack);
  }
  console.log('Conexión exitosa a la base de datos PostgreSQL');
  release();
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema Radar funcionando y conectada');
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});