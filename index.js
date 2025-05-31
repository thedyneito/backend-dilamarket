require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Verificar si DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en el archivo .env');
  process.exit(1);
}

// Parsear DATABASE_URL
let dbUrl;
try {
  dbUrl = new URL(process.env.DATABASE_URL);
} catch (error) {
  console.error('❌ URL inválida en DATABASE_URL:', error.message);
  process.exit(1);
}

// Crear pool de conexiones
const pool = mysql.createPool({
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace('/', ''),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('✅ Backend Dilamarket funcionando');
});

// Ruta para obtener productos
app.get('/productos', (req, res) => {
  pool.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      console.error('❌ Error al obtener productos:', err);
      return res.status(500).send('Error al obtener productos');
    }
    res.json(results);
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
