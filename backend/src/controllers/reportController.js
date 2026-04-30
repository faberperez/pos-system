import pool from '../config/db.js';
import PDFDocument from 'pdfkit';

// 🔥 RESUMEN
export const getReport = async (req, res) => {
  try {
    const type = req.query.type || 'daily';

    console.log("📊 Tipo reporte:", type);

    let filter = '';

    if (type === 'daily') {
      filter = "WHERE DATE(fecha_hora) = CURRENT_DATE";
    } else if (type === 'monthly') {
      filter = "WHERE DATE_TRUNC('month', fecha_hora) = DATE_TRUNC('month', CURRENT_DATE)";
    } else if (type === 'yearly') {
      filter = "WHERE DATE_TRUNC('year', fecha_hora) = DATE_TRUNC('year', CURRENT_DATE)";
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total),0) as total_dinero
      FROM sales
      ${filter}
    `);

    console.log("✅ Resumen:", result.rows[0]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error("❌ ERROR getReport:", error);
    res.status(500).json({ error: error.message });
  }
};


// 🔥 DETALLE (ANTES getBooks ❌)
export const getReportDetails = async (req, res) => {
  try {
    const type = req.query.type || 'daily';

    console.log("📦 Tipo detalle:", type);

    let filter = '';

    if (type === 'daily') {
      filter = "WHERE DATE(fecha_hora) = CURRENT_DATE";
    } else if (type === 'monthly') {
      filter = "WHERE DATE_TRUNC('month', fecha_hora) = DATE_TRUNC('month', CURRENT_DATE)";
    } else if (type === 'yearly') {
      filter = "WHERE DATE_TRUNC('year', fecha_hora) = DATE_TRUNC('year', CURRENT_DATE)";
    }

    const result = await pool.query(`
      SELECT 
        id,
        total,
        TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI') as fecha
      FROM sales
      ${filter}
      ORDER BY fecha_hora DESC
    `);

    console.log("✅ Detalles:", result.rows.length);

    res.json(result.rows);

  } catch (error) {
    console.error("❌ ERROR getReportDetails:", error);
    res.status(500).json({ error: error.message });
  }
};


// 🔥 PDF
export const getPdfReport = async (req, res) => {
  try {
    const type = req.query.type || 'daily';

    console.log("📄 Generando PDF:", type);

    let filter = '';

    if (type === 'daily') {
      filter = "WHERE DATE(fecha_hora) = CURRENT_DATE";
    } else if (type === 'monthly') {
      filter = "WHERE DATE_TRUNC('month', fecha_hora) = DATE_TRUNC('month', CURRENT_DATE)";
    } else if (type === 'yearly') {
      filter = "WHERE DATE_TRUNC('year', fecha_hora) = DATE_TRUNC('year', CURRENT_DATE)";
    }

    const result = await pool.query(`
      SELECT id, total, fecha_hora
      FROM sales
      ${filter}
      ORDER BY fecha_hora DESC
    `);

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${type}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).text(`Reporte ${type.toUpperCase()}`, { align: 'center' });
    doc.moveDown();

    result.rows.forEach((sale) => {
      doc.fontSize(12).text(
        `Factura #${sale.id} | ${new Date(sale.fecha_hora).toLocaleString()} | $${sale.total}`
      );
    });

    doc.end();

  } catch (error) {
    console.error("❌ ERROR PDF:", error);
    res.status(500).send("Error generando PDF");
  }
};