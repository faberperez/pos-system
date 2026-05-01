import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import twilio from "twilio";

// Tus importaciones
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

// Limpieza de precio
const cleanPrice = (value) => {
  return Number(
    String(value ?? 0)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim()
  ) || 0;
};

// Ruta principal
app.get("/", (req, res) => {
  res.json({ ok: true, message: "POS PRO funcionando 🚀" });
});

// Rutas existentes
app.use('/api/reports', reportRoutes);

// --- RUTAS DE PRODUCTOS ---

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NUEVO: Ruta para CREAR producto
app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, image_url } = req.body;
    const result = await pool.query(
      "INSERT INTO products (name, price, stock, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, stock, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NUEVO: Ruta para EDITAR producto
app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, image_url } = req.body;
    const result = await pool.query(
      "UPDATE products SET name = $1, price = $2, stock = $3, image_url = $4 WHERE id = $5 RETURNING *",
      [name, price, stock, image_url, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FIN RUTAS DE PRODUCTOS ---

app.get("/barcode/:code", async (req, res) => {
  try {
    const qr = await QRCode.toDataURL(req.params.code);
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: "Error generando QR" });
  }
});

// Ruta Ventas
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

// Ruta PDF
app.get("/sales/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT quantity, price, name FROM sale_items WHERE sale_id = $1`, [id]);
    const doc = new PDFDocument({ size: "A7", margin: 10 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=factura_${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(12).text("POS PRO", { align: "center" });
    doc.text("Pereira - Risaralda", { align: "center" });
    doc.text("--------------------------------");
    
    let subtotal = 0;
    result.rows.forEach((row) => {
      const totalItem = Number(row.quantity) * Number(row.price);
      subtotal += totalItem;
      doc.text(`${row.quantity}x ${row.name} - $${totalItem.toLocaleString()}`);
    });

    doc.text("--------------------------------");
    doc.text(`TOTAL: $${(subtotal * 1.19).toLocaleString()}`);
    doc.text("Gracias por su compra", { align: "center" });
    doc.end();
  } catch (err) { res.status(500).send("Error"); }
});

app.listen(PORT, () => console.log(`🔥 SERVER RUNNING ON PORT ${PORT}`));