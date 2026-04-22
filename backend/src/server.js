import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';
import path from "path";

/* =========================
   LOAD ENV
========================= */
dotenv.config();

/* =========================
   CONFIG & CORS
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Configuración de CORS corregida para producción
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://smart-pos-f-perez.web.app' // Tu URL de Firebase
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

/* =========================
   TWILIO CONFIG
========================= */
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log("✅ Twilio listo");
} else {
  console.log("⚠️ Twilio no configurado (revisa variables de entorno)");
}

/* =========================
   ROUTES: PRODUCTS
========================= */
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR PRODUCTS:", error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/products', async (req, res) => {
  const { name, price, stock, image } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, stock, image) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, stock, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ ERROR INSERT:", error);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

/* =========================
   ROUTES: SALES & WHATSAPP
========================= */
app.post('/sales', async (req, res) => {
  const { items, client_phone, total } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

  try {
    const saleResult = await pool.query(
      'INSERT INTO sales (total, client_phone) VALUES ($1, $2) RETURNING *',
      [total, client_phone || null]
    );
    const sale = saleResult.rows[0];

    for (const item of items) {
      const { product_id, quantity } = item;
      const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
      const product = productRes.rows[0];

      if (product && product.stock >= quantity) {
        await pool.query('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', 
          [sale.id, product_id, quantity, product.price]);
        await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
      }
    }

    const invoice_url = `${BASE_URL}/sales/${sale.id}/pdf`;
    let whatsapp_link = null;

    if (client_phone) {
      const clean = client_phone.replace(/\D/g, '');
      whatsapp_link = `https://wa.me/57${clean}?text=Factura:%20${invoice_url}`;

      if (client) {
        try {
          await client.messages.create({
            from: 'whatsapp:+14155238886', // Sandbox de Twilio
            to: `whatsapp:+57${clean}`,
            body: `🧾 Tu factura de POS PRO:\n${invoice_url}`
          });
          console.log("✅ WhatsApp enviado");
        } catch (err) {
          console.error("❌ Error Twilio:", err.message);
        }
      }
    }

    res.status(201).json({ sale_id: sale.id, total, invoice_url, whatsapp_link });
  } catch (error) {
    console.error("❌ ERROR SALE:", error);
    res.status(500).json({ error: 'Error en la venta' });
  }
});

/* =========================
   ROUTES: PDF GENERATION
========================= */
app.get('/sales/:id/pdf', async (req, res) => {
  try {
    const saleId = req.params.id;
    const itemsRes = await pool.query(`
      SELECT p.name, si.quantity, si.price 
      FROM sale_items si 
      JOIN products p ON p.id = si.product_id 
      WHERE si.sale_id = $1`, [saleId]);

    const doc = new PDFDocument({ margin: 10, size: [200, 400] });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(12).text('POS PRO - FACTURA', { align: 'center' }).moveDown();
    doc.fontSize(10).text(`Ticket #${saleId}`, { align: 'center' }).moveDown();

    let subtotal = 0;
    itemsRes.rows.forEach(item => {
      const sub = item.price * item.quantity;
      subtotal += sub;
      doc.text(`${item.name} x${item.quantity} - $${sub.toFixed(2)}`);
    });

    const iva = subtotal * 0.19;
    doc.moveDown().text(`Subtotal: $${subtotal.toFixed(2)}`);
    doc.text(`IVA (19%): $${iva.toFixed(2)}`);
    doc.fontSize(12).text(`TOTAL: $${(subtotal + iva).toFixed(2)}`, { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).send("Error generando PDF");
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 URL Base: ${BASE_URL}`);
});