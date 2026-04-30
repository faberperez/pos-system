

import express from 'express';
// 1. Eliminamos 'getReportDetails' del import
import { getReport, getPdfReport } from '../controllers/reportController.js';

const router = express.Router();

// 2. Esta ruta ahora devuelve TODO (Resumen + Detalle)
router.get('/', getReport);

// 3. Eliminamos la ruta '/details' porque ya no existe
// router.get('/details', getReportDetails); ❌ BORRAR ESTA LÍNEA

// 4. Ruta para el PDF
router.get('/pdf', getPdfReport);

export default router;

