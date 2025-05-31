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

// Parsear DATABASE_URL de Railway
let dbUrl;
try {
  dbUrl = new URL(process.env.DATABASE_URL);
} catch (error) {
  console.error('❌ URL inválida en DATABASE_URL:', error.message);
  process.exit(1);
}

// ✅ Pool de conexiones para evitar desconexiones
const db = mysql.createPool({
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace('/', ''),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// RUTA: Obtener productos
app.get('/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).send('Error al obtener productos');
    }
    res.json(results);
  });
});

// RUTA: Finalizar compra
app.post('/finalizar-compra', (req, res) => {
  const { carrito, usuario_id } = req.body;

  if (!carrito || !Array.isArray(carrito) || carrito.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío o no válido' });
  }

  db.query('INSERT INTO compras (usuario_id) VALUES (?)', [usuario_id], (err, result) => {
    if (err) {
      console.error('Error al insertar en compras:', err);
      return res.status(500).json({ error: 'Error al registrar la compra' });
    }

    const compraId = result.insertId;
    const detalles = carrito.map(item => [
      compraId,
      item.id,
      item.cantidad,
      item.precio
    ]);

    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    db.query(
      'INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario) VALUES ?',
      [detalles],
      (err2) => {
        if (err2) {
          console.error('Error al insertar detalles:', err2);
          return res.status(500).json({ error: 'Error al registrar detalles de la compra' });
        }

        db.query(
          'INSERT INTO pedidos (producto_id, cantidad, total) VALUES (?, ?, ?)',
          [carrito[0].id, carrito[0].cantidad, carrito[0].precio * carrito[0].cantidad],
          (err3, pedidoResult) => {
            if (err3) {
              console.error('Error al insertar pedido:', err3);
              return res.status(500).json({ error: 'Error al crear pedido para la factura' });
            }

            const pedidoId = pedidoResult.insertId;

            db.query(
              'INSERT INTO facturas (pedido_id, total) VALUES (?, ?)',
              [pedidoId, total],
              (err4) => {
                if (err4) {
                  console.error('Error al crear factura:', err4);
                  return res.status(500).json({ error: 'Error al generar la factura' });
                }

                res.json({ mensaje: '✅ Compra, pedido y factura generados correctamente' });
              }
            );
          }
        );
      }
    );
  });
});

// RUTA: Estado del backend
app.get('/', (req, res) => {
  res.send('✅ Backend Dilamarket funcionando');
});

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
