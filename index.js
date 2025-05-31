require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Permitir solo dominios seguros como localhost y Vercel
const allowedOrigins = [
  'https://dilamarket-ftgv.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Verificación y conexión a MySQL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida');
  process.exit(1);
}

let dbUrl;
try {
  dbUrl = new URL(process.env.DATABASE_URL);
} catch (error) {
  console.error('❌ URL inválida:', error.message);
  process.exit(1);
}

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

// Endpoints
app.get('/', (req, res) => {
  res.send('✅ Backend Dilamarket funcionando');
});

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
