console.log("🔥 ARCHIVO CORRECTO EJECUTÁNDOSE 🔥");

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';

/* =========================
   LOAD ENV
========================= */
dotenv.config();

/* =========================
   CONFIG
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/* =========================
   CORS
========================= */
app.use(cors({
  origin: [
    'https://smart-pos-f-perez.web.app',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

/* =========================
   TWILIO
========================= */
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/* =========================
   PRODUCTS
========================= */
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

/* =========================
   SALES
========================= */
app.post('/sales', async (req, res) => {
  const {
    items,
    client_phone,
    total,
    subtotal,
    iva,
    pago_con,
    cambio,
    fecha,
    hora
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío' });
  }

  try {
    const saleResult = await pool.query(
      `INSERT INTO sales 
      (total, client_phone, subtotal, iva, efectivo, cambio, fecha_hora) 
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        total,
        client_phone || null,
        subtotal,
        iva,
        pago_con,
        cambio,
        `${fecha} ${hora}`
      ]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      await pool.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [sale.id, item.product_id, item.quantity, item.price]
      );

      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    const invoice_url = `${BASE_URL}/sales/${sale.id}/pdf`;

    res.status(201).json({
      sale_id: sale.id,
      total,
      invoice_url
    });

  }catch (error) {
  console.log("🔥🔥 ERROR REAL EN /sales:");
  console.log(error);
  console.log("STACK:", error?.stack);

  return res.status(500).json({
    message: error.message,
    stack: error?.stack
  });
}
});

/* =========================
   PDF (CORREGIDO 🔥)
========================= */
app.get('/sales/:id/pdf', async (req, res) => {
  try {
    const saleId = req.params.id;

    const saleRes = await pool.query(
      'SELECT * FROM sales WHERE id = $1',
      [saleId]
    );

    const sale = saleRes.rows[0];

    if (!sale) {
      return res.status(404).send("Venta no encontrada");
    }

    const itemsRes = await pool.query(`
      SELECT p.name, si.quantity, si.price 
      FROM sale_items si 
      JOIN products p ON p.id = si.product_id 
      WHERE si.sale_id = $1
    `, [saleId]);

    const doc = new PDFDocument({ margin: 10, size: [200, 400] });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    doc.pipe(res);

    // 🔥 MARCADOR PARA SABER QUE ES EL NUEVO
    doc.text("🔥 VERSION NUEVA RENDER 🔥", { align: 'center' });

    doc.moveDown();
    doc.fontSize(12).text('POS PRO - FACTURA', { align: 'center' });
    doc.text(`Ticket #${saleId}`, { align: 'center' });
    doc.text(`Fecha: ${sale.fecha_hora || 'N/A'}`, { align: 'center' });

    doc.moveDown();

    itemsRes.rows.forEach(item => {
      const sub = item.price * item.quantity;
      doc.text(`${item.name} x${item.quantity} - $${sub.toFixed(2)}`);
    });

    doc.moveDown();

    doc.text(`Subtotal: $${Number(sale.subtotal || 0).toFixed(2)}`);
    doc.text(`IVA: $${Number(sale.iva || 0).toFixed(2)}`);
    doc.fontSize(12).text(`TOTAL: $${Number(sale.total || 0).toFixed(2)}`, { align: 'center' });

    doc.moveDown();
    doc.text(`Efectivo: $${Number(sale.efectivo || 0).toFixed(2)}`);
    doc.text(`Cambio: $${Number(sale.cambio || 0).toFixed(2)}`);

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generando PDF");
  }
});

/* =========================
   START SERVER
========================= */
console.log("ANTES DE ESCUCHAR:", PORT);
console.log("ENV PORT:", process.env.PORT);
console.log("PORT VARIABLE:", PORT);

app.listen(PORT, () => {
  console.log("PUERTO COMO NUMERO:", PORT);
  console.log("PUERTO * 1:", PORT * 1);
  console.log("PUERTO STRING:", String(PORT));
});