import pool from '../config/db.js';
import PDFDocument from 'pdfkit';

// 🛠️ Función auxiliar para evitar repetir código (DRY)
const getFilterByType = (type) => {
  const filters = {
    'daily': "WHERE DATE(fecha_hora) = CURRENT_DATE",
    'monthly': "WHERE DATE_TRUNC('month', fecha_hora) = DATE_TRUNC('month', CURRENT_DATE)",
    'yearly': "WHERE DATE_TRUNC('year', fecha_hora) = DATE_TRUNC('year', CURRENT_DATE)"
  };
  // Retorna el filtro correspondiente o el diario por defecto si el tipo es inválido
  return filters[type] || filters['daily'];
};

// 🔥 RESUMEN (Total de ventas y dinero)
export const getReport = async (req, res) => {
  try {
    const type = req.query.type || 'daily';
    const filter = getFilterByType(type);

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total),0) as total_dinero
      FROM sales
      ${filter}
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ ERROR getReport:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔥 DETALLE (Lista de ventas)
export const getReportDetails = async (req, res) => {
  try {
    const type = req.query.type || 'daily';
    const filter = getFilterByType(type);

    const result = await pool.query(`
      SELECT 
        id,
        total,
        TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI') as fecha
      FROM sales
      ${filter}
      ORDER BY fecha_hora DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR getReportDetails:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔥 PDF (Generación del reporte)
export const getPdfReport = async (req, res) => {
  try {
    const type = req.query.type || 'daily';
    const filter = getFilterByType(type);

    const result = await pool.query(`
      SELECT id, total, fecha_hora
      FROM sales
      ${filter}
      ORDER BY fecha_hora DESC
    `);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${type}.pdf`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(18).text(`Reporte ${type.toUpperCase()}`, { align: 'center' });
    doc.moveDown();

    // Contenido
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