import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import twilio from "twilio";

// 🔥 TUS ARCHIVOS EXISTENTES
import pool from './config/db.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

// ======================
// TWILIO SETUP
// ======================
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_WHATSAPP_NUMBER = "whatsapp:+14155238886";

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE
// ======================
app.use(cors({ origin: "*" }));
app.use(express.json());

// ======================
// HEALTH
// ======================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "POS PRO funcionando 🚀" });
});

// ======================
// 🔥 TUS RUTAS DE REPORTES (ya existentes)
// ======================
app.use('/api/reports', reportRoutes);

// ======================
// PRODUCTS
// ======================
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// QR
// ======================
app.get("/barcode/:code", async (req, res) => {
  try {
    const qr = await QRCode.toDataURL(req.params.code);
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: "Error generando QR" });
  }
});

// ======================
// 🔥 LIMPIEZA DE PRECIO
// ======================
const cleanPrice = (value) => {
  return Number(
    String(value ?? 0)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim()
  ) || 0;
};

// ======================
// 🔥 SALES + WHATSAPP
// ======================
app.post("/sales", async (req, res) => {
  const client = await pool.connect();

  try {
    const { items = [], pago_con = 0, cambio = 0, client_phone = null } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrito vacío o inválido" });
    }

    await client.query("BEGIN");

    const subtotal = items.reduce((acc, item) => {
      return acc + cleanPrice(item.price) * Number(item.quantity || 1);
    }, 0);

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    const saleResult = await client.query(
      `INSERT INTO sales (
        total, subtotal, iva, efectivo, cambio, fecha_hora, client_phone
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING *`,
      [total, subtotal, iva, pago_con || 0, cambio || 0, client_phone || null]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, price, name)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sale.id,
          item.id || null,
          Number(item.quantity || 1),
          cleanPrice(item.price),
          item.name || "Producto"
        ]
      );
    }

    await client.query("COMMIT");

    // ======================
    // 🔥 WHATSAPP
    // ======================
    let whatsappSent = false;
    if (client_phone) {
      try {
        const cleanPhone = client_phone.replace(/\D/g, '');
        const pdfUrl = `${process.env.BASE_URL}/sales/${sale.id}/pdf`;
        
        await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:+57${cleanPhone}`,
          body: `🧾 *POS PRO*\nGracias por tu compra!\n\nTicket #${sale.id}\nTotal: $${total.toLocaleString()}\n\nDescarga tu factura:\n${pdfUrl}`,
        });
        
        whatsappSent = true;
      } catch (twilioErr) {
        console.error("❌ ERROR WHATSAPP:", twilioErr.message);
      }
    }

    res.json({
      id: sale.id,
      invoice_url: `/sales/${sale.id}/pdf`,
      whatsapp_sent: whatsappSent,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR SALES:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ======================
// 🔥 PDF FACTURA
// ======================
app.get("/sales/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT quantity, price, name FROM sale_items WHERE sale_id = $1`,
      [id]
    );

    const doc = new PDFDocument({ size: "A7", margin: 10 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=factura_${id}.pdf`);

    doc.pipe(res);

    doc.fontSize(12).text("POS PRO", { align: "center" });
    doc.text("Pereira - Risaralda", { align: "center" });
    doc.text("NIT: 123456789-0", { align: "center" });

    doc.moveDown();
    doc.text(`Ticket #${id}`);
    doc.text(`Fecha: ${new Date().toLocaleString()}`);
    doc.text("--------------------------------");

    const subtotal = result.rows.reduce((acc, row) => {
      return acc + Number(row.quantity) * Number(row.price);
    }, 0);

    result.rows.forEach((row) => {
      const totalItem = Number(row.quantity) * Number(row.price);
      doc.text(`${row.quantity}x ${row.name}`);
      doc.text(`$${totalItem.toLocaleString()}`);
      doc.moveDown(0.3);
    });

    doc.text("--------------------------------");

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    doc.text(`SUBTOTAL: $${subtotal.toLocaleString()}`);
    doc.text(`IVA (19%): $${iva.toLocaleString()}`);
    doc.text(`TOTAL: $${total.toLocaleString()}`);
    doc.text("--------------------------------");
    doc.text("Gracias por su compra", { align: "center" });

    doc.end();

  } catch (err) {
    console.error("❌ ERROR PDF:", err);
    res.status(500).send("Error generando PDF");
  }
});

// ======================
app.listen(PORT, () => {
  console.log(`🔥 SERVER RUNNING ON PORT ${PORT}`);
});