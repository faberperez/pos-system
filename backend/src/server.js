import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import PDFDocument from 'pdfkit';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* =========================
   🔥 TWILIO CONFIG
========================= */


/* =========================
   GET PRODUCTS
========================= */
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY id ASC'
    );

    const products = result.rows.map(p => ({
      ...p,
      price: parseFloat(p.price),
      stock: parseInt(p.stock)
    }));

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/* =========================
   POST SALES + WHATSAPP 🔥
========================= */
app.post('/sales', async (req, res) => {
  const { items, client_phone } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío' });
  }

  try {
    const saleResult = await pool.query(
      'INSERT INTO sales (total, client_phone) VALUES ($1, $2) RETURNING *',
      [0, client_phone || null]
    );

    const sale = saleResult.rows[0];
    let total = 0;

    for (const item of items) {
      const { product_id, quantity } = item;

      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [product_id]
      );

      const product = productResult.rows[0];

      const price = parseFloat(product.price);
      const stock = parseInt(product.stock);

      if (stock < quantity) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }

      const subtotal = price * quantity;
      total += subtotal;

      await pool.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [sale.id, product_id, quantity, price]
      );

      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, product_id]
      );
    }

    await pool.query(
      'UPDATE sales SET total = $1 WHERE id = $2',
      [total, sale.id]
    );

    const invoice_url = `http://localhost:3000/sales/${sale.id}/pdf`;

    /* =========================
       📲 ENVIAR WHATSAPP (FIX)
    ========================= */
    if (client_phone) {

      let cleanPhone = client_phone.replace(/\D/g, '');

      // 🔥 evita duplicar 57
      if (cleanPhone.startsWith('57')) {
        cleanPhone = cleanPhone.slice(2);
      }

      if (cleanPhone.length >= 10) {

        const finalNumber = `whatsapp:+57${cleanPhone}`;

        console.log("📲 Enviando a:", finalNumber);

        try {
          await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: finalNumber,
            body: `🧾 Hola, aquí tienes tu factura`,
            mediaUrl: [invoice_url] // 🔥 ESTO ES LA MAGIA
          });

          console.log("✅ WhatsApp enviado");

        } catch (err) {
          console.error("❌ Error WhatsApp:", err.message);
        }

      } else {
        console.log("❌ Número inválido:", cleanPhone);
      }
    }

    res.status(201).json({
      message: 'Venta realizada',
      sale_id: sale.id,
      total,
      invoice_url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en la venta' });
  }
});

/* =========================
   PDF FACTURA
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

    if (itemsRes.rows.length === 0) {
      return res.status(404).send("Venta no encontrada");
    }

    const doc = new PDFDocument({
      margin: 5,
      size: [200, 600]
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=factura_${saleId}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(12).text('MI TIENDA', { align: 'center' });
    doc.text('--------------------------', { align: 'center' });
    doc.text(`Factura: ${saleId}`, { align: 'center' });
    doc.text(new Date().toLocaleString(), { align: 'center' });

    doc.text('--------------------------');

    let subtotalGeneral = 0;

    itemsRes.rows.forEach(item => {
      const subtotal = item.price * item.quantity;
      subtotalGeneral += subtotal;

      doc.text(item.name, { align: 'center' });
      doc.text(`${item.quantity} x $${item.price}`, { align: 'center' });
      doc.text(`$${subtotal}`, { align: 'center' });
      doc.moveDown(0.5);
    });

    const iva = subtotalGeneral * 0.19;
    const total = subtotalGeneral + iva;

    doc.text('--------------------------');

    doc.text(`SUBTOTAL: $${subtotalGeneral.toFixed(2)}`, { align: 'center' });
    doc.text(`IVA (19%): $${iva.toFixed(2)}`, { align: 'center' });
    
    doc.text('--------------------------');
    doc.text(`TOTAL: $${total.toFixed(2)}`, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generando PDF");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});