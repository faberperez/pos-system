import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import twilio from "twilio";
import bwipjs from "bwip-js"; // Importación añadida

// Tus archivos locales
import pool from './config/db.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_WHATSAPP_NUMBER = "whatsapp:+14155238886";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Helper para limpiar precios
const cleanPrice = (value) => {
  return Number(
    String(value ?? 0)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim()
  ) || 0;
};

// --- RUTAS ---

app.get("/", (req, res) => {
  res.json({ ok: true, message: "POS PRO funcionando 🚀" });
});

app.use('/api/reports', reportRoutes);

// --- PRODUCTOS ---
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, barcode, image } = req.body;
    const result = await pool.query(
      "INSERT INTO products (name, price, stock, barcode, image) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, price, stock, barcode, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, barcode, image } = req.body;
    const result = await pool.query(
      "UPDATE products SET name = $1, price = $2, stock = $3, barcode = $4, image = $5 WHERE id = $6 RETURNING *",
      [name, price, stock, barcode, image, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- VENTAS ---
app.post("/sales", async (req, res) => {
  const client = await pool.connect();
  try {
    const { items = [], pago_con = 0, cambio = 0, client_phone = null } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Carrito vacío" });

    await client.query("BEGIN");
    const subtotal = items.reduce((acc, item) => acc + cleanPrice(item.price) * Number(item.quantity || 1), 0);
    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    const saleResult = await client.query(
      `INSERT INTO sales (total, subtotal, iva, efectivo, cambio, fecha_hora, client_phone)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING *`,
      [total, subtotal, iva, pago_con || 0, cambio || 0, client_phone || null]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO public.sale_items (sale_id, product_id, quantity, price, name) VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.id || null, Number(item.quantity || 1), cleanPrice(item.price), item.name || "Producto"]
      );
    }

    await client.query("COMMIT");

    let whatsappSent = false;
    if (client_phone) {
      try {
        const cleanPhone = client_phone.replace(/\D/g, '');
        const pdfUrl = `${process.env.BASE_URL}/sales/${sale.id}/pdf`;
        await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:+57${cleanPhone}`,
          body: `🧾 *POS PRO*\nTicket #${sale.id}\nTotal: $${total.toLocaleString()}\n\nDescarga: ${pdfUrl}`,
        });
        whatsappSent = true;
      } catch (twilioErr) { console.error("❌ ERROR WHATSAPP:", twilioErr.message); }
    }

    res.json({ id: sale.id, invoice_url: `/sales/${sale.id}/pdf`, whatsapp_sent: whatsappSent });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- RUTA PDF PROFESIONAL (OXXO STYLE) ---
app.get("/sales/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const saleResult = await pool.query(`SELECT * FROM sales WHERE id = $1`, [id]);
    const itemsResult = await pool.query(`SELECT quantity, price, name FROM sale_items WHERE sale_id = $1`, [id]);
    
    if (saleResult.rows.length === 0) return res.status(404).send("Venta no encontrada");
    const sale = saleResult.rows[0];

    const doc = new PDFDocument({ size: [226, 800], margins: { top: 10, bottom: 10, left: 10, right: 10 } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=factura_${id}.pdf`);
    doc.pipe(res);

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(10).text("CADENA COMERCIAL POS PRO", { align: 'center' });
    doc.font('Helvetica').fontSize(8).text("NIT: 900.000.000-0 | Pereira, Risaralda", { align: 'center' });
    doc.moveDown(0.3);
    doc.text("------------------------------------------");
    doc.text(`TICKET: #${sale.id} | ${new Date(sale.fecha_hora).toLocaleString()}`);
    doc.text("------------------------------------------");
    doc.moveDown(0.5);

    // Productos
    itemsResult.rows.forEach(item => {
      const valor = Number(item.quantity) * Number(item.price);
      doc.fontSize(8).text(`${item.quantity}x ${item.name}`, { continued: true });
      doc.text(`$${valor.toLocaleString()}`, { align: 'right' });
    });

    doc.moveDown(0.5);
    doc.text("------------------------------------------");

    // Totales
    const total = Number(sale.total);
    const subtotal = total / 1.19;
    const iva = total - subtotal;
    doc.fontSize(8).text(`SUBTOTAL: $${subtotal.toFixed(0).toLocaleString()}`, { align: 'right' });
    doc.text(`IVA (19%): $${iva.toFixed(0).toLocaleString()}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).text(`TOTAL: $${total.toLocaleString()}`, { align: 'right' });
    doc.moveDown(1);

    // QR
    const qrData = `Ticket #${sale.id} | Total: ${total}`;
    const qrImage = await QRCode.toDataURL(qrData);
    doc.image(qrImage, { fit: [80, 80], align: 'center' });
    doc.moveDown(0.5);

    // Código de barras
    const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: `1830203792${sale.id}`,
        scale: 2,
        height: 10,
        includetext: false,
    });
    doc.image(barcodeBuffer, { fit: [180, 40], align: 'center' });
    doc.fontSize(7).text(`1830203792${sale.id}`, { align: 'center' });
    doc.moveDown(0.5);

    // Footer
    doc.fontSize(6).font('Helvetica').text("GRACIAS POR SU COMPRA", { align: 'center' });
    doc.text("RESOLUCIÓN DIAN No. 18764101435941", { align: 'center' });
    doc.text("SOFTWARE: POS PRO V1.0", { align: 'center' });

    doc.end();
  } catch (err) { 
    console.error("Error PDF:", err);
    res.status(500).send("Error generando PDF"); 
  }
});

app.listen(PORT, () => console.log(`🔥 SERVER RUNNING ON PORT ${PORT}`));