console.log("🔥 ARCHIVO CORRECTO EJECUTÁNDOSE 🔥");

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';

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
   TWILIO (opcional)
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
    console.error("PRODUCTS ERROR:", error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

/* =========================
   SALES (ESTABLE)
========================= */
app.post('/sales', async (req, res) => {
  console.log("🔥 ENTRA /sales");

  try {
    const {
      items = [],
      client_phone,
      total = 0,
      subtotal = 0,
      iva = 0,
      pago_con = 0,
      cambio = 0,
      fecha,
      hora
    } = req.body;

    console.log("🔥 SALES DATA:", {
      total,
      subtotal,
      iva,
      pago_con,
      cambio,
      fecha,
      hora,
      itemsLength: items.length
    });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrito vacío o inválido" });
    }

    /* =========================
       INSERT SALES
    ========================= */
    const saleResult = await pool.query(
      `INSERT INTO sales 
      (total, client_phone, subtotal, iva, efectivo, cambio, fecha_hora) 
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        Number(total || 0),
        client_phone || null,
        Number(subtotal || 0),
        Number(iva || 0),
        Number(pago_con || 0),
        Number(cambio || 0),
        `${fecha || ''} ${hora || ''}`
      ]
    );

    const sale = saleResult.rows[0];

    if (!sale) {
      return res.status(500).json({ error: "No se pudo crear la venta" });
    }

    /* =========================
       INSERT ITEMS
    ========================= */
    for (const item of items) {
      const product_id = Number(item.product_id);
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      if (!product_id || !quantity || !price) {
        console.log("⚠️ ITEM INVALIDO:", item);
        continue;
      }

      await pool.query(
        `INSERT INTO sale_items 
        (sale_id, product_id, quantity, price) 
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
    console.log("🔥 ERROR REAL EN /sales:");
    console.log(error);
    console.log(error?.stack);

    return res.status(500).json({
      error: error.message
    });
  }
});

/* =========================
   PDF (CLEAN)
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
    doc.text(`Fecha: ${sale.fecha_hora || ''}`, { align: 'center' });

    doc.moveDown();

    itemsRes.rows.forEach(item => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const sub = quantity * price;

      doc.text(`${item.name} x${quantity} - $${sub.toFixed(2)}`);
    });

    doc.moveDown();

    doc.text(`TOTAL: $${Number(sale.total || 0).toFixed(2)}`, {
      align: 'center'
    });

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