const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const app = express();
const PORT = process.env.PORT || 5000;

dotenv.config();
app.use(cors());
app.use(express.json());

// Extraer datos desde DATABASE_URL
const url = new URL(process.env.DATABASE_URL);
const db = mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  port: url.port
});

db.connect(error => {
  if (error) {
    console.error('❌ Error conectando a la base de datos:', error);
  } else {
    console.log('✅ Conectado a la base de datos MySQL');
  }
});

app.get('/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      res.status(500).send('Error al obtener productos');
    } else {
      res.json(results);
    }
  });
});

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
