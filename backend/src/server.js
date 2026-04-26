console.log("🔥 VERSION ESTABLE CON FECHA CORRECTA 🔥");

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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
   PRODUCTS
========================= */
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error("PRODUCTS ERROR:", error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

/* =========================
   SALES
========================= */
app.post('/sales', async (req, res) => {

  console.log("📦 BODY:", JSON.stringify(req.body, null, 2));

  try {
    const {
      items = [],
      client_phone,
      total = 0,
      subtotal = 0,
      pago_con = 0,
      cambio = 0
    } = req.body;

    // ✅ EFECTIVO CORREGIDO
    const efectivo = Number(pago_con) || 0;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }

    // ✅ FECHA CORRECTA PARA BASE DE DATOS
    const fecha_hora = new Date().toISOString();

    const saleResult = await pool.query(
      `INSERT INTO sales 
      (subtotal, total, efectivo, cambio, client_phone, fecha_hora)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        Number(subtotal),
        Number(total),
        efectivo,
        Number(cambio),
        client_phone || null,
        fecha_hora
      ]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      const product_id = Number(item.product_id);
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      if (!product_id || !quantity || !price) continue;

      await pool.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, price)
         VALUES ($1,$2,$3,$4)`,
        [sale.id, product_id, quantity, price]
      );

      await pool.query(
        `UPDATE products 
         SET stock = COALESCE(stock,0) - $1 
         WHERE id = $2`,
        [quantity, product_id]
      );
    }

    return res.status(201).json({
      sale_id: sale.id,
      total,
      invoice_url: `${BASE_URL}/sales/${sale.id}/pdf`
    });

  } catch (error) {
    console.log("🔥 ERROR /sales:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

/* =========================
   PDF
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
    doc.pipe(res);

    doc.fontSize(12).text('POS PRO - FACTURA', { align: 'center' });
    doc.text(`Ticket #${saleId}`, { align: 'center' });

    // ✅ AQUÍ SE ARREGLA LA FECHA (SIN GMT NI TEXTO FEO)
    const fechaBonita = new Date(sale.fecha_hora).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      hour12: true,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.text(`Fecha: ${fechaBonita}`, { align: 'center' });

    doc.moveDown();

    itemsRes.rows.forEach(item => {
      const sub = Number(item.price) * Number(item.quantity);
      doc.text(`${item.name} x${item.quantity} - $${sub.toFixed(0)}`);
    });

    doc.moveDown();

    doc.text(`SUBTOTAL: $${Number(sale.subtotal || 0).toFixed(0)}`);
    doc.text(`TOTAL: $${Number(sale.total || 0).toFixed(0)}`, {
      align: 'center'
    });

    doc.text(`EFECTIVO: $${Number(sale.efectivo || 0).toFixed(0)}`);
    doc.text(`CAMBIO: $${Number(sale.cambio || 0).toFixed(0)}`);

    doc.end();

  } catch (error) {
    console.error("PDF ERROR:", error);
    res.status(500).send("Error generando PDF");
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON PORT:", PORT);
});