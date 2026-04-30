import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

// 🔥 IMPORTAR RUTAS DE REPORTES
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// DATABASE (POSTGRES)
// ======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ======================
// MIDDLEWARE
// ======================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

app.use(express.json());

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "POS Backend PRO funcionando 🚀",
  });
});

// ======================
// PRODUCTOS
// ======================
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, image } = req.body;

    const barcode = `770${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO products (name, price, stock, barcode, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
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
    const { name, price, stock, image } = req.body;

    const result = await pool.query(
      `UPDATE products
       SET name=$1, price=$2, stock=$3, image=$4
       WHERE id=$5
       RETURNING *`,
      [name, price, stock, image, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM products WHERE id=$1", [id]);

    res.json({ message: "Producto eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// QR / BARCODE
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
// VENTAS
// ======================
app.post("/sales", async (req, res) => {
  try {
    const { total, items } = req.body;

    const result = await pool.query(
      `INSERT INTO sales (total, items, date)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [total, JSON.stringify(items)]
    );

    // 🔥 IMPORTANTE: devolver URL de factura
    const sale = result.rows[0];

    res.status(201).json({
      ...sale,
      invoice_url: `${process.env.BASE_URL || "http://localhost:" + PORT}/invoice/${sale.id}`,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// REPORTES (USANDO ROUTER PRO)
// ======================
app.use("/reports", reportRoutes);

// ======================
// FACTURA PDF
// ======================
app.get("/invoice/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM sales WHERE id=$1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "No encontrada" });
    }

    const sale = result.rows[0];

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=factura.pdf"
    );

    doc.pipe(res);

    doc.fontSize(20).text("POS FACTURA", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`ID Venta: ${sale.id}`);
    doc.text(`Total: $${sale.total}`);
    doc.text(`Fecha: ${sale.date}`);

    doc.moveDown();

    try {
      const items = JSON.parse(sale.items || "[]");

      if (items.length) {
        doc.text("Productos:");
        items.forEach((item, i) => {
          doc.text(
            `${i + 1}. ${item.name} x${item.quantity} - $${item.price}`
          );
        });
      }
    } catch (e) {
      doc.text("Items no disponibles");
    }

    doc.moveDown();
    doc.text("Gracias por tu compra 🚀");

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🔥 POS PRO SERVER RUNNING ON PORT ${PORT}`);
});