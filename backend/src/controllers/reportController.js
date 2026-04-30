import pool from '../config/db.js';
import PDFDocument from 'pdfkit';

const getFilterByType = (type) => {
  const filters = {
    'daily': "WHERE DATE(fecha_hora) = CURRENT_DATE",
    'monthly': "WHERE DATE_TRUNC('month', fecha_hora) = DATE_TRUNC('month', CURRENT_DATE)",
    'yearly': "WHERE DATE_TRUNC('year', fecha_hora) = DATE_TRUNC('year', CURRENT_DATE)"
  };
  return filters[type] || filters['daily'];
};

export const getReport = async (req, res) => {
  // 🔥 ESTE LOG ES PARA VERIFICAR QUE ESTAMOS EN EL ARCHIVO CORRECTO
  console.log("----------------------------------------------------");
  console.log("✅ EL SERVIDOR ESTÁ USANDO EL NUEVO REPORTE");
  console.log("----------------------------------------------------");

  try {
    const type = req.query.type || 'daily';
    const filter = getFilterByType(type);

    const [salesResult, statsResult] = await Promise.all([
      pool.query(`
        SELECT id, total, TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI') as date 
        FROM sales 
        ${filter} 
        ORDER BY fecha_hora DESC
      `),
      pool.query(`
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total),0) as total_dinero 
        FROM sales 
        ${filter}
      `)
    ]);

    const finalResponse = {
      sales: salesResult.rows,
      total_ventas: statsResult.rows[0].total_ventas,
      total_dinero: statsResult.rows[0].total_dinero
    };

    console.log("📦 Datos enviados:", finalResponse);
    res.json(finalResponse);

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getPdfReport = async (req, res) => {
  try {
    const type = req.query.type || 'daily';
    const filter = getFilterByType(type);

    const result = await pool.query(`SELECT id, total, fecha_hora FROM sales ${filter} ORDER BY fecha_hora DESC`);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${type}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`Reporte ${type.toUpperCase()}`, { align: 'center' });
    doc.moveDown();

    result.rows.forEach((sale) => {
      doc.fontSize(12).text(`Factura #${sale.id} | ${new Date(sale.fecha_hora).toLocaleString()} | $${sale.total}`);
    });
    doc.end();
  } catch (error) {
    res.status(500).send("Error");
  }
};