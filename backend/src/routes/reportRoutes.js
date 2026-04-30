import express from 'express';
import { getReport, getReportDetails, getPdfReport } from '../controllers/reportController.js';

const router = express.Router();

// ✅ RESUMEN
router.get('/', getReport);

// ✅ DETALLE (ANTES era /books ❌)
router.get('/details', getReportDetails);

// ✅ PDF
router.get('/pdf', getPdfReport);

export default router;