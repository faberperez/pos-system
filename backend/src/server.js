import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';
import path from "path";

/* =========================
   LOAD ENV (🔥 CLAVE)
========================= */
dotenv.config()
console.log("ENV PATH:", process.cwd());

console.log("📦 ENV cargado desde:", path.resolve('./.env'));
console.log("TWILIO_SID:", process.env.TWILIO_SID ? "OK" : "NO");

/* =========================
   CONFIG
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
console.log("PORT RAW:", process.env.PORT);
/* =========================
   TWILIO (🔥 ARREGLADO)
========================= */
let client = null;

if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
  console.log("❌ Twilio NO configurado");
} else {
  client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_TOKEN
  );
  console.log("✅ Twilio listo");
}

/* =========================
   TEST DB
========================= */
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR DB:", error);
    res.status(500).json({ error: 'Error conexión DB' });
  }
});

/* =========================
   GET PRODUCTS
========================= */
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR PRODUCTS:", error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/* =========================
   INSERT PRODUCT
========================= */
app.post('/products', async (req, res) => {
  const { name, price, stock, image } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, price, stock, image)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, price, stock, image]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("❌ ERROR INSERT:", error);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

/* =========================
   SALES (🔥 IVA + WHATSAPP)
========================= */
app.post('/sales', async (req, res) => {
  const { items, client_phone, subtotal, iva, total } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío' });
  }

  try {
    const saleResult = await pool.query(
      'INSERT INTO sales (total, client_phone) VALUES ($1, $2) RETURNING *',
      [total, client_phone || null]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      const { product_id, quantity } = item;

      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [product_id]
      );

      const product = productResult.rows[0];

      if (!product) {
        return res.status(404).json({ error: 'Producto no existe' });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }

      await pool.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [sale.id, product_id, quantity, product.price]
      );

      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, product_id]
      );
    }

    const invoice_url = `${BASE_URL}/sales/${sale.id}/pdf`;

    /* =========================
       WHATSAPP LINK
    ========================= */
    let whatsapp_link = null;

    if (client_phone) {
      const clean = client_phone.replace(/\D/g, '');
      whatsapp_link = `https://wa.me/57${clean}?text=Factura:%20${invoice_url}`;
    }

    /* =========================
       ENVÍO TWILIO
    ========================= */
    if (client && client_phone) {
      try {
        await client.messages.create({
          from: 'whatsapp:+14155238886',
          to: `whatsapp:+57${client_phone.replace(/\D/g, '')}`,
          body: `🧾 Factura: ${invoice_url}`,
          mediaUrl: [invoice_url]
        });

        console.log("✅ WhatsApp enviado");

      } catch (err) {
        console.error("❌ Error WhatsApp:", err.message);
      }
    }

    res.status(201).json({
      sale_id: sale.id,
      total,
      invoice_url,
      whatsapp_link
    });

  } catch (error) {
    console.error("❌ ERROR SALE:", error);
    res.status(500).json({ error: 'Error en la venta' });
  }
});

/* =========================
   PDF (🔥 CON IVA)
========================= */
app.get('/sales/:id/pdf', async (req, res) => {
  try {
    const saleId = req.params.id;

    const itemsRes = await pool.query(`
      SELECT p.name, si.quantity, si.price
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
    `, [saleId]);

    const doc = new PDFDocument({
      margin: 5,
      size: [200, 600]
    });

    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.text(`Factura #${saleId}`, { align: 'center' });

    let subtotalCalc = 0;

    itemsRes.rows.forEach(item => {
      const sub = item.price * item.quantity;
      subtotalCalc += sub;

      doc.text(`${item.name}`);
      doc.text(`${item.quantity} x ${item.price}`);
      doc.text(`$${sub}`);
      doc.moveDown();
    });

    const IVA = 0.19;
    const ivaCalc = subtotalCalc * IVA;
    const totalCalc = subtotalCalc + ivaCalc;

    doc.moveDown();
    doc.text(`Subtotal: $${subtotalCalc.toFixed(2)}`);
    doc.text(`IVA (19%): $${ivaCalc.toFixed(2)}`);
    doc.text(`TOTAL: $${totalCalc.toFixed(2)}`, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Error PDF");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});