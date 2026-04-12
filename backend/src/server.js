require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// TWILIO
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simulación de base de datos (ajusta a tu DB real)
let sales = [];
let currentId = 1;

// =========================
// CREAR VENTA
// =========================
app.post('/sales', async (req, res) => {
  try {
    const { clienteTelefono, items, total } = req.body;

    const sale = {
      id: currentId++,
      clienteTelefono,
      items,
      total,
      date: new Date()
    };

    sales.push(sale);

    // Enviar WhatsApp automáticamente
    if (clienteTelefono) {
      await enviarWhatsApp(clienteTelefono, sale.id);
    }

    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando venta' });
  }
});

// =========================
// GENERAR PDF
// =========================
app.get('/sales/:id/pdf', (req, res) => {
  const sale = sales.find(s => s.id == req.params.id);

  if (!sale) {
    return res.status(404).send('Venta no encontrada');
  }

  const doc = new PDFDocument();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=factura-${sale.id}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text('Factura POS', { align: 'center' });
  doc.moveDown();

  doc.text(`ID: ${sale.id}`);
  doc.text(`Fecha: ${sale.date}`);
  doc.moveDown();

  doc.text('Productos:');
  sale.items.forEach(item => {
    doc.text(`- ${item.nombre} x${item.cantidad} = $${item.precio}`);
  });

  doc.moveDown();
  doc.text(`Total: $${sale.total}`);

  doc.end();
});

// =========================
// FUNCIÓN TWILIO
// =========================
async function enviarWhatsApp(numero, saleId) {
  const pdfUrl = `https://pos-backend-73yp.onrender.com/sales/${saleId}/pdf`;

  try {
    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${numero}`,
      body: `🧾 Tu factura está lista:\n${pdfUrl}`
    });

    console.log('✅ WhatsApp enviado');
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error.message);
  }
}

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
